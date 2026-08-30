import { createHash } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { detectObservationAnomalies } from './anomaly.mjs';
import { normalizeForMatch } from './normalization.mjs';

const VERSION=1;
const ACTIONS=new Set(['KEEP_DISTINCT','MERGE_SAME_PERSON']);
const COLLISION_CODES=new Set(['SOURCE_PERSON_URL_IDENTITY_COLLISION','STRONG_PERSON_SIGNATURE_COLLISION']);

function inside(parent,child){const rel=relative(parent,child);return rel===''||(!rel.startsWith('..'+sep)&&rel!=='..'&&!isAbsolute(rel));}
function sha256(data){return createHash('sha256').update(data).digest('hex');}
function idsKey(ids){return [...ids].map(String).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).join('|');}
function sourceIds(group){return [...new Set(group.map(item=>String(item.source_record_id||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));}
function parsedDayBirth(observation){const birth=observation.birth_date;return birth?.parse_state==='PARSED'&&birth.precision==='day'&&birth.value?birth.value:null;}
function knownGender(observation){const value=normalizeForMatch(observation.gender_raw);if(['male','мужчина','мужской','мужчына'].includes(value))return'MALE';if(['female','женщина','женский','жанчына'].includes(value))return'FEMALE';return null;}

function collisionComponents(observations,{asOf=new Date().toISOString()}={}){
  const anomalies=detectObservationAnomalies(observations,{asOf}).filter(item=>COLLISION_CODES.has(item.code));
  const parent=new Map();
  const find=id=>{if(!parent.has(id))parent.set(id,id);const p=parent.get(id);if(p===id)return id;const root=find(p);parent.set(id,root);return root;};
  const union=(a,b)=>{const ra=find(a),rb=find(b);if(ra!==rb)parent.set(rb,ra);};
  for(const anomaly of anomalies){
    const ids=(anomaly.source_record_ids||[]).map(String).filter(Boolean);
    if(ids.length<2)continue;
    for(const id of ids)find(id);
    for(let i=1;i<ids.length;i++)union(ids[0],ids[i]);
  }
  const groups=new Map();
  for(const id of parent.keys()){const root=find(id);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(id);}
  return [...groups.values()].map(ids=>ids.sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))).sort((a,b)=>idsKey(a).localeCompare(idsKey(b)));
}

function validateMergeDecision(decision, observationsById){
  const group=decision.source_record_ids.map(id=>observationsById.get(id));
  const births=[...new Set(group.map(parsedDayBirth).filter(Boolean))];
  if(births.length>1)throw new Error(`VIASNA_IDENTITY_MERGE_BIRTH_CONFLICT:${decision.decision_id}`);
  const genders=[...new Set(group.map(knownGender).filter(Boolean))];
  if(genders.length>1)throw new Error(`VIASNA_IDENTITY_MERGE_GENDER_CONFLICT:${decision.decision_id}`);
  if(!decision.primary_source_record_id||!decision.source_record_ids.includes(decision.primary_source_record_id))throw new Error(`VIASNA_IDENTITY_MERGE_PRIMARY_INVALID:${decision.decision_id}`);
}

export function validateViasnaIdentityResolution(document,{observations,sourceSha256,asOf=new Date().toISOString()}={}){
  if(!document||typeof document!=='object'||Array.isArray(document))throw new Error('VIASNA_IDENTITY_RESOLUTION_DOCUMENT_INVALID');
  if(document.version!==VERSION)throw new Error(`VIASNA_IDENTITY_RESOLUTION_VERSION_UNSUPPORTED:${document.version}`);
  if(document.source_id!=='src-viasna')throw new Error(`VIASNA_IDENTITY_RESOLUTION_SOURCE_INVALID:${document.source_id||'missing'}`);
  const digest=String(document.source_sha256||'').toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(digest))throw new Error('VIASNA_IDENTITY_RESOLUTION_SOURCE_SHA256_INVALID');
  if(sourceSha256&&digest!==String(sourceSha256).toLowerCase())throw new Error(`VIASNA_IDENTITY_RESOLUTION_SOURCE_SHA256_MISMATCH:${digest}:${String(sourceSha256).toLowerCase()}`);
  if(!Array.isArray(document.decisions))throw new Error('VIASNA_IDENTITY_RESOLUTION_DECISIONS_INVALID');

  const observationsById=new Map();
  for(const observation of observations||[]){const id=String(observation.source_record_id||'').trim();if(id)observationsById.set(id,observation);}
  const components=collisionComponents(observations||[],{asOf});
  const componentsByKey=new Map(components.map(ids=>[idsKey(ids),ids]));
  const componentForId=new Map();for(const ids of components)for(const id of ids)componentForId.set(id,ids);
  const usedIds=new Set();const usedDecisionIds=new Set();const decisions=[];

  for(let index=0;index<document.decisions.length;index++){
    const raw=document.decisions[index];
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error(`VIASNA_IDENTITY_RESOLUTION_DECISION_INVALID:${index}`);
    const decisionId=String(raw.decision_id||`decision-${index+1}`).trim();
    if(!decisionId||usedDecisionIds.has(decisionId))throw new Error(`VIASNA_IDENTITY_RESOLUTION_DECISION_ID_INVALID:${decisionId||index}`);usedDecisionIds.add(decisionId);
    const action=String(raw.action||'').trim().toUpperCase();if(!ACTIONS.has(action))throw new Error(`VIASNA_IDENTITY_RESOLUTION_ACTION_INVALID:${decisionId}:${action||'missing'}`);
    if(!Array.isArray(raw.source_record_ids)||raw.source_record_ids.length<2)throw new Error(`VIASNA_IDENTITY_RESOLUTION_RECORD_IDS_INVALID:${decisionId}`);
    const ids=[...new Set(raw.source_record_ids.map(value=>String(value).trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
    if(ids.length!==raw.source_record_ids.length)throw new Error(`VIASNA_IDENTITY_RESOLUTION_RECORD_IDS_DUPLICATE:${decisionId}`);
    for(const id of ids){if(!observationsById.has(id))throw new Error(`VIASNA_IDENTITY_RESOLUTION_RECORD_NOT_FOUND:${decisionId}:${id}`);if(usedIds.has(id))throw new Error(`VIASNA_IDENTITY_RESOLUTION_RECORD_REUSED:${decisionId}:${id}`);usedIds.add(id);}
    const component=componentForId.get(ids[0]);if(!component||idsKey(component)!==idsKey(ids)||!componentsByKey.has(idsKey(ids)))throw new Error(`VIASNA_IDENTITY_RESOLUTION_PARTIAL_OR_NONCOLLISION_GROUP:${decisionId}`);
    const decision={decision_id:decisionId,action,source_record_ids:ids,primary_source_record_id:raw.primary_source_record_id?String(raw.primary_source_record_id).trim():null};
    if(action==='MERGE_SAME_PERSON')validateMergeDecision(decision,observationsById);
    else if(decision.primary_source_record_id)throw new Error(`VIASNA_IDENTITY_RESOLUTION_PRIMARY_FOR_KEEP_DISTINCT:${decisionId}`);
    decisions.push(decision);
  }

  const resolvedRecordIds=new Set(decisions.flatMap(item=>item.source_record_ids));
  const decisionByRecordId=new Map();for(const decision of decisions)for(const id of decision.source_record_ids)decisionByRecordId.set(id,decision);
  const resolvedComponents=decisions.length;
  const unresolvedComponents=components.length-resolvedComponents;
  const unresolvedRecordIds=components.flatMap(ids=>ids).filter(id=>!resolvedRecordIds.has(id));
  return{
    version:VERSION,source_id:'src-viasna',source_sha256:digest,decisions,
    decision_by_record_id:decisionByRecordId,resolved_record_ids:resolvedRecordIds,
    components_total:components.length,resolved_components:resolvedComponents,unresolved_components:unresolvedComponents,
    resolved_rows:resolvedRecordIds.size,unresolved_rows:unresolvedRecordIds.length,
    keep_distinct_components:decisions.filter(item=>item.action==='KEEP_DISTINCT').length,
    merge_components:decisions.filter(item=>item.action==='MERGE_SAME_PERSON').length
  };
}

export async function loadViasnaIdentityResolution({file,repoRoot,observations,sourceSha256,asOf=new Date().toISOString(),testMode=false}={}){
  if(!file)return null;
  const resolvedFile=await realpath(resolve(file));
  const info=await stat(resolvedFile);if(!info.isFile())throw new Error('VIASNA_IDENTITY_RESOLUTION_NOT_REGULAR_FILE');
  if(!testMode&&repoRoot){const repo=await realpath(repoRoot);if(inside(repo,resolvedFile))throw new Error('VIASNA_IDENTITY_RESOLUTION_INSIDE_PUBLIC_REPO');}
  const raw=await readFile(resolvedFile);if(!raw.byteLength)throw new Error('VIASNA_IDENTITY_RESOLUTION_EMPTY');if(raw.byteLength>1024*1024)throw new Error('VIASNA_IDENTITY_RESOLUTION_TOO_LARGE');
  let document;try{document=JSON.parse(raw.toString('utf8'));}catch{throw new Error('VIASNA_IDENTITY_RESOLUTION_JSON_INVALID');}
  const compiled=validateViasnaIdentityResolution(document,{observations,sourceSha256,asOf});
  return{...compiled,file_sha256:sha256(raw)};
}

export function isResolvedIdentityCollision(anomaly,resolution){
  if(!resolution||!COLLISION_CODES.has(anomaly?.code)||!Number.isInteger(anomaly?.row_number))return false;
  const ids=(anomaly.source_record_ids||[]).map(String);
  if(!ids.length)return false;
  return ids.every(id=>resolution.resolved_record_ids.has(id));
}

export function resolutionDecisionForObservation(observation,resolution){
  if(!resolution)return null;
  return resolution.decision_by_record_id.get(String(observation.source_record_id||''))||null;
}
