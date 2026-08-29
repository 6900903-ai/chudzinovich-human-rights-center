import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseViasnaCsv, validateViasnaUrl, VIASNA_PARSER_VERSION } from './adapters/viasna.mjs';
import { detectObservationAnomalies, deriveMetrics, shouldBlockPublication } from './lib/anomaly.mjs';
import { resolvePrivateReviewDir } from './lib/private-candidate-sink.mjs';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(moduleDir, '..');
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;

function inside(parent, child) {
  const rel = relative(parent, child);
  return rel === '' || (!rel.startsWith('..' + sep) && rel !== '..' && !isAbsolute(rel));
}

async function resolveSourceFile(input) {
  if (!input) throw new Error('VIASNA_SOURCE_FILE_NOT_CONFIGURED');
  const absolute = resolve(input);
  const actual = await realpath(absolute);
  const repo = await realpath(repoRoot);
  if (process.env.CHRC_TEST_MODE !== '1' && inside(repo, actual)) {
    throw new Error('REAL_VIASNA_SOURCE_FILE_INSIDE_PUBLIC_REPO');
  }
  const info = await stat(actual);
  if (!info.isFile()) throw new Error('VIASNA_SOURCE_FILE_NOT_REGULAR_FILE');
  if (info.size <= 0) throw new Error('VIASNA_SOURCE_FILE_EMPTY');
  if (info.size > MAX_SOURCE_BYTES) throw new Error('VIASNA_SOURCE_FILE_TOO_LARGE');
  return { path: actual, bytes: info.size };
}

function sourcePageUrl(input) {
  const raw = input || 'https://prisoners.spring96.org/ru/list';
  return validateViasnaUrl(raw).href;
}

const source = await resolveSourceFile(process.env.VIASNA_SOURCE_FILE);
const privateRoot = await resolvePrivateReviewDir(process.env.CHRC_PRIVATE_REVIEW_DIR);
const sourceUrl = sourcePageUrl(process.env.VIASNA_SOURCE_PAGE_URL);
const locale = process.env.VIASNA_SOURCE_LOCALE || 'ru';
const importedAt = new Date().toISOString();
const raw = await readFile(source.path);
const text = raw.toString('utf8');
if (/<html[\s>]/i.test(text.slice(0,4096))) throw new Error('VIASNA_SOURCE_FILE_LOOKS_LIKE_HTML');

const parsed = parseViasnaCsv(text, {
  sourceUrl,
  fetchedAt: importedAt,
  observedAt: importedAt,
  locale
});
const anomalies = detectObservationAnomalies(parsed.observations,{asOf:importedAt});
const metrics = deriveMetrics(parsed.observations);
const digest = createHash('sha256').update(raw).digest('hex');
const runId = `viasna-file-${importedAt.replace(/[-:.]/g,'')}-${digest.slice(0,12)}`;
const runDir = join(privateRoot,'viasna-sync',runId);
await mkdir(join(privateRoot,'viasna-sync'),{recursive:true,mode:0o700});
await mkdir(runDir,{recursive:false,mode:0o700});

const writeJson = (name,value) => writeFile(
  join(runDir,name),
  JSON.stringify(value,null,2)+'\n',
  {encoding:'utf8',mode:0o600,flag:'wx'}
);
await writeFile(join(runDir,'source.csv'),raw,{mode:0o600,flag:'wx'});
await writeJson('source.json',{
  source_id:'src-viasna',
  source_page_url:sourceUrl,
  acquisition_mode:'MANUAL_FILE_IMPORT',
  imported_at:importedAt,
  original_filename:basename(source.path),
  bytes:source.bytes,
  source_sha256:digest,
  parser_version:VIASNA_PARSER_VERSION,
  source_locale:locale
});
await writeJson('observations.json',parsed.observations);
await writeJson('diagnostics.json',parsed.diagnostics);
await writeJson('anomalies.json',anomalies);
await writeJson('metrics.json',metrics);
await writeJson('decision.json',{
  state:shouldBlockPublication(anomalies)?'QUARANTINED':'PRIVATE_REVIEW_REQUIRED',
  public_database_mutated:false,
  political_prisoner_autodesignation:false,
  high_risk_autopublish:false,
  source_claim_only:true,
  promotion_requires_editorial_review:true
});

console.log(`VIASNA_FILE_STAGED=PASS run=${runId} observations=${parsed.observations.length} anomalies=${anomalies.length} state=${shouldBlockPublication(anomalies)?'QUARANTINED':'PRIVATE_REVIEW_REQUIRED'}`);
