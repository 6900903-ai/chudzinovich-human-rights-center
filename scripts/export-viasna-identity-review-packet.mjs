import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseViasnaCsv, validateViasnaUrl } from './adapters/viasna.mjs';
import { detectObservationAnomalies } from './lib/anomaly.mjs';
import { normalizeForMatch } from './lib/normalization.mjs';

const repoRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const MAX_SOURCE_BYTES=8*1024*1024;
const COLLISION_CODES=new Set(['SOURCE_PERSON_URL_IDENTITY_COLLISION','STRONG_PERSON_SIGNATURE_COLLISION']);

function inside(parent,child){const rel=relative(parent,child);return rel===''||(!rel.startsWith('..'+sep)&&rel!=='..'&&!isAbsolute(rel));}
function sha256(data){return createHash('sha256').update(data).digest('hex');}
function idsKey(ids){return [...ids].map(String).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).join('|');}
function knownGender(observation){const value=normalizeForMatch(observation.gender_raw);if(['male','мужчина','мужской','мужчына'].includes(value))return'MALE';if(['female','женщина','женский','жанчына'].includes(value))return'FEMALE';return null;}
function partialDate(value){if(!value)return null;return{raw:value.raw||null,value:value.value||null,precision:value.precision||null,parse_state:value.parse_state||null};}
function unique(values){return[...new Set(values.filter(value=>value!==null&&value!==undefined&&value!==''))].sort((a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true}));}
function envOptionalInt(name){const raw=process.env[name];if(raw==null||raw==='')return null;const value=Number.parseInt(raw,10);if(!Number.isInteger(value)||value<0)throw new Error(`${name}_INVALID`);return value;}

function collisionComponents(observations,anomalies){
  const collisionAnomalies=anomalies.filter(item=>COLLISION_CODES.has(item.code));
  const parent=new Map();
  const find=id=>{if(!parent.has(id))parent.set(id,id);const p=parent.get(id);if(p===id)return id;const root=find(p);parent.set(id,root);return root;};
  const union=(a,b)=>{const ra=find(a),rb=find(b);if(ra!==rb)parent.set(rb,ra);};
  for(const anomaly of collisionAnomalies){const ids=(anomaly.source_record_ids||[]).map(String).filter(Boolean);if(ids.length<2)continue;for(const id of ids)find(id);for(let i=1;i<ids.length;i++)union(ids[0],ids[i]);}
  const groups=new Map();for(const id of parent.keys()){const root=find(id);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(id);}
  const observationsById=new Map(observations.map(item=>[String(item.source_record_id||''),item]));
  return [...groups.values()]
    .map(ids=>ids.sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})))
    .sort((a,b)=>idsKey(a).localeCompare(idsKey(b)))
    .map(ids=>({ids,observations:ids.map(id=>observationsById.get(id)).filter(Boolean),anomalies:collisionAnomalies.filter(item=>(item.source_record_ids||[]).some(id=>ids.includes(String(id))))}));
}

function componentRecord(observation){
  return{
    source_record_id:String(observation.source_record_id),
    row_number:observation.row_number,
    source_person_url:observation.source_person_url||null,
    reported_name:observation.reported_name||null,
    normalized_name:observation.normalized_name||null,
    birth_date:partialDate(observation.birth_date),
    gender:knownGender(observation),
    gender_raw:observation.gender_raw||null,
    source_status_code:observation.source_status_claim?.source_status_code||null,
    source_status_claim:observation.source_status_claim?.claim_type||null,
    detention_date:partialDate(observation.detention_date),
    verdict_date:partialDate(observation.verdict_date),
    release_date:partialDate(observation.release_date),
    prison_facility:observation.prison?.facility||null,
    release_claim:Boolean(observation.release_claim)
  };
}

function reviewComponent(group,index){
  const records=group.observations.map(componentRecord);
  const exactBirths=unique(group.observations.map(item=>item.birth_date?.parse_state==='PARSED'&&item.birth_date?.precision==='day'?item.birth_date.value:null));
  const genders=unique(group.observations.map(knownGender));
  const names=unique(group.observations.map(item=>item.normalized_name||null));
  const personUrls=unique(group.observations.map(item=>item.source_person_url||null));
  const collisionCodes=unique(group.anomalies.map(item=>item.code));
  const birthConflict=exactBirths.length>1;
  const genderConflict=genders.length>1;
  const hardMergeBlockers=[];
  if(birthConflict)hardMergeBlockers.push('CONFLICTING_EXACT_BIRTH_DATES');
  if(genderConflict)hardMergeBlockers.push('CONFLICTING_KNOWN_GENDERS');
  const key=idsKey(group.ids);
  return{
    component_id:`idc-${String(index+1).padStart(3,'0')}-${sha256(Buffer.from(key)).slice(0,8)}`,
    source_record_ids:group.ids,
    collision_codes:collisionCodes,
    records,
    comparison:{
      record_count:records.length,
      distinct_normalized_names:names.length,
      distinct_exact_birth_dates:exactBirths.length,
      distinct_known_genders:genders.length,
      distinct_source_person_urls:personUrls.length,
      same_source_person_url:personUrls.length===1&&personUrls.length>0,
      strong_signature_collision:collisionCodes.includes('STRONG_PERSON_SIGNATURE_COLLISION'),
      exact_birth_conflict:birthConflict,
      known_gender_conflict:genderConflict,
      hard_merge_blockers:hardMergeBlockers
    },
    editorial_gate:{
      decision_required:true,
      automatic_merge_allowed:false,
      automatic_keep_distinct_allowed:false,
      allowed_actions:['KEEP_DISTINCT','MERGE_SAME_PERSON'],
      merge_hard_blocked:hardMergeBlockers.length>0
    }
  };
}

const sourceInput=process.env.VIASNA_SOURCE_FILE;
const outputRootInput=process.env.CHRC_VIASNA_IDENTITY_REVIEW_DIR;
if(!sourceInput)throw new Error('VIASNA_SOURCE_FILE_NOT_CONFIGURED');
if(!outputRootInput)throw new Error('CHRC_VIASNA_IDENTITY_REVIEW_DIR_NOT_CONFIGURED');
const testMode=process.env.CHRC_TEST_MODE==='1';
const repo=await realpath(repoRoot);
const source=await realpath(resolve(sourceInput));
const sourceInfo=await stat(source);
if(!sourceInfo.isFile())throw new Error('VIASNA_IDENTITY_REVIEW_SOURCE_NOT_REGULAR_FILE');
if(sourceInfo.size<=0||sourceInfo.size>MAX_SOURCE_BYTES)throw new Error('VIASNA_IDENTITY_REVIEW_SOURCE_SIZE_INVALID');
if(!testMode&&inside(repo,source))throw new Error('REAL_VIASNA_SOURCE_FILE_INSIDE_PUBLIC_REPO');
const outputRoot=resolve(outputRootInput);
if(!testMode&&inside(repo,outputRoot))throw new Error('VIASNA_IDENTITY_REVIEW_OUTPUT_INSIDE_PUBLIC_REPO');
await mkdir(outputRoot,{recursive:true,mode:0o700});

const raw=await readFile(source);const sourceSha256=sha256(raw);
const expectedSha=String(process.env.VIASNA_EXPECTED_SOURCE_SHA256||'').trim().toLowerCase();
if(expectedSha&&(!/^[a-f0-9]{64}$/.test(expectedSha)||expectedSha!==sourceSha256))throw new Error(`VIASNA_IDENTITY_REVIEW_SOURCE_SHA256_MISMATCH:${sourceSha256}:${expectedSha}`);
const sourcePageUrl=validateViasnaUrl(process.env.VIASNA_SOURCE_PAGE_URL||'https://prisoners.spring96.org/ru/list').href;
const locale=process.env.VIASNA_SOURCE_LOCALE||'ru';
const asOf=process.env.CHRC_AS_OF||new Date().toISOString();
const parsed=parseViasnaCsv(raw.toString('utf8'),{locale,sourceUrl:sourcePageUrl,fetchedAt:asOf,observedAt:asOf});
if(parsed.diagnostics.some(item=>item.code==='CSV_COLUMN_COUNT_MISMATCH'))throw new Error('VIASNA_IDENTITY_REVIEW_COLUMN_MISMATCH');
const anomalies=detectObservationAnomalies(parsed.observations,{asOf});
const groups=collisionComponents(parsed.observations,anomalies);
const expectedComponents=envOptionalInt('VIASNA_EXPECTED_IDENTITY_COMPONENTS');
const expectedRows=envOptionalInt('VIASNA_EXPECTED_IDENTITY_COLLISION_ROWS');
const collisionRows=unique(groups.flatMap(group=>group.ids)).length;
if(expectedComponents!==null&&groups.length!==expectedComponents)throw new Error(`VIASNA_IDENTITY_REVIEW_COMPONENT_COUNT_MISMATCH:${groups.length}:${expectedComponents}`);
if(expectedRows!==null&&collisionRows!==expectedRows)throw new Error(`VIASNA_IDENTITY_REVIEW_ROW_COUNT_MISMATCH:${collisionRows}:${expectedRows}`);

const components=groups.map(reviewComponent);
const hardBlocked=components.filter(item=>item.editorial_gate.merge_hard_blocked).length;
const runId=`viasna-identity-review-${asOf.replace(/[-:.]/g,'')}-${sourceSha256.slice(0,12)}`;
const runDir=join(outputRoot,runId);
await mkdir(runDir,{recursive:false,mode:0o700});

const packet={
  state:'PRIVATE_IDENTITY_REVIEW_REQUIRED',
  version:1,
  source_id:'src-viasna',
  source_sha256:sourceSha256,
  source_page_url:sourcePageUrl,
  prepared_at:asOf,
  parser_version:parsed.parser_version,
  parsed_rows:parsed.observations.length,
  components_total:components.length,
  collision_rows:collisionRows,
  hard_merge_blocked_components:hardBlocked,
  automatic_decisions:0,
  components
};
const template={
  state:'PRIVATE_REVIEW_TEMPLATE_NOT_EXECUTABLE',
  version:1,
  source_id:'src-viasna',
  source_sha256:sourceSha256,
  instructions:{
    action:'Replace null only after human review with KEEP_DISTINCT or MERGE_SAME_PERSON.',
    primary_source_record_id:'Required only for MERGE_SAME_PERSON and must belong to the full component.',
    safety:'Do not merge when hard_merge_blockers is non-empty. Do not split a component across decisions.'
  },
  decisions:components.map(item=>({decision_id:`review-${item.component_id}`,component_id:item.component_id,action:null,source_record_ids:item.source_record_ids,primary_source_record_id:null,reviewer_note:null}))
};
const packetRaw=Buffer.from(JSON.stringify(packet,null,2)+'\n');
const templateRaw=Buffer.from(JSON.stringify(template,null,2)+'\n');
await writeFile(join(runDir,'identity-review-components.json'),packetRaw,{mode:0o600,flag:'wx'});
await writeFile(join(runDir,'identity-resolution.template.json'),templateRaw,{mode:0o600,flag:'wx'});
const receipt={
  state:'PRIVATE_IDENTITY_REVIEW_PACKET_PREPARED_NOT_PUBLISHED',
  version:1,source_id:'src-viasna',source_sha256:sourceSha256,prepared_at:asOf,parsed_rows:parsed.observations.length,
  components_total:components.length,collision_rows:collisionRows,hard_merge_blocked_components:hardBlocked,automatic_decisions:0,
  packet_sha256:sha256(packetRaw),template_sha256:sha256(templateRaw),public_repo_mutated:false,production_published:false,
  next_gate:'HUMAN_PRIVATE_IDENTITY_REVIEW'
};
await writeFile(join(runDir,'IDENTITY_REVIEW_RECEIPT.json'),JSON.stringify(receipt,null,2)+'\n',{encoding:'utf8',mode:0o600,flag:'wx'});

console.log(`VIASNA_IDENTITY_REVIEW_PACKET=PASS state=${receipt.state} rows=${receipt.parsed_rows} components=${receipt.components_total} collision_rows=${receipt.collision_rows} hard_merge_blocked=${receipt.hard_merge_blocked_components} automatic_decisions=0 published=false`);
console.log(`VIASNA_IDENTITY_REVIEW_RUN_DIR=${runDir}`);
