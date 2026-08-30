import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseViasnaCsv, validateViasnaUrl } from './adapters/viasna.mjs';
import { detectObservationAnomalies } from './lib/anomaly.mjs';
import { prepareViasnaSnapshot } from './lib/viasna-snapshot-preparer.mjs';

const repoRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const MAX_SOURCE_BYTES=8*1024*1024;

function inside(parent,child){const rel=relative(parent,child);return rel===''||(!rel.startsWith('..'+sep)&&rel!=='..'&&!isAbsolute(rel));}
function sha256(data){return createHash('sha256').update(data).digest('hex');}
function envInt(name,fallback,{min=0,max=Number.MAX_SAFE_INTEGER}={}){const raw=process.env[name];if(raw==null||raw==='')return fallback;const value=Number.parseInt(raw,10);if(!Number.isInteger(value)||value<min||value>max)throw new Error(`${name}_INVALID`);return value;}
function envOptionalInt(name){const raw=process.env[name];if(raw==null||raw==='')return null;const value=Number.parseInt(raw,10);if(!Number.isInteger(value)||value<0)throw new Error(`${name}_INVALID`);return value;}
function envRatio(name,fallback){const raw=process.env[name];if(raw==null||raw==='')return fallback;const value=Number(raw);if(!Number.isFinite(value)||value<0||value>1)throw new Error(`${name}_INVALID`);return value;}

const sourceInput=process.env.VIASNA_SOURCE_FILE;
const importRootInput=process.env.CHRC_VIASNA_IMPORT_ROOT;
if(!sourceInput)throw new Error('VIASNA_SOURCE_FILE_NOT_CONFIGURED');
if(!importRootInput)throw new Error('CHRC_VIASNA_IMPORT_ROOT_NOT_CONFIGURED');

const repo=await realpath(repoRoot);
const source=await realpath(resolve(sourceInput));
const sourceInfo=await stat(source);
if(!sourceInfo.isFile())throw new Error('VIASNA_SOURCE_FILE_NOT_REGULAR_FILE');
if(sourceInfo.size<=0)throw new Error('VIASNA_SOURCE_FILE_EMPTY');
if(sourceInfo.size>MAX_SOURCE_BYTES)throw new Error('VIASNA_SOURCE_FILE_TOO_LARGE');
if(process.env.CHRC_TEST_MODE!=='1'&&inside(repo,source))throw new Error('REAL_VIASNA_SOURCE_FILE_INSIDE_PUBLIC_REPO');

const importRoot=resolve(importRootInput);
if(process.env.CHRC_TEST_MODE!=='1'&&inside(repo,importRoot))throw new Error('VIASNA_IMPORT_ROOT_INSIDE_PUBLIC_REPO');
await mkdir(importRoot,{recursive:true,mode:0o700});
const stagingRoot=join(importRoot,'staging');
const preparedRoot=join(importRoot,'prepared');
const receiptsRoot=join(importRoot,'receipts');
await Promise.all([mkdir(stagingRoot,{recursive:true,mode:0o700}),mkdir(preparedRoot,{recursive:true,mode:0o700}),mkdir(receiptsRoot,{recursive:true,mode:0o700})]);

const sourcePageUrl=validateViasnaUrl(process.env.VIASNA_SOURCE_PAGE_URL||'https://prisoners.spring96.org/ru/list').href;
const locale=process.env.VIASNA_SOURCE_LOCALE||'ru';
const minRows=envInt('VIASNA_EXPECTED_MIN_ROWS',5000,{min:1,max:50000});
const maxRows=envInt('VIASNA_EXPECTED_MAX_ROWS',15000,{min:minRows,max:50000});
const minCoverage=envRatio('VIASNA_MIN_PARSER_COVERAGE',0.75);
const maxEmptyNameRatio=envRatio('VIASNA_MAX_EMPTY_NAME_RATIO',0.01);
const maxQuarantineRatio=envRatio('VIASNA_MAX_QUARANTINE_RATIO',0.20);
const expectedStatusCounts={active:envOptionalInt('VIASNA_EXPECTED_ACTIVE'),former:envOptionalInt('VIASNA_EXPECTED_FORMER'),np:envOptionalInt('VIASNA_EXPECTED_NP')};
const expectedReviewFindings=envOptionalInt('VIASNA_EXPECTED_REVIEW_FINDINGS');
const asOf=process.env.CHRC_AS_OF||new Date().toISOString();

const raw=await readFile(source);
const sourceSha256=sha256(raw);
const expectedSha=String(process.env.VIASNA_EXPECTED_SOURCE_SHA256||'').trim().toLowerCase();
if(expectedSha&&(!/^[a-f0-9]{64}$/.test(expectedSha)||expectedSha!==sourceSha256))throw new Error(`VIASNA_SOURCE_SHA256_MISMATCH:${expectedSha}:${sourceSha256}`);
const text=raw.toString('utf8');
if(/<html[\s>]/i.test(text.slice(0,4096)))throw new Error('VIASNA_SOURCE_FILE_LOOKS_LIKE_HTML');
const parsed=parseViasnaCsv(text,{sourceUrl:sourcePageUrl,fetchedAt:asOf,observedAt:asOf,locale});
if(parsed.observations.length<minRows)throw new Error(`VIASNA_IMPORT_ROW_COUNT_TOO_LOW:${parsed.observations.length}:${minRows}`);
if(parsed.observations.length>maxRows)throw new Error(`VIASNA_IMPORT_ROW_COUNT_TOO_HIGH:${parsed.observations.length}:${maxRows}`);
if(parsed.parser_coverage<minCoverage)throw new Error(`VIASNA_IMPORT_PARSER_COVERAGE_TOO_LOW:${parsed.parser_coverage}:${minCoverage}`);
const columnMismatchCount=parsed.diagnostics.filter(x=>x.code==='CSV_COLUMN_COUNT_MISMATCH').length;
if(columnMismatchCount)throw new Error(`VIASNA_IMPORT_COLUMN_MISMATCH:${columnMismatchCount}`);
const emptyNameCount=parsed.observations.filter(x=>!String(x.reported_name||'').trim()).length;
const emptyNameRatio=parsed.observations.length?emptyNameCount/parsed.observations.length:1;
if(emptyNameRatio>maxEmptyNameRatio)throw new Error(`VIASNA_IMPORT_EMPTY_NAME_RATIO_TOO_HIGH:${emptyNameRatio}:${maxEmptyNameRatio}`);

const sourceStatusCounts={active:0,former:0,np:0,other:0};
for(const observation of parsed.observations){const code=observation.source_status_claim?.source_status_code;if(code&&Object.hasOwn(sourceStatusCounts,code))sourceStatusCounts[code]++;else sourceStatusCounts.other++;}
for(const code of ['active','former','np']){const expected=expectedStatusCounts[code];if(expected!==null&&sourceStatusCounts[code]!==expected)throw new Error(`VIASNA_SOURCE_STATUS_COUNT_MISMATCH:${code}:${sourceStatusCounts[code]}:${expected}`);}
if(sourceStatusCounts.other>0&&Object.values(expectedStatusCounts).some(value=>value!==null))throw new Error(`VIASNA_SOURCE_STATUS_UNKNOWN_ROWS:${sourceStatusCounts.other}`);

const anomalies=detectObservationAnomalies(parsed.observations,{asOf});
const reviewFindings=anomalies.filter(item=>item.severity==='REVIEW');
const reviewCodes=Object.fromEntries([...new Set(reviewFindings.map(item=>item.code))].sort().map(code=>[code,reviewFindings.filter(item=>item.code===code).length]));
if(expectedReviewFindings!==null&&reviewFindings.length!==expectedReviewFindings)throw new Error(`VIASNA_REVIEW_FINDING_COUNT_MISMATCH:${reviewFindings.length}:${expectedReviewFindings}`);

const publicManifestPath=join(repoRoot,'data','public','current','manifest.json');
const publicManifestBefore=await readFile(publicManifestPath);
const stage=spawnSync(process.execPath,[join(repoRoot,'scripts','stage-viasna-file.mjs')],{
  encoding:'utf8',
  env:{...process.env,VIASNA_SOURCE_FILE:source,VIASNA_SOURCE_PAGE_URL:sourcePageUrl,VIASNA_SOURCE_LOCALE:locale,CHRC_PRIVATE_REVIEW_DIR:stagingRoot}
});
if(stage.status!==0)throw new Error(`VIASNA_STAGE_FAILED:${(stage.stderr||stage.stdout||'').trim()}`);
const stageRunId=stage.stdout.match(/run=([^\s]+)/)?.[1]||null;
if(!stageRunId)throw new Error('VIASNA_STAGE_RUN_ID_MISSING');

const prepared=await prepareViasnaSnapshot({sourceFile:source,outputRoot:preparedRoot,currentPublicDir:join(repoRoot,'data','public','current'),sourcePageUrl,locale,asOf});
const quarantineRatio=parsed.observations.length?prepared.quarantined/parsed.observations.length:1;
if(quarantineRatio>maxQuarantineRatio)throw new Error(`VIASNA_IMPORT_QUARANTINE_RATIO_TOO_HIGH:${quarantineRatio}:${maxQuarantineRatio}`);
if(prepared.reviewRequired!==reviewFindings.length)throw new Error(`VIASNA_REVIEW_FINDING_PIPELINE_MISMATCH:${prepared.reviewRequired}:${reviewFindings.length}`);

const publicManifestAfter=await readFile(publicManifestPath);
if(!publicManifestBefore.equals(publicManifestAfter))throw new Error('VIASNA_IMPORT_PUBLIC_MANIFEST_MUTATED');
const candidateManifest=await readFile(join(prepared.snapshotDir,'manifest.json'));
const candidateManifestSha256=sha256(candidateManifest);
const receiptId=`viasna-import-${asOf.replace(/[-:.]/g,'')}-${sourceSha256.slice(0,12)}`;
const receipt={
  state:'PREPARED_FOR_PRIVATE_REVIEW_NOT_PUBLISHED',source_id:'src-viasna',source_page_url:sourcePageUrl,source_sha256:sourceSha256,source_bytes:raw.byteLength,source_locale:locale,imported_at:asOf,
  parsed_rows:parsed.observations.length,source_status_counts:sourceStatusCounts,parser_coverage:parsed.parser_coverage,diagnostics_count:parsed.diagnostics.length,empty_name_count:emptyNameCount,
  review_required_findings:reviewFindings.length,review_required_codes:reviewCodes,
  stage_run_id:stageRunId,prepared_run_id:prepared.runId,candidate_snapshot_id:prepared.snapshotId,candidate_snapshot_manifest_sha256:candidateManifestSha256,
  people:prepared.people,prisons:prepared.prisons,quarantined_rows:prepared.quarantined,quarantine_ratio:quarantineRatio,
  public_repo_mutated:false,production_published:false,next_gate:'PRIVATE_EDITORIAL_REVIEW_AND_EXPLICIT_SNAPSHOT_PROMOTION'
};
await writeFile(join(receiptsRoot,`${receiptId}.json`),JSON.stringify(receipt,null,2)+'\n',{encoding:'utf8',mode:0o600,flag:'wx'});

console.log(`VIASNA_OFFICIAL_IMPORT=PASS state=${receipt.state} rows=${receipt.parsed_rows} active=${sourceStatusCounts.active} former=${sourceStatusCounts.former} np=${sourceStatusCounts.np} people=${receipt.people} prisons=${receipt.prisons} quarantined=${receipt.quarantined_rows} review=${receipt.review_required_findings} source_sha256=${sourceSha256}`);
console.log(`VIASNA_IMPORT_RECEIPT=${join(receiptsRoot,`${receiptId}.json`)}`);
console.log(`VIASNA_CANDIDATE_SNAPSHOT=${prepared.snapshotDir}`);
