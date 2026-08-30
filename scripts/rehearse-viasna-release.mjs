import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const defaultProfile=join(repoRoot,'config','viasna-release-profile-2026-08-30.json');
const publicManifestPath=join(repoRoot,'data','public','current','manifest.json');

function inside(parent,child){const rel=relative(parent,child);return rel===''||(!rel.startsWith('..'+sep)&&rel!=='..'&&!isAbsolute(rel));}
function sha256(data){return createHash('sha256').update(data).digest('hex');}
function assertInt(name,value){if(!Number.isInteger(value)||value<0)throw new Error(`${name}_INVALID`);return value;}
function assertSha(name,value){if(!/^[a-f0-9]{64}$/.test(String(value||'')))throw new Error(`${name}_INVALID`);return String(value);}
function runScript(script,env,label){const result=spawnSync(process.execPath,[join(repoRoot,'scripts',script)],{cwd:repoRoot,env,encoding:'utf8',maxBuffer:64*1024*1024});if(result.status!==0)throw new Error(`${label}_FAILED:${(result.stderr||result.stdout||'').slice(-16000)}`);return result.stdout;}
function capture(text,pattern,label){const value=text.match(pattern)?.[1]?.trim();if(!value)throw new Error(`${label}_MISSING`);return value;}
function arg(name){const index=process.argv.indexOf(name);if(index<0)return null;const value=process.argv[index+1];if(!value||value.startsWith('--'))throw new Error(`VIASNA_REHEARSAL_ARGUMENT_VALUE_MISSING:${name}`);return value;}
async function readJson(path){return JSON.parse(await readFile(path,'utf8'));}

if(process.argv.includes('--help')){
  console.log('Usage: node scripts/rehearse-viasna-release.mjs --source <external.csv> --output <external-private-dir> [--profile <profile.json>] [--as-of <ISO-8601>]');
  console.log('This command audits and fully builds a private PUBLISHED preview. It never promotes or deploys the real database.');
  process.exit(0);
}

const testMode=process.env.CHRC_TEST_MODE==='1';
const sourceInput=arg('--source')||process.env.VIASNA_SOURCE_FILE;
const rehearsalRootInput=arg('--output')||process.env.CHRC_VIASNA_REHEARSAL_DIR;
if(!sourceInput)throw new Error('VIASNA_SOURCE_FILE_NOT_CONFIGURED');
if(!rehearsalRootInput)throw new Error('CHRC_VIASNA_REHEARSAL_DIR_NOT_CONFIGURED');
if(process.env.CHRC_VIASNA_IDENTITY_RESOLUTION_FILE)throw new Error('VIASNA_BASELINE_REHEARSAL_REQUIRES_NO_IDENTITY_RESOLUTION');

const repo=await realpath(repoRoot);
const source=await realpath(resolve(sourceInput));
const sourceInfo=await stat(source);if(!sourceInfo.isFile())throw new Error('VIASNA_REHEARSAL_SOURCE_NOT_REGULAR_FILE');
const rehearsalRoot=resolve(rehearsalRootInput);
if(!testMode&&inside(repo,source))throw new Error('REAL_VIASNA_SOURCE_FILE_INSIDE_PUBLIC_REPO');
if(!testMode&&inside(repo,rehearsalRoot))throw new Error('VIASNA_REHEARSAL_OUTPUT_INSIDE_PUBLIC_REPO');
await mkdir(rehearsalRoot,{recursive:true,mode:0o700});

const profilePath=resolve(arg('--profile')||process.env.CHRC_VIASNA_RELEASE_PROFILE||defaultProfile);
const profile=await readJson(profilePath);
if(profile.source_id!=='src-viasna')throw new Error('VIASNA_REHEARSAL_PROFILE_SOURCE_INVALID');
const expectedSourceSha=assertSha('VIASNA_REHEARSAL_PROFILE_SOURCE_SHA256',profile.source_sha256);
for(const [name,value] of [
  ['PARSED_ROWS',profile.parsed_rows],['SOURCE_BYTES',profile.source_bytes],['ACTIVE',profile.source_status_counts?.active],['FORMER',profile.source_status_counts?.former],['NP',profile.source_status_counts?.np],
  ['REVIEW_FINDINGS',profile.review_required_findings],['IDENTITY_COMPONENTS',profile.identity_collision?.components],['IDENTITY_ROWS',profile.identity_collision?.rows],
  ['CANDIDATE_PEOPLE',profile.candidate_without_identity_resolution?.people],['CANDIDATE_PRISONS',profile.candidate_without_identity_resolution?.prisons],['CANDIDATE_QUARANTINE',profile.candidate_without_identity_resolution?.quarantined_rows],
  ['CANDIDATE_ACTIVE',profile.candidate_without_identity_resolution?.active],['CANDIDATE_FORMER',profile.candidate_without_identity_resolution?.former],['CANDIDATE_NP',profile.candidate_without_identity_resolution?.np]
])assertInt(`VIASNA_REHEARSAL_PROFILE_${name}`,value);
if(profile.identity_collision?.baseline_policy!=='QUARANTINE_UNRESOLVED_NO_AUTOMATIC_DECISIONS')throw new Error('VIASNA_REHEARSAL_PROFILE_IDENTITY_POLICY_INVALID');
if(profile.publication_authorized!==false)throw new Error('VIASNA_REHEARSAL_PROFILE_MUST_NOT_AUTHORIZE_PUBLICATION');

const sourceRaw=await readFile(source);const actualSourceSha=sha256(sourceRaw);
if(actualSourceSha!==expectedSourceSha)throw new Error(`VIASNA_REHEARSAL_SOURCE_SHA256_MISMATCH:${actualSourceSha}:${expectedSourceSha}`);
if(sourceRaw.byteLength!==profile.source_bytes)throw new Error(`VIASNA_REHEARSAL_SOURCE_BYTES_MISMATCH:${sourceRaw.byteLength}:${profile.source_bytes}`);
const asOf=arg('--as-of')||process.env.CHRC_AS_OF||new Date().toISOString();
const parsedAsOf=new Date(asOf);if(Number.isNaN(parsedAsOf.getTime()))throw new Error('VIASNA_REHEARSAL_AS_OF_INVALID');
const normalizedAsOf=parsedAsOf.toISOString();
const runId=`viasna-release-rehearsal-${normalizedAsOf.replace(/[-:.]/g,'')}-${actualSourceSha.slice(0,12)}`;
const runDir=join(rehearsalRoot,runId);await mkdir(runDir,{recursive:false,mode:0o700});

const commonEnv={...process.env,VIASNA_SOURCE_FILE:source,VIASNA_SOURCE_PAGE_URL:profile.source_page_url||'https://prisoners.spring96.org/ru/list',VIASNA_SOURCE_LOCALE:profile.source_locale||'ru',VIASNA_EXPECTED_SOURCE_SHA256:actualSourceSha,CHRC_AS_OF:normalizedAsOf};
delete commonEnv.CHRC_VIASNA_PROMOTION_AUTHORIZED;
delete commonEnv.CHRC_VIASNA_IDENTITY_RESOLUTION_FILE;
const publicBefore=sha256(await readFile(publicManifestPath));

const identityRoot=join(runDir,'identity-review');
const identityStdout=runScript('export-viasna-identity-review-packet.mjs',{
  ...commonEnv,CHRC_VIASNA_IDENTITY_REVIEW_DIR:identityRoot,
  VIASNA_EXPECTED_IDENTITY_COMPONENTS:String(profile.identity_collision.components),VIASNA_EXPECTED_IDENTITY_COLLISION_ROWS:String(profile.identity_collision.rows)
},'VIASNA_REHEARSAL_IDENTITY_PACKET');
const identityRunDir=capture(identityStdout,/VIASNA_IDENTITY_REVIEW_RUN_DIR=(.+)/,'VIASNA_REHEARSAL_IDENTITY_RUN_DIR');
const identityReceiptPath=join(identityRunDir,'IDENTITY_REVIEW_RECEIPT.json');
const identityReceiptRaw=await readFile(identityReceiptPath);const identityReceipt=JSON.parse(identityReceiptRaw.toString('utf8'));
if(identityReceipt.automatic_decisions!==0||identityReceipt.components_total!==profile.identity_collision.components||identityReceipt.collision_rows!==profile.identity_collision.rows)throw new Error('VIASNA_REHEARSAL_IDENTITY_PACKET_ATTESTATION_FAIL');

const importRoot=join(runDir,'official-import');
const importStdout=runScript('import-viasna-official-file.mjs',{
  ...commonEnv,CHRC_VIASNA_IMPORT_ROOT:importRoot,
  VIASNA_EXPECTED_MIN_ROWS:String(profile.parsed_rows),VIASNA_EXPECTED_MAX_ROWS:String(profile.parsed_rows),
  VIASNA_EXPECTED_ACTIVE:String(profile.source_status_counts.active),VIASNA_EXPECTED_FORMER:String(profile.source_status_counts.former),VIASNA_EXPECTED_NP:String(profile.source_status_counts.np),
  VIASNA_EXPECTED_REVIEW_FINDINGS:String(profile.review_required_findings),VIASNA_EXPECTED_QUARANTINED:String(profile.candidate_without_identity_resolution.quarantined_rows),
  VIASNA_EXPECTED_PEOPLE:String(profile.candidate_without_identity_resolution.people),VIASNA_EXPECTED_PRISONS:String(profile.candidate_without_identity_resolution.prisons),
  VIASNA_EXPECTED_IDENTITY_RESOLVED_COMPONENTS:'0'
},'VIASNA_REHEARSAL_OFFICIAL_IMPORT');
const importReceiptPath=capture(importStdout,/VIASNA_IMPORT_RECEIPT=(.+)/,'VIASNA_REHEARSAL_IMPORT_RECEIPT');
const candidateDir=capture(importStdout,/VIASNA_CANDIDATE_SNAPSHOT=(.+)/,'VIASNA_REHEARSAL_CANDIDATE_DIR');
const importReceiptRaw=await readFile(importReceiptPath);const importReceipt=JSON.parse(importReceiptRaw.toString('utf8'));
if(importReceipt.people!==profile.candidate_without_identity_resolution.people||importReceipt.quarantined_rows!==profile.candidate_without_identity_resolution.quarantined_rows||importReceipt.production_published!==false)throw new Error('VIASNA_REHEARSAL_IMPORT_ATTESTATION_FAIL');

const candidateManifestRaw=await readFile(join(candidateDir,'manifest.json'));const candidateManifestSha=sha256(candidateManifestRaw);
const candidateAuditPath=join(runDir,'candidate-audit.json');
const candidateAuditStdout=runScript('audit-viasna-candidate.mjs',{
  ...commonEnv,CHRC_VIASNA_CANDIDATE_DIR:candidateDir,CHRC_VIASNA_AUDIT_RECEIPT_FILE:candidateAuditPath,
  VIASNA_EXPECTED_PEOPLE:String(profile.candidate_without_identity_resolution.people),VIASNA_EXPECTED_PRISONS:String(profile.candidate_without_identity_resolution.prisons),
  VIASNA_EXPECTED_CANDIDATE_ACTIVE:String(profile.candidate_without_identity_resolution.active),VIASNA_EXPECTED_CANDIDATE_FORMER:String(profile.candidate_without_identity_resolution.former),VIASNA_EXPECTED_CANDIDATE_NP:String(profile.candidate_without_identity_resolution.np),
  CHRC_CANDIDATE_SITEMAP_URL_RESERVE:String(profile.candidate_audit_budgets?.sitemap_url_reserve??5000),CHRC_CANDIDATE_MAX_CORE_URLS:String(profile.candidate_audit_budgets?.max_core_urls??45000),
  CHRC_CANDIDATE_MAX_SEARCH_INDEX_BYTES_PER_LANG:String(profile.candidate_audit_budgets?.max_search_index_bytes_per_lang??16777216)
},'VIASNA_REHEARSAL_CANDIDATE_AUDIT');
if(!/REAL_VIASNA_CANDIDATE_AUDIT=PASS/.test(candidateAuditStdout))throw new Error('VIASNA_REHEARSAL_CANDIDATE_AUDIT_PASS_MISSING');
const candidateAuditRaw=await readFile(candidateAuditPath);const candidateAudit=JSON.parse(candidateAuditRaw.toString('utf8'));const candidateAuditSha=sha256(candidateAuditRaw);
if(candidateAudit.next_gate!=='FULL_CANDIDATE_BUILD_AUDIT'||candidateAudit.production_published!==false)throw new Error('VIASNA_REHEARSAL_CANDIDATE_AUDIT_STATE_INVALID');

const buildAuditPath=join(runDir,'candidate-build-audit.json');
const buildAuditStdout=runScript('audit-viasna-candidate-build.mjs',{
  ...commonEnv,CHRC_VIASNA_CANDIDATE_DIR:candidateDir,CHRC_VIASNA_AUDIT_RECEIPT_FILE:candidateAuditPath,CHRC_VIASNA_BUILD_AUDIT_RECEIPT_FILE:buildAuditPath,
  CHRC_EXPECTED_VIASNA_CANDIDATE_MANIFEST_SHA256:candidateManifestSha,CHRC_EXPECTED_VIASNA_AUDIT_RECEIPT_SHA256:candidateAuditSha,
  CHRC_CANDIDATE_MAX_SITE_BYTES:String(profile.full_build_budgets?.max_site_bytes??900000000),CHRC_CANDIDATE_MAX_BUILD_SECONDS:String(profile.full_build_budgets?.max_build_seconds??480),
  CHRC_CANDIDATE_MAX_TOTAL_AUDIT_SECONDS:String(profile.full_build_budgets?.max_total_audit_seconds??600),CHRC_CANDIDATE_MAX_SINGLE_FILE_BYTES:String(profile.full_build_budgets?.max_single_file_bytes??25000000)
},'VIASNA_REHEARSAL_FULL_BUILD_AUDIT');
if(!/REAL_VIASNA_CANDIDATE_BUILD_AUDIT=PASS/.test(buildAuditStdout))throw new Error('VIASNA_REHEARSAL_FULL_BUILD_PASS_MISSING');
const buildAuditRaw=await readFile(buildAuditPath);const buildAudit=JSON.parse(buildAuditRaw.toString('utf8'));const buildAuditSha=sha256(buildAuditRaw);
if(buildAudit.rendered_publication_state!=='PUBLISHED'||buildAudit.preview_removed!==true||buildAudit.workspace_site_restored!==true||buildAudit.production_published!==false)throw new Error('VIASNA_REHEARSAL_FULL_BUILD_STATE_INVALID');

const publicAfter=sha256(await readFile(publicManifestPath));if(publicAfter!==publicBefore)throw new Error('VIASNA_REHEARSAL_PUBLIC_MANIFEST_MUTATED');
const receipt={
  state:'REAL_VIASNA_RELEASE_REHEARSAL_PASS_NOT_PUBLISHED',version:1,profile_id:profile.profile_id,completed_at:new Date().toISOString(),source_sha256:actualSourceSha,source_bytes:sourceRaw.byteLength,
  parsed_rows:profile.parsed_rows,source_status_counts:profile.source_status_counts,identity_components:profile.identity_collision.components,identity_collision_rows:profile.identity_collision.rows,
  identity_automatic_decisions:0,identity_review_receipt_sha256:sha256(identityReceiptRaw),import_receipt_sha256:sha256(importReceiptRaw),candidate_snapshot_id:importReceipt.candidate_snapshot_id,
  candidate_manifest_sha256:candidateManifestSha,candidate_people:profile.candidate_without_identity_resolution.people,candidate_quarantined_rows:profile.candidate_without_identity_resolution.quarantined_rows,
  candidate_audit_receipt_sha256:candidateAuditSha,candidate_build_audit_receipt_sha256:buildAuditSha,build_metrics:{html_files:buildAudit.html_files,total_files:buildAudit.total_files,site_bytes:buildAudit.site_bytes,sitemap_shards:buildAudit.sitemap_shards,sitemap_urls:buildAudit.sitemap_urls,build_duration_ms:buildAudit.build_duration_ms,total_duration_ms:buildAudit.total_duration_ms},
  identity_policy:profile.identity_collision.baseline_policy,public_repo_mutated:false,deployment_performed:false,production_published:false,promotion_authorized:false,
  next_gate:'HUMAN_PRIVATE_IDENTITY_REVIEW_OR_OWNER_DECISION_ON_QUARANTINED_SUBSET'
};
const receiptPath=join(runDir,'REAL_RELEASE_REHEARSAL_RECEIPT.json');await writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n',{encoding:'utf8',mode:0o600,flag:'wx'});
console.log(`VIASNA_RELEASE_REHEARSAL=PASS state=${receipt.state} profile=${receipt.profile_id} rows=${receipt.parsed_rows} people=${receipt.candidate_people} quarantined=${receipt.candidate_quarantined_rows} identity_components=${receipt.identity_components} automatic_decisions=0 html=${receipt.build_metrics.html_files} site_bytes=${receipt.build_metrics.site_bytes} published=false deploy=false`);
console.log(`VIASNA_RELEASE_REHEARSAL_RUN_DIR=${runDir}`);
console.log(`VIASNA_RELEASE_REHEARSAL_RECEIPT=${receiptPath}`);
