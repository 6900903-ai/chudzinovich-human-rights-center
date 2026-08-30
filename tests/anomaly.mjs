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

if (!anomalies.some(item => item.code === 'FUTURE_EVENT_DATE' && item.field === 'detention_date')) throw new Error('Future event date was not detected');
if (!shouldBlockPublication(anomalies)) throw new Error('High-risk anomaly must block publication');

const machineCsv=await readFile(join(root,'tests/fixtures/viasna.machine-export.synthetic.csv'),'utf8');
const machine=parseViasnaCsv(machineCsv,{sourceUrl:'https://prisoners.spring96.org/ru/list',locale:'ru',fetchedAt:'2026-08-30T07:00:00Z',observedAt:'2026-08-30T07:00:00Z'});
const machineAnomalies=detectObservationAnomalies(machine.observations,{asOf:'2026-08-30T23:59:59Z'});
if(!machineAnomalies.some(item=>item.code==='SOURCE_DEATH_CLAIM_REQUIRES_REVIEW'&&item.row_number===5))throw new Error('Death claim was not quarantined');
if(machineAnomalies.some(item=>item.code==='DUPLICATE_SOURCE_IDENTITY'))throw new Error('Unique source record IDs must prevent same-name identity collision');

const futureRelease=structuredClone(machine.observations[1]);
futureRelease.row_number=99;
futureRelease.source_record_id='9999';
futureRelease.source_identity_key='src-viasna-record:9999';
futureRelease.release_date={raw:'2026-12-01',value:'2026-12-01',precision:'day',parse_state:'PARSED'};
const futureReleaseAnomalies=detectObservationAnomalies([futureRelease],{asOf:'2026-08-30T23:59:59Z'});
if(!futureReleaseAnomalies.some(item=>item.code==='FUTURE_EVENT_DATE'&&item.field==='release_date'))throw new Error('Future release date was not detected');

const metrics = deriveMetrics(parsed.observations);
if (metrics.total !== 3 || metrics.current_political_prisoner_claims !== 1) throw new Error('Metric derivation failed');

const compare = compareSnapshotMetrics(
  { total: 8696, current_missing_prison_rate: 0.05 },
  { total: 7000, current_missing_prison_rate: 0.40 }
);
if (!compare.some(item => item.code === 'ANOMALOUS_TOTAL_DROP')) throw new Error('Large source drop not detected');
if (!compare.some(item => item.code === 'MISSING_PRISON_RATE_SPIKE')) throw new Error('Prison null spike not detected');

console.log('ANOMALY_TEST=PASS real_export_risk_gates=PASS');
