import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { verifySnapshot } from './lib/snapshot.mjs';
import { isSitemapIndex, sitemapLocs } from './lib/sitemap.mjs';

const repoRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=join(repoRoot,'_site');
const SITE='https://chudzinovich.pp.ua';

function inside(parent,child){const rel=relative(parent,child);return rel===''||(!rel.startsWith('..'+sep)&&rel!=='..'&&!isAbsolute(rel));}
function sha256(data){return createHash('sha256').update(data).digest('hex');}
function envInt(name,fallback,{min=0,max=Number.MAX_SAFE_INTEGER}={}){const raw=process.env[name];if(raw==null||raw==='')return fallback;const value=Number.parseInt(raw,10);if(!Number.isInteger(value)||value<min||value>max)throw new Error(`${name}_INVALID`);return value;}
function assertHexSha(name,value){if(!/^[a-f0-9]{64}$/.test(String(value||'')))throw new Error(`${name}_INVALID`);}
async function pathExists(path){try{await stat(path);return true;}catch(error){if(error?.code==='ENOENT')return false;throw error;}}
async function walk(dir,base=dir,outFiles=[]){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())await walk(path,base,outFiles);else if(entry.isFile()){const info=await stat(path);outFiles.push({path,relative:relative(base,path).replaceAll('\\','/'),bytes:info.size});}}return outFiles;}
function run(command,args,env){const started=Date.now();const result=spawnSync(command,args,{cwd:repoRoot,env,encoding:'utf8',maxBuffer:64*1024*1024});return{...result,duration_ms:Date.now()-started};}

const candidateInput=process.env.CHRC_VIASNA_CANDIDATE_DIR;
const auditInput=process.env.CHRC_VIASNA_AUDIT_RECEIPT_FILE;
const outputReceiptInput=process.env.CHRC_VIASNA_BUILD_AUDIT_RECEIPT_FILE;
if(!candidateInput)throw new Error('CHRC_VIASNA_CANDIDATE_DIR_NOT_CONFIGURED');
if(!auditInput)throw new Error('CHRC_VIASNA_AUDIT_RECEIPT_FILE_NOT_CONFIGURED');
if(!outputReceiptInput)throw new Error('CHRC_VIASNA_BUILD_AUDIT_RECEIPT_FILE_NOT_CONFIGURED');

const testMode=process.env.CHRC_TEST_MODE==='1';
const repo=await realpath(repoRoot);
const candidate=await realpath(resolve(candidateInput));
const auditReceipt=await realpath(resolve(auditInput));
const buildReceiptPath=resolve(outputReceiptInput);
if(!testMode&&inside(repo,candidate))throw new Error('REAL_VIASNA_CANDIDATE_INSIDE_PUBLIC_REPO');
if(!testMode&&inside(repo,auditReceipt))throw new Error('VIASNA_AUDIT_RECEIPT_INSIDE_PUBLIC_REPO');
if(!testMode&&inside(repo,buildReceiptPath))throw new Error('VIASNA_BUILD_AUDIT_RECEIPT_INSIDE_PUBLIC_REPO');

const integrity=await verifySnapshot(candidate);
if(!integrity.ok)throw new Error(`VIASNA_BUILD_AUDIT_CANDIDATE_INTEGRITY_FAIL:${JSON.stringify(integrity.failures)}`);
const manifest=integrity.manifest;
if(manifest.publication_state!=='CANDIDATE_REVIEW')throw new Error(`VIASNA_BUILD_AUDIT_CANDIDATE_STATE_INVALID:${manifest.publication_state||'missing'}`);
const candidateManifestRaw=await readFile(join(candidate,'manifest.json'));
const candidateManifestSha256=sha256(candidateManifestRaw);
const expectedCandidateSha=String(process.env.CHRC_EXPECTED_VIASNA_CANDIDATE_MANIFEST_SHA256||'').trim().toLowerCase();
if(!testMode&&!expectedCandidateSha)throw new Error('CHRC_EXPECTED_VIASNA_CANDIDATE_MANIFEST_SHA256_REQUIRED');
if(expectedCandidateSha){assertHexSha('CHRC_EXPECTED_VIASNA_CANDIDATE_MANIFEST_SHA256',expectedCandidateSha);if(expectedCandidateSha!==candidateManifestSha256)throw new Error(`VIASNA_BUILD_AUDIT_CANDIDATE_MANIFEST_SHA256_MISMATCH:${candidateManifestSha256}:${expectedCandidateSha}`);}

const auditRaw=await readFile(auditReceipt);const auditSha256=sha256(auditRaw);const audit=JSON.parse(auditRaw.toString('utf8'));
const expectedAuditSha=String(process.env.CHRC_EXPECTED_VIASNA_AUDIT_RECEIPT_SHA256||'').trim().toLowerCase();
if(!testMode&&!expectedAuditSha)throw new Error('CHRC_EXPECTED_VIASNA_AUDIT_RECEIPT_SHA256_REQUIRED');
if(expectedAuditSha){assertHexSha('CHRC_EXPECTED_VIASNA_AUDIT_RECEIPT_SHA256',expectedAuditSha);if(expectedAuditSha!==auditSha256)throw new Error(`VIASNA_BUILD_AUDIT_RECEIPT_SHA256_MISMATCH:${auditSha256}:${expectedAuditSha}`);}
if(audit.state!=='REAL_VIASNA_CANDIDATE_AUDIT_PASS_NOT_PUBLISHED'||audit.next_gate!=='FULL_CANDIDATE_BUILD_AUDIT')throw new Error('VIASNA_BUILD_AUDIT_CANDIDATE_AUDIT_STATE_INVALID');
if(audit.snapshot_id!==manifest.snapshot_id||audit.candidate_manifest_sha256!==candidateManifestSha256)throw new Error('VIASNA_BUILD_AUDIT_CANDIDATE_BINDING_MISMATCH');
if(audit.private_boundary_leaks!==0||audit.production_published!==false)throw new Error('VIASNA_BUILD_AUDIT_PREPUBLICATION_STATE_INVALID');

const maxSiteBytes=envInt('CHRC_CANDIDATE_MAX_SITE_BYTES',900_000_000,{min:1_000_000,max:1_000_000_000});
const maxBuildSeconds=envInt('CHRC_CANDIDATE_MAX_BUILD_SECONDS',480,{min:1,max:1200});
const maxTotalSeconds=envInt('CHRC_CANDIDATE_MAX_TOTAL_AUDIT_SECONDS',600,{min:maxBuildSeconds,max:1500});
const maxSingleFileBytes=envInt('CHRC_CANDIDATE_MAX_SINGLE_FILE_BYTES',25_000_000,{min:1024,max:100_000_000});

const wholeStarted=Date.now();
const previewRoot=await mkdtemp(join(tmpdir(),'chudo-viasna-published-preview-'));
const workspaceBackup=join(repoRoot,`.candidate-build-site-backup-${process.pid}-${Date.now()}`);
const hadPreviousSite=await pathExists(out);
let workspaceActivated=false;
let result=null;

try{
  for(const file of manifest.files||[]){
    const source=join(candidate,file.path);const target=join(previewRoot,file.path);
    await mkdir(dirname(target),{recursive:true,mode:0o700});
    await copyFile(source,target);
  }
  const previewManifest={...manifest,publication_state:'PUBLISHED'};
  await writeFile(join(previewRoot,'manifest.json'),JSON.stringify(previewManifest,null,2)+'\n',{encoding:'utf8',mode:0o600});
  const previewIntegrity=await verifySnapshot(previewRoot);
  if(!previewIntegrity.ok)throw new Error(`VIASNA_BUILD_AUDIT_PUBLISHED_PREVIEW_INTEGRITY_FAIL:${JSON.stringify(previewIntegrity.failures)}`);
  if(previewIntegrity.manifest.publication_state!=='PUBLISHED')throw new Error('VIASNA_BUILD_AUDIT_PUBLISHED_PREVIEW_STATE_INVALID');

  const env={...process.env,CHRC_PUBLIC_DATA_DIR:previewRoot,CHRC_CANDIDATE_BUILD_MODE:'AUDIT_ONLY'};
  delete env.CHRC_VIASNA_PROMOTION_AUTHORIZED;
  const npm=process.platform==='win32'?'npm.cmd':'npm';

  if(hadPreviousSite)await rename(out,workspaceBackup);
  workspaceActivated=true;

  const build=run(npm,['run','build'],env);
  if(build.status!==0)throw new Error(`VIASNA_CANDIDATE_FULL_BUILD_FAILED:${(build.stderr||build.stdout||'').slice(-12000)}`);
  if(build.duration_ms>maxBuildSeconds*1000)throw new Error(`VIASNA_CANDIDATE_BUILD_TIME_BUDGET_EXCEEDED:${build.duration_ms}:${maxBuildSeconds*1000}`);
  const artifactValidation=run(process.execPath,[join(repoRoot,'scripts','validate-pages-artifact.mjs')],env);
  if(artifactValidation.status!==0)throw new Error(`VIASNA_CANDIDATE_ARTIFACT_VALIDATION_FAILED:${(artifactValidation.stderr||artifactValidation.stdout||'').slice(-12000)}`);
  const totalDurationMs=Date.now()-wholeStarted;
  if(totalDurationMs>maxTotalSeconds*1000)throw new Error(`VIASNA_CANDIDATE_TOTAL_TIME_BUDGET_EXCEEDED:${totalDurationMs}:${maxTotalSeconds*1000}`);

  const files=await walk(out);const siteBytes=files.reduce((sum,file)=>sum+file.bytes,0);const htmlFiles=files.filter(file=>file.relative.endsWith('.html'));
  if(siteBytes>maxSiteBytes)throw new Error(`VIASNA_CANDIDATE_SITE_SIZE_BUDGET_EXCEEDED:${siteBytes}:${maxSiteBytes}`);
  const largest=files.reduce((best,file)=>!best||file.bytes>best.bytes?file:best,null);
  if(largest&&largest.bytes>maxSingleFileBytes)throw new Error(`VIASNA_CANDIDATE_SINGLE_FILE_BUDGET_EXCEEDED:${largest.relative}:${largest.bytes}:${maxSingleFileBytes}`);
  const forbidden=files.filter(file=>/(^|\/)(?:private-review|quarantine|review-required|identity-resolution|candidate-audit|source\.csv)(?:\/|\.|$)/i.test(file.relative)||/\.csv$/i.test(file.relative));
  if(forbidden.length)throw new Error(`VIASNA_CANDIDATE_ARTIFACT_PRIVATE_FILE_LEAK:${forbidden.slice(0,20).map(file=>file.relative).join('|')}`);

  const sitemapMain=await readFile(join(out,'sitemap.xml'),'utf8');let sitemapShardCount=1;let sitemapUrlCount=sitemapLocs(sitemapMain).length;
  if(isSitemapIndex(sitemapMain)){
    const shardUrls=sitemapLocs(sitemapMain);sitemapShardCount=shardUrls.length;sitemapUrlCount=0;
    for(const shardUrl of shardUrls){if(!shardUrl.startsWith(`${SITE}/sitemap-`))throw new Error(`VIASNA_CANDIDATE_SITEMAP_SHARD_ORIGIN_INVALID:${shardUrl}`);const xml=await readFile(join(out,basename(new URL(shardUrl).pathname)),'utf8');sitemapUrlCount+=sitemapLocs(xml).length;}
  }

  result={
    state:'REAL_VIASNA_CANDIDATE_BUILD_AUDIT_PASS_NOT_PUBLISHED',
    audit_version:1,
    audited_at:new Date().toISOString(),
    snapshot_id:manifest.snapshot_id,
    candidate_manifest_sha256:candidateManifestSha256,
    candidate_audit_receipt_sha256:auditSha256,
    candidate_publication_state:'CANDIDATE_REVIEW',
    rendered_publication_state:'PUBLISHED',
    published_preview_ephemeral:true,
    people:manifest.counts.people,
    build_duration_ms:build.duration_ms,
    artifact_validation_duration_ms:artifactValidation.duration_ms,
    total_duration_ms:totalDurationMs,
    site_bytes:siteBytes,
    total_files:files.length,
    html_files:htmlFiles.length,
    largest_file:largest?{path:largest.relative,bytes:largest.bytes}:null,
    sitemap_shards:sitemapShardCount,
    sitemap_urls:sitemapUrlCount,
    budgets:{max_site_bytes:maxSiteBytes,max_build_seconds:maxBuildSeconds,max_total_audit_seconds:maxTotalSeconds,max_single_file_bytes:maxSingleFileBytes},
    artifact_contract_pass:true,
    private_file_leaks:0,
    workspace_site_restored:false,
    preview_removed:false,
    public_repo_mutated:false,
    deployment_performed:false,
    production_published:false,
    next_gate:'EXPLICIT_SNAPSHOT_PROMOTION'
  };
}finally{
  if(workspaceActivated){
    await rm(out,{recursive:true,force:true});
    if(hadPreviousSite&&await pathExists(workspaceBackup))await rename(workspaceBackup,out);
    else await rm(workspaceBackup,{recursive:true,force:true});
  }
  await rm(previewRoot,{recursive:true,force:true});
}

if(!result)throw new Error('VIASNA_CANDIDATE_BUILD_AUDIT_RESULT_MISSING');
result.workspace_site_restored=true;
result.preview_removed=true;
await mkdir(dirname(buildReceiptPath),{recursive:true,mode:0o700});
await writeFile(buildReceiptPath,JSON.stringify(result,null,2)+'\n',{encoding:'utf8',mode:0o600,flag:'wx'});
console.log(`REAL_VIASNA_CANDIDATE_BUILD_AUDIT=PASS snapshot=${result.snapshot_id} people=${result.people} render_state=${result.rendered_publication_state} html=${result.html_files} files=${result.total_files} site_bytes=${result.site_bytes} build_ms=${result.build_duration_ms} total_ms=${result.total_duration_ms} sitemap_shards=${result.sitemap_shards} sitemap_urls=${result.sitemap_urls} restored=true preview_removed=true published=false deploy=false next_gate=${result.next_gate}`);
console.log(`VIASNA_CANDIDATE_BUILD_AUDIT_RECEIPT=${buildReceiptPath}`);
console.log(JSON.stringify(result));
