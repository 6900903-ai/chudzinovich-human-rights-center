import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifySnapshot } from './lib/snapshot.mjs';

const repoRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const REQUIRED_FILES=['news.json','people.json','prisons.json','reports.json'];
const AUTHORIZATION='YES_I_AUTHORIZE_PUBLICATION';

function inside(parent,child){const rel=relative(parent,child);return rel===''||(!rel.startsWith('..'+sep)&&rel!=='..'&&!isAbsolute(rel));}
function sha256(data){return createHash('sha256').update(data).digest('hex');}
function normalizedIso(value){const date=new Date(value);if(Number.isNaN(date.getTime()))throw new Error('VIASNA_PROMOTION_TIME_INVALID');return date.toISOString();}
function snapshotId(createdAt,files){const normalizedCreatedAt=normalizedIso(createdAt);const entries=[...files].sort((a,b)=>a.path.localeCompare(b.path));const suffix=sha256(Buffer.from(JSON.stringify({created_at:normalizedCreatedAt,files:entries}))).slice(0,8);const stamp=normalizedCreatedAt.replace(/[-:]/g,'').replace('.000','');return`snap-${stamp}-${suffix}`;}
async function readJson(path){return JSON.parse(await readFile(path,'utf8'));}
async function isDirectory(path){try{return(await stat(path)).isDirectory();}catch(error){if(error?.code==='ENOENT')return false;throw error;}}
function assertHexSha(name,value){if(!/^[a-f0-9]{64}$/.test(String(value||'')))throw new Error(`${name}_INVALID`);}

if(process.env.CHRC_VIASNA_PROMOTION_AUTHORIZED!==AUTHORIZATION)throw new Error('VIASNA_SNAPSHOT_PROMOTION_NOT_AUTHORIZED');
const candidateInput=process.env.CHRC_VIASNA_CANDIDATE_DIR;
const auditInput=process.env.CHRC_VIASNA_AUDIT_RECEIPT_FILE;
const buildAuditInput=process.env.CHRC_VIASNA_BUILD_AUDIT_RECEIPT_FILE;
if(!candidateInput)throw new Error('CHRC_VIASNA_CANDIDATE_DIR_NOT_CONFIGURED');
if(!auditInput)throw new Error('CHRC_VIASNA_AUDIT_RECEIPT_FILE_NOT_CONFIGURED');
if(!buildAuditInput)throw new Error('CHRC_VIASNA_BUILD_AUDIT_RECEIPT_FILE_NOT_CONFIGURED');

const testMode=process.env.CHRC_TEST_MODE==='1';
const repo=await realpath(repoRoot);
const candidate=await realpath(resolve(candidateInput));
const auditReceipt=await realpath(resolve(auditInput));
const buildAuditReceipt=await realpath(resolve(buildAuditInput));
if(!testMode&&inside(repo,candidate))throw new Error('REAL_VIASNA_CANDIDATE_INSIDE_PUBLIC_REPO');
if(!testMode&&inside(repo,auditReceipt))throw new Error('VIASNA_AUDIT_RECEIPT_INSIDE_PUBLIC_REPO');
if(!testMode&&inside(repo,buildAuditReceipt))throw new Error('VIASNA_BUILD_AUDIT_RECEIPT_INSIDE_PUBLIC_REPO');
if(!(await stat(candidate)).isDirectory())throw new Error('VIASNA_CANDIDATE_NOT_DIRECTORY');
if(!(await stat(auditReceipt)).isFile())throw new Error('VIASNA_AUDIT_RECEIPT_NOT_REGULAR_FILE');
if(!(await stat(buildAuditReceipt)).isFile())throw new Error('VIASNA_BUILD_AUDIT_RECEIPT_NOT_REGULAR_FILE');

const targetOverride=String(process.env.CHRC_VIASNA_PROMOTION_TARGET_DIR||'').trim();
if(targetOverride&&!testMode)throw new Error('VIASNA_PROMOTION_TARGET_OVERRIDE_REQUIRES_TEST_MODE');
const target=targetOverride?resolve(targetOverride):join(repoRoot,'data','public','current');
if(!testMode&&resolve(target)!==resolve(join(repoRoot,'data','public','current')))throw new Error('VIASNA_PROMOTION_TARGET_INVALID');

const integrity=await verifySnapshot(candidate);
if(!integrity.ok)throw new Error(`VIASNA_PROMOTION_CANDIDATE_INTEGRITY_FAIL:${JSON.stringify(integrity.failures)}`);
const candidateManifest=integrity.manifest;
if(candidateManifest.publication_state!=='CANDIDATE_REVIEW')throw new Error(`VIASNA_PROMOTION_CANDIDATE_STATE_INVALID:${candidateManifest.publication_state||'missing'}`);
const candidateManifestRaw=await readFile(join(candidate,'manifest.json'));
const candidateManifestSha256=sha256(candidateManifestRaw);
const expectedCandidateManifestSha=String(process.env.CHRC_EXPECTED_VIASNA_CANDIDATE_MANIFEST_SHA256||'').trim().toLowerCase();
if(!testMode&&!expectedCandidateManifestSha)throw new Error('CHRC_EXPECTED_VIASNA_CANDIDATE_MANIFEST_SHA256_REQUIRED');
if(expectedCandidateManifestSha){assertHexSha('CHRC_EXPECTED_VIASNA_CANDIDATE_MANIFEST_SHA256',expectedCandidateManifestSha);if(expectedCandidateManifestSha!==candidateManifestSha256)throw new Error(`VIASNA_PROMOTION_CANDIDATE_MANIFEST_SHA256_MISMATCH:${candidateManifestSha256}:${expectedCandidateManifestSha}`);}

const auditRaw=await readFile(auditReceipt);
const auditSha256=sha256(auditRaw);
const expectedAuditSha=String(process.env.CHRC_EXPECTED_VIASNA_AUDIT_RECEIPT_SHA256||'').trim().toLowerCase();
if(!testMode&&!expectedAuditSha)throw new Error('CHRC_EXPECTED_VIASNA_AUDIT_RECEIPT_SHA256_REQUIRED');
if(expectedAuditSha){assertHexSha('CHRC_EXPECTED_VIASNA_AUDIT_RECEIPT_SHA256',expectedAuditSha);if(expectedAuditSha!==auditSha256)throw new Error(`VIASNA_PROMOTION_AUDIT_RECEIPT_SHA256_MISMATCH:${auditSha256}:${expectedAuditSha}`);}
const audit=JSON.parse(auditRaw.toString('utf8'));
if(audit.state!=='REAL_VIASNA_CANDIDATE_AUDIT_PASS_NOT_PUBLISHED')throw new Error(`VIASNA_PROMOTION_AUDIT_STATE_INVALID:${audit.state||'missing'}`);
if(audit.next_gate!=='EXPLICIT_SNAPSHOT_PROMOTION')throw new Error(`VIASNA_PROMOTION_AUDIT_NEXT_GATE_INVALID:${audit.next_gate||'missing'}`);
if(audit.snapshot_id!==candidateManifest.snapshot_id)throw new Error(`VIASNA_PROMOTION_AUDIT_SNAPSHOT_ID_MISMATCH:${audit.snapshot_id}:${candidateManifest.snapshot_id}`);
if(audit.candidate_manifest_sha256!==candidateManifestSha256)throw new Error('VIASNA_PROMOTION_AUDIT_MANIFEST_SHA_MISMATCH');
if(audit.private_boundary_leaks!==0)throw new Error(`VIASNA_PROMOTION_PRIVATE_BOUNDARY_NOT_CLEAN:${audit.private_boundary_leaks}`);
if(audit.public_repo_mutated!==false||audit.production_published!==false)throw new Error('VIASNA_PROMOTION_AUDIT_PREPUBLICATION_STATE_INVALID');
if(audit.people!==candidateManifest.counts?.people||audit.active!==candidateManifest.counts?.political_prisoners_current||audit.former!==candidateManifest.counts?.former_political_prisoners||audit.np!==(audit.people-audit.active-audit.former))throw new Error('VIASNA_PROMOTION_AUDIT_COUNTS_MISMATCH');

const buildAuditRaw=await readFile(buildAuditReceipt);
const buildAuditSha256=sha256(buildAuditRaw);
const expectedBuildAuditSha=String(process.env.CHRC_EXPECTED_VIASNA_BUILD_AUDIT_RECEIPT_SHA256||'').trim().toLowerCase();
if(!testMode&&!expectedBuildAuditSha)throw new Error('CHRC_EXPECTED_VIASNA_BUILD_AUDIT_RECEIPT_SHA256_REQUIRED');
if(expectedBuildAuditSha){assertHexSha('CHRC_EXPECTED_VIASNA_BUILD_AUDIT_RECEIPT_SHA256',expectedBuildAuditSha);if(expectedBuildAuditSha!==buildAuditSha256)throw new Error(`VIASNA_PROMOTION_BUILD_AUDIT_RECEIPT_SHA256_MISMATCH:${buildAuditSha256}:${expectedBuildAuditSha}`);}
const buildAudit=JSON.parse(buildAuditRaw.toString('utf8'));
if(buildAudit.state!=='REAL_VIASNA_CANDIDATE_BUILD_AUDIT_PASS_NOT_PUBLISHED')throw new Error(`VIASNA_PROMOTION_BUILD_AUDIT_STATE_INVALID:${buildAudit.state||'missing'}`);
if(buildAudit.next_gate!=='EXPLICIT_SNAPSHOT_PROMOTION')throw new Error(`VIASNA_PROMOTION_BUILD_AUDIT_NEXT_GATE_INVALID:${buildAudit.next_gate||'missing'}`);
if(buildAudit.snapshot_id!==candidateManifest.snapshot_id)throw new Error(`VIASNA_PROMOTION_BUILD_AUDIT_SNAPSHOT_ID_MISMATCH:${buildAudit.snapshot_id}:${candidateManifest.snapshot_id}`);
if(buildAudit.candidate_manifest_sha256!==candidateManifestSha256)throw new Error('VIASNA_PROMOTION_BUILD_AUDIT_MANIFEST_SHA_MISMATCH');
if(buildAudit.candidate_audit_receipt_sha256!==auditSha256)throw new Error('VIASNA_PROMOTION_BUILD_AUDIT_CANDIDATE_AUDIT_SHA_MISMATCH');
if(buildAudit.people!==candidateManifest.counts?.people)throw new Error(`VIASNA_PROMOTION_BUILD_AUDIT_PEOPLE_MISMATCH:${buildAudit.people}:${candidateManifest.counts?.people}`);
if(buildAudit.artifact_contract_pass!==true)throw new Error('VIASNA_PROMOTION_BUILD_AUDIT_ARTIFACT_CONTRACT_NOT_PASS');
if(buildAudit.private_file_leaks!==0)throw new Error(`VIASNA_PROMOTION_BUILD_AUDIT_PRIVATE_LEAKS:${buildAudit.private_file_leaks}`);
if(buildAudit.workspace_site_restored!==true)throw new Error('VIASNA_PROMOTION_BUILD_AUDIT_WORKSPACE_NOT_RESTORED');
if(buildAudit.public_repo_mutated!==false||buildAudit.deployment_performed!==false||buildAudit.production_published!==false)throw new Error('VIASNA_PROMOTION_BUILD_AUDIT_PREPUBLICATION_STATE_INVALID');

const sourceSnapshot=(candidateManifest.source_snapshots||[]).find(item=>item?.source_id==='src-viasna');
if(!sourceSnapshot?.source_sha256)throw new Error('VIASNA_PROMOTION_SOURCE_SHA256_MISSING');
assertHexSha('VIASNA_PROMOTION_SOURCE_SHA256',sourceSnapshot.source_sha256);
if(audit.source_sha256!==sourceSnapshot.source_sha256)throw new Error('VIASNA_PROMOTION_AUDIT_SOURCE_SHA256_MISMATCH');

const files=[...(candidateManifest.files||[])].sort((a,b)=>a.path.localeCompare(b.path));
if(files.length!==REQUIRED_FILES.length||REQUIRED_FILES.some(name=>!files.some(entry=>entry.path===name)))throw new Error('VIASNA_PROMOTION_CANDIDATE_FILE_SET_INVALID');
if(files.some(entry=>!REQUIRED_FILES.includes(entry.path)))throw new Error('VIASNA_PROMOTION_CANDIDATE_EXTRA_FILE');

if(await isDirectory(target)){
  const currentManifest=await readJson(join(target,'manifest.json'));
  const currentFiles=new Map((currentManifest.files||[]).map(entry=>[entry.path,entry]));
  for(const name of ['news.json','reports.json']){
    const candidateEntry=files.find(entry=>entry.path===name);
    const currentRaw=await readFile(join(target,name));
    const currentSha=sha256(currentRaw);
    if(currentSha!==candidateEntry.sha256)throw new Error(`VIASNA_PROMOTION_CANONICAL_SUPPORT_DATA_DRIFT:${name}:${candidateEntry.sha256}:${currentSha}`);
    const currentManifestEntry=currentFiles.get(name);
    if(currentManifestEntry&&currentManifestEntry.sha256!==currentSha)throw new Error(`VIASNA_PROMOTION_CURRENT_MANIFEST_DRIFT:${name}`);
  }
}

const promotedAt=normalizedIso(process.env.CHRC_PROMOTED_AT||new Date().toISOString());
const publishedSnapshotId=snapshotId(promotedAt,files);
const publishedManifest={
  snapshot_id:publishedSnapshotId,
  created_at:promotedAt,
  publication_state:'PUBLISHED',
  counts:candidateManifest.counts,
  source_snapshots:[{
    source_id:'src-viasna',
    observed_at:sourceSnapshot.source_observed_at||candidateManifest.created_at,
    source_page_url:sourceSnapshot.source_page_url||null,
    source_sha256:sourceSnapshot.source_sha256,
    parsed_rows:sourceSnapshot.parsed_rows??null,
    clean_rows:candidateManifest.counts.people,
    quarantined_rows:sourceSnapshot.quarantined_rows??null,
    review_required_findings:sourceSnapshot.review_required_findings??null,
    identity_resolution_applied:Boolean(sourceSnapshot.identity_resolution_applied),
    identity_resolution_sha256:sourceSnapshot.identity_resolution_sha256||null,
    candidate_snapshot_id:candidateManifest.snapshot_id,
    candidate_manifest_sha256:candidateManifestSha256,
    candidate_audit_receipt_sha256:auditSha256,
    candidate_build_audit_receipt_sha256:buildAuditSha256
  }],
  files
};

const parent=dirname(target);
await mkdir(parent,{recursive:true});
const temp=join(parent,`.promotion-${process.pid}-${Date.now()}`);
const backup=join(parent,`.promotion-backup-${process.pid}-${Date.now()}`);
await mkdir(temp,{recursive:true});
let targetMoved=false;
try{
  for(const name of REQUIRED_FILES)await copyFile(join(candidate,name),join(temp,name));
  await writeFile(join(temp,'manifest.json'),JSON.stringify(publishedManifest,null,2)+'\n','utf8');
  await writeFile(join(temp,'SHA256SUMS'),files.map(entry=>`${entry.sha256}  ${entry.path}`).join('\n')+'\n','utf8');
  const stagedIntegrity=await verifySnapshot(temp);
  if(!stagedIntegrity.ok)throw new Error(`VIASNA_PROMOTION_STAGED_INTEGRITY_FAIL:${JSON.stringify(stagedIntegrity.failures)}`);

  if(await isDirectory(target)){await rename(target,backup);targetMoved=true;}
  try{await rename(temp,target);}catch(error){if(targetMoved&&!(await isDirectory(target))&&await isDirectory(backup))await rename(backup,target);throw error;}
  const finalIntegrity=await verifySnapshot(target);
  if(!finalIntegrity.ok)throw new Error(`VIASNA_PROMOTION_FINAL_INTEGRITY_FAIL:${JSON.stringify(finalIntegrity.failures)}`);
  if(targetMoved)await rm(backup,{recursive:true,force:true});
}catch(error){
  await rm(temp,{recursive:true,force:true});
  if(targetMoved&&!(await isDirectory(target))&&await isDirectory(backup))await rename(backup,target);
  throw error;
}

console.log(`VIASNA_SNAPSHOT_PROMOTION=PASS snapshot=${publishedSnapshotId} candidate=${candidateManifest.snapshot_id} people=${publishedManifest.counts.people} active=${publishedManifest.counts.political_prisoners_current} former=${publishedManifest.counts.former_political_prisoners} source_sha256=${sourceSnapshot.source_sha256} candidate_manifest_sha256=${candidateManifestSha256} audit_receipt_sha256=${auditSha256} build_audit_receipt_sha256=${buildAuditSha256} publication_state=PUBLISHED`);
console.log(`VIASNA_PROMOTION_TARGET=${target}`);
