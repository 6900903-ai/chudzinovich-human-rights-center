import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { auditReviewedSnapshot, repoRoot } from './lib/reviewed-snapshot.mjs';

const testMode=process.env.CHRC_TEST_MODE==='1';
const sourceDir=process.env.CHRC_REVIEW_SNAPSHOT_DIR;
const expectedSnapshot=process.env.EXPECTED_SNAPSHOT_ID;
const expectedManifest=process.env.EXPECTED_MANIFEST_SHA256;
const expectedSource=process.env.EXPECTED_SOURCE_EXPORT_SHA256;
if(!expectedSnapshot)throw new Error('EXPECTED_SNAPSHOT_ID_REQUIRED');
if(!expectedManifest)throw new Error('EXPECTED_MANIFEST_SHA256_REQUIRED');
if(!expectedSource)throw new Error('EXPECTED_SOURCE_EXPORT_SHA256_REQUIRED');
if(!/^[a-f0-9]{64}$/.test(expectedManifest))throw new Error('EXPECTED_MANIFEST_SHA256_INVALID');
if(!/^[a-f0-9]{64}$/.test(expectedSource))throw new Error('EXPECTED_SOURCE_EXPORT_SHA256_INVALID');

const sourceReport=await auditReviewedSnapshot(sourceDir,{testMode,env:process.env});
if(!sourceReport.release_ready)throw new Error('REVIEWED_SNAPSHOT_RELEASE_GATES_NOT_PASS');
const sourceManifest=JSON.parse(await readFile(join(resolve(sourceDir),'manifest.json'),'utf8'));
const sourceDigests=(sourceManifest.source_snapshots||[]).map(item=>item.source_manifest_sha256).filter(Boolean);
if(!sourceDigests.includes(expectedSource))throw new Error('EXPECTED_SOURCE_EXPORT_SHA256_NOT_IN_MANIFEST');

let destination;
if(testMode){
  if(!process.env.CHRC_PUBLIC_DATA_DESTINATION)throw new Error('CHRC_PUBLIC_DATA_DESTINATION_REQUIRED_IN_TEST_MODE');
  destination=resolve(process.env.CHRC_PUBLIC_DATA_DESTINATION);
}else{
  if(process.env.CHRC_PUBLIC_DATA_DESTINATION)throw new Error('PRODUCTION_DESTINATION_OVERRIDE_FORBIDDEN');
  destination=join(repoRoot,'data','public','current');
  const status=execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:repoRoot,encoding:'utf8'}).trim();
  if(status)throw new Error('PUBLIC_REPO_TRACKED_FILES_NOT_CLEAN');
}

const parent=dirname(destination);await mkdir(parent,{recursive:true});
const lockPath=join(parent,'.reviewed-snapshot-promotion.lock');
let lock;
try{lock=await open(lockPath,'wx',0o600);}catch{throw new Error('REVIEWED_SNAPSHOT_PROMOTION_LOCKED');}
const nonce=`${Date.now()}-${process.pid}`;
const stage=join(parent,`.${basename(destination)}-stage-${nonce}`);
const backup=join(parent,`.${basename(destination)}-backup-${nonce}`);
let oldMoved=false,newInstalled=false;
try{
  await mkdir(stage,{recursive:false,mode:0o700});
  for(const name of ['manifest.json','people.json','prisons.json','news.json','reports.json'])await copyFile(join(resolve(sourceDir),name),join(stage,name));
  const staged=await auditReviewedSnapshot(stage,{testMode:true,env:process.env});
  if(staged.snapshot_id!==sourceReport.snapshot_id||staged.manifest_sha256!==sourceReport.manifest_sha256)throw new Error('STAGED_SNAPSHOT_IDENTITY_MISMATCH');
  await rm(backup,{recursive:true,force:true});
  try{await rename(destination,backup);oldMoved=true;}catch(error){if(error?.code!=='ENOENT')throw error;}
  try{await rename(stage,destination);newInstalled=true;}catch(error){if(oldMoved)await rename(backup,destination);throw error;}
  const installed=await auditReviewedSnapshot(destination,{testMode:true,env:process.env});
  if(installed.snapshot_id!==sourceReport.snapshot_id||installed.manifest_sha256!==sourceReport.manifest_sha256)throw new Error('INSTALLED_SNAPSHOT_IDENTITY_MISMATCH');
  await rm(backup,{recursive:true,force:true});oldMoved=false;
  console.log(`REVIEWED_SNAPSHOT_PROMOTION=PASS snapshot=${installed.snapshot_id} manifest_sha256=${installed.manifest_sha256} people=${installed.counts.people} current=${installed.counts.political_prisoners_current} former=${installed.counts.former_political_prisoners} public_repo_mutated=${testMode?'TEST_ONLY':'true'} network_access=false`);
}catch(error){
  if(newInstalled){await rm(destination,{recursive:true,force:true});if(oldMoved){await rename(backup,destination);oldMoved=false;}}
  await rm(stage,{recursive:true,force:true});
  throw error;
}finally{
  await lock.close();await rm(lockPath,{force:true});
}
