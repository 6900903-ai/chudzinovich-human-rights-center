import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { parseViasnaCsv } from '../adapters/viasna.mjs';
import { createImmutableSnapshot, verifySnapshot } from './snapshot.mjs';
import { promoteViasnaObservations } from './viasna-promotion.mjs';

function sha256(data){return createHash('sha256').update(data).digest('hex');}
async function readJson(path,fallback=null){try{return JSON.parse(await readFile(path,'utf8'));}catch(error){if(error.code==='ENOENT'&&fallback!==null)return fallback;throw error;}}
async function writeJson(path,value){await writeFile(path,JSON.stringify(value,null,2)+'\n',{encoding:'utf8',mode:0o600});}

export async function prepareViasnaSnapshot({
  sourceFile,
  outputRoot,
  currentPublicDir,
  sourcePageUrl='https://prisoners.spring96.org/ru/list',
  locale='ru',
  asOf=new Date().toISOString(),
  identityResolution=null
}){
  if(!sourceFile)throw new Error('VIASNA_PREPARE_SOURCE_FILE_REQUIRED');
  if(!outputRoot)throw new Error('VIASNA_PREPARE_OUTPUT_ROOT_REQUIRED');
  if(!currentPublicDir)throw new Error('VIASNA_PREPARE_CURRENT_PUBLIC_DIR_REQUIRED');
  const raw=await readFile(sourceFile);
  if(!raw.byteLength)throw new Error('VIASNA_PREPARE_SOURCE_EMPTY');
  if(raw.byteLength>8*1024*1024)throw new Error('VIASNA_PREPARE_SOURCE_TOO_LARGE');
  const text=raw.toString('utf8');
  if(/<html[\s>]/i.test(text.slice(0,4096)))throw new Error('VIASNA_PREPARE_SOURCE_LOOKS_LIKE_HTML');
  const sourceDigest=sha256(raw);
  if(identityResolution&&identityResolution.source_sha256!==sourceDigest)throw new Error(`VIASNA_PREPARE_IDENTITY_RESOLUTION_SOURCE_MISMATCH:${identityResolution.source_sha256}:${sourceDigest}`);
  const parsed=parseViasnaCsv(text,{locale,sourceUrl:sourcePageUrl,fetchedAt:asOf,observedAt:asOf});
  const existingPeople=await readJson(join(currentPublicDir,'people.json'),[]);
  const promoted=promoteViasnaObservations(parsed.observations,{existingPeople,asOf,identityResolution});
  if(!promoted.people.length)throw new Error('VIASNA_PREPARE_NO_CLEAN_PUBLIC_ROWS');

  const runId=`viasna-prepare-${asOf.replace(/[-:.]/g,'')}-${sourceDigest.slice(0,12)}`;
  const runDir=join(outputRoot,runId);
  const normalizedInput=join(runDir,'normalized-input');
  const privateReview=join(runDir,'private-review');
  const snapshotsRoot=join(runDir,'public-candidate-snapshots');
  await mkdir(normalizedInput,{recursive:true,mode:0o700});
  await mkdir(privateReview,{recursive:true,mode:0o700});
  await mkdir(snapshotsRoot,{recursive:true,mode:0o700});
  try{
    await writeJson(join(normalizedInput,'people.json'),promoted.people);
    await writeJson(join(normalizedInput,'prisons.json'),promoted.prisons);
    const canonicalNews=await readJson(join(currentPublicDir,'news.json'),[]);
    const canonicalReports=await readJson(join(currentPublicDir,'reports.json'),[]);
    await writeJson(join(normalizedInput,'news.json'),canonicalNews);
    await writeJson(join(normalizedInput,'reports.json'),canonicalReports);

    const resolutionSummary=promoted.identity_resolution?{...promoted.identity_resolution,file_sha256:identityResolution?.file_sha256||null}:null;
    const created=await createImmutableSnapshot({
      inputDir:normalizedInput,
      outputRoot:snapshotsRoot,
      createdAt:asOf,
      publicationState:'CANDIDATE_REVIEW',
      counts:promoted.counts,
      sourceSnapshots:[{
        source_id:'src-viasna',
        source_page_url:sourcePageUrl,
        source_sha256:sourceDigest,
        source_filename:basename(sourceFile),
        source_observed_at:asOf,
        parsed_rows:parsed.observations.length,
        clean_rows:promoted.people.length,
        quarantined_rows:promoted.quarantine.count,
        review_required_findings:promoted.review?.count||0,
        identity_resolution_applied:Boolean(identityResolution),
        identity_resolution_sha256:identityResolution?.file_sha256||null
      }]
    });
    const integrity=await verifySnapshot(created.snapshotDir);
    if(!integrity.ok)throw new Error(`VIASNA_PREPARE_SNAPSHOT_INTEGRITY_FAIL:${JSON.stringify(integrity.failures)}`);

    await writeJson(join(privateReview,'quarantine.json'),promoted.quarantine);
    await writeJson(join(privateReview,'review-required.json'),promoted.review||{count:0,findings:[]});
    await writeJson(join(privateReview,'diagnostics.json'),[...parsed.diagnostics,...promoted.diagnostics]);
    if(resolutionSummary)await writeJson(join(privateReview,'identity-resolution-summary.json'),resolutionSummary);
    await writeJson(join(privateReview,'source-evidence.json'),{
      source_id:'src-viasna',source_page_url:sourcePageUrl,source_filename:basename(sourceFile),source_sha256:sourceDigest,
      source_bytes:raw.byteLength,prepared_at:asOf,parser_version:parsed.parser_version,parsed_rows:parsed.observations.length,
      clean_rows:promoted.people.length,quarantined_rows:promoted.quarantine.count,review_required_findings:promoted.review?.count||0,
      identity_resolution:resolutionSummary
    });
    await writeJson(join(runDir,'PREPARED_CANDIDATE.json'),{
      state:'PREPARED_NOT_PUBLISHED',snapshot_id:created.snapshotId,snapshot_dir:created.snapshotDir,
      people:promoted.people.length,prisons:promoted.prisons.length,quarantined_rows:promoted.quarantine.count,review_required_findings:promoted.review?.count||0,
      identity_resolution:resolutionSummary,source_sha256:sourceDigest,publication_state:'CANDIDATE_REVIEW',public_repo_mutated:false
    });
    await rm(normalizedInput,{recursive:true,force:true});
    return {runId,runDir,snapshotId:created.snapshotId,snapshotDir:created.snapshotDir,people:promoted.people.length,prisons:promoted.prisons.length,quarantined:promoted.quarantine.count,reviewRequired:promoted.review?.count||0,identityResolution:resolutionSummary,sourceSha256:sourceDigest};
  }catch(error){
    await rm(runDir,{recursive:true,force:true});
    throw error;
  }
}
