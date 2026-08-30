import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseViasnaCsv } from '../scripts/adapters/viasna.mjs';
import {
  compareSnapshotMetrics,
  deriveMetrics,
  detectObservationAnomalies,
  shouldBlockPublication
} from '../scripts/lib/anomaly.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const csv = await readFile(join(root, 'tests/fixtures/viasna.synthetic.csv'), 'utf8');
const parsed = parseViasnaCsv(csv, { fetchedAt: '2026-08-28T19:00:00Z', observedAt: '2026-08-28T19:00:00Z' });
const anomalies = detectObservationAnomalies(parsed.observations, { asOf: '2026-08-28T23:59:59Z' });

if (!anomalies.some(item => item.code === 'FUTURE_EVENT_DATE_WITHHELD' && item.field === 'detention_date' && item.severity==='REVIEW')) throw new Error('Future event date was not routed to review');
if (shouldBlockPublication(anomalies)) throw new Error('Field-level review finding must not drop the whole person');

const machineCsv=await readFile(join(root,'tests/fixtures/viasna.machine-export.synthetic.csv'),'utf8');
const machine=parseViasnaCsv(machineCsv,{sourceUrl:'https://prisoners.spring96.org/ru/list',locale:'ru',fetchedAt:'2026-08-30T07:00:00Z',observedAt:'2026-08-30T07:00:00Z'});
const machineAnomalies=detectObservationAnomalies(machine.observations,{asOf:'2026-08-30T23:59:59Z'});
if(!machineAnomalies.some(item=>item.code==='SOURCE_DEATH_CLAIM_WITHHELD'&&item.row_number===5&&item.severity==='REVIEW'))throw new Error('Death claim was not routed to review');
if(machineAnomalies.some(item=>item.code==='DUPLICATE_SOURCE_IDENTITY'))throw new Error('Distinct source record IDs must retain distinct source identity keys');
if(shouldBlockPublication(machineAnomalies))throw new Error('Death claim alone must not quarantine entire person');

const futureRelease=structuredClone(machine.observations[1]);
futureRelease.row_number=99;
futureRelease.source_record_id='9999';
futureRelease.source_identity_key='src-viasna-record:9999';
futureRelease.release_date={raw:'2026-12-01',value:'2026-12-01',precision:'day',parse_state:'PARSED'};
const futureReleaseAnomalies=detectObservationAnomalies([futureRelease],{asOf:'2026-08-30T23:59:59Z'});
if(!futureReleaseAnomalies.some(item=>item.code==='FUTURE_EVENT_DATE_WITHHELD'&&item.field==='release_date'&&item.severity==='REVIEW'))throw new Error('Future release date was not withheld');

const malformed=structuredClone(machine.observations[0]);
malformed.row_number=101;
malformed.reported_name='';
malformed.source_record_id='10001';
malformed.source_identity_key='src-viasna-record:10001';
const blocking=detectObservationAnomalies([malformed],{asOf:'2026-08-30T23:59:59Z'});
if(!blocking.some(item=>item.code==='MISSING_REPORTED_NAME'&&item.severity==='HIGH'))throw new Error('Structural person anomaly was not high risk');
if(!shouldBlockPublication(blocking))throw new Error('Structural high-risk anomaly must still block row publication');

const sharedUrlA=structuredClone(machine.observations[0]);
sharedUrlA.row_number=201;
sharedUrlA.source_record_id='20001';
sharedUrlA.source_identity_key='src-viasna-record:20001';
sharedUrlA.source_person_url='https://prisoners.spring96.org/ru/person/shared-identity';
const sharedUrlB=structuredClone(machine.observations[1]);
sharedUrlB.row_number=202;
sharedUrlB.source_record_id='20002';
sharedUrlB.source_identity_key='src-viasna-record:20002';
sharedUrlB.source_person_url='https://prisoners.spring96.org/ru/person/shared-identity';
const sharedUrlAnomalies=detectObservationAnomalies([sharedUrlA,sharedUrlB],{asOf:'2026-08-30T23:59:59Z'});
const sharedUrlFindings=sharedUrlAnomalies.filter(item=>item.code==='SOURCE_PERSON_URL_IDENTITY_COLLISION');
if(sharedUrlFindings.length!==2)throw new Error('All rows sharing one source person URL must be quarantinable');
if(sharedUrlFindings.some(item=>item.severity!=='HIGH'))throw new Error('Shared source person URL collision must be HIGH');
if(!shouldBlockPublication(sharedUrlAnomalies))throw new Error('Shared source person URL collision must fail closed');

const strongA=structuredClone(machine.observations[0]);
strongA.row_number=301;
strongA.source_record_id='30001';
strongA.source_identity_key='src-viasna-record:30001';
strongA.source_person_url='https://prisoners.spring96.org/ru/person/strong-a';
strongA.reported_name='Иван Тестовый';
strongA.normalized_name='иван тестовый';
strongA.birth_date={raw:'1985-04-12',value:'1985-04-12',precision:'day',parse_state:'PARSED'};
const strongB=structuredClone(strongA);
strongB.row_number=302;
strongB.source_record_id='30002';
strongB.source_identity_key='src-viasna-record:30002';
strongB.source_person_url='https://prisoners.spring96.org/ru/person/strong-b';
const strongAnomalies=detectObservationAnomalies([strongA,strongB],{asOf:'2026-08-30T23:59:59Z'});
const strongFindings=strongAnomalies.filter(item=>item.code==='STRONG_PERSON_SIGNATURE_COLLISION');
if(strongFindings.length!==2)throw new Error('All rows sharing a strong person signature must be quarantinable');
if(strongFindings.some(item=>item.severity!=='HIGH'))throw new Error('Strong person signature collision must be HIGH');
if(!shouldBlockPublication(strongAnomalies))throw new Error('Strong person signature collision must fail closed');

const metrics = deriveMetrics(parsed.observations);
if (metrics.total !== 3 || metrics.current_political_prisoner_claims !== 1) throw new Error('Metric derivation failed');

const compare = compareSnapshotMetrics(
  { total: 8696, current_missing_prison_rate: 0.05 },
  { total: 7000, current_missing_prison_rate: 0.40 }
);
if (!compare.some(item => item.code === 'ANOMALOUS_TOTAL_DROP')) throw new Error('Large source drop not detected');
if (!compare.some(item => item.code === 'MISSING_PRISON_RATE_SPIKE')) throw new Error('Prison null spike not detected');

console.log('ANOMALY_TEST=PASS field_review=PASS structural_fail_closed=PASS identity_collision_gate=PASS');
await import('./viasna-identity-review-packet.mjs');
