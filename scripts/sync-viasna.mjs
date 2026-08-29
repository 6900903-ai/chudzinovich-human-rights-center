import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { fetchViasnaText, parseViasnaCsv } from './adapters/viasna.mjs';
import { detectObservationAnomalies, deriveMetrics, shouldBlockPublication } from './lib/anomaly.mjs';
import { resolvePrivateReviewDir } from './lib/private-candidate-sink.mjs';

const exportUrl = process.env.VIASNA_EXPORT_URL;
if (!exportUrl) throw new Error('VIASNA_EXPORT_URL_NOT_CONFIGURED');
const privateRoot = await resolvePrivateReviewDir(process.env.CHRC_PRIVATE_REVIEW_DIR);
const fetched = await fetchViasnaText(exportUrl,{expectedKind:'csv'});
const parsed = parseViasnaCsv(fetched.text,{sourceUrl:fetched.source_url,fetchedAt:fetched.fetched_at,observedAt:fetched.fetched_at,locale:process.env.VIASNA_SOURCE_LOCALE || 'ru'});
const anomalies = detectObservationAnomalies(parsed.observations,{asOf:new Date().toISOString()});
const metrics = deriveMetrics(parsed.observations);
const digest = createHash('sha256').update(fetched.text).digest('hex');
const runId = `viasna-${fetched.fetched_at.replace(/[-:.]/g,'').replace('Z','Z')}-${digest.slice(0,12)}`;
const runDir = join(privateRoot,'viasna-sync',runId);
await mkdir(runDir,{recursive:false,mode:0o700});
const write = (name,value) => writeFile(join(runDir,name),JSON.stringify(value,null,2)+'\n',{encoding:'utf8',mode:0o600,flag:'wx'});
await write('source.json',{
  source_id:'src-viasna',source_url:fetched.source_url,fetched_at:fetched.fetched_at,content_type:fetched.content_type,bytes:fetched.bytes,source_sha256:digest,parser_version:parsed.parser_version
});
await write('observations.json',parsed.observations);
await write('diagnostics.json',parsed.diagnostics);
await write('anomalies.json',anomalies);
await write('metrics.json',metrics);
await write('decision.json',{
  state:shouldBlockPublication(anomalies)?'QUARANTINED':'PRIVATE_REVIEW_REQUIRED',
  public_database_mutated:false,
  political_prisoner_autodesignation:false,
  high_risk_autopublish:false
});
console.log(`VIASNA_SYNC_STAGED=PASS run=${runId} observations=${parsed.observations.length} anomalies=${anomalies.length} state=${shouldBlockPublication(anomalies)?'QUARANTINED':'PRIVATE_REVIEW_REQUIRED'}`);
