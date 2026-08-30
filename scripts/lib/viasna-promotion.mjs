import { createHash } from 'node:crypto';
import { detectObservationAnomalies } from './anomaly.mjs';
import { isResolvedIdentityCollision, resolutionDecisionForObservation } from './viasna-identity-resolution.mjs';
import { normalizeForMatch, stableIdentityKey } from './normalization.mjs';

const HIGH = new Set(['HIGH','BLOCK']);

function publicDate(partial){return partial?.parse_state==='PARSED'&&partial.value?{value:partial.value,precision:partial.precision}:null;}
function eventDate(partial,asOf){
  const value=publicDate(partial);if(!value)return null;
  const day=String(asOf).slice(0,10),month=day.slice(0,7),year=day.slice(0,4);
  const future=value.precision==='day'?value.value>day:value.precision==='month'?value.value>month:value.precision==='year'?value.value>year:false;
  return future?null:value;
}
function localized(value){const clean=String(value||'').trim();return {ru:clean,be:clean,en:clean,pl:clean};}
function gender(value){const n=normalizeForMatch(value);if(['male','мужчина','мужской','мужчына'].includes(n))return 'MALE';if(['female','женщина','женский','жанчына'].includes(n))return 'FEMALE';return 'UNKNOWN';}
function idNum(id){const m=String(id||'').match(/^p-(\d{7})$/);return m?Number(m[1]):0;}
function prisonId(facility,address=''){const key=normalizeForMatch(`${facility}|${address}`);return `pr-${createHash('sha256').update(key).digest('hex').slice(0,12)}`;}
function eventId(prefix,personId,row){return `${prefix}-${personId.slice(2)}-${String(row).padStart(5,'0')}`;}
function obsUrl(observation){return observation.source_person_url||observation.source_url;}
function observationKey(observation){const id=String(observation.source_record_id||'').trim();return id||`row:${observation.row_number}`;}
function unique(values){return [...new Set(values.filter(Boolean))];}

function statusSummary(type){
  if(type==='CURRENT_POLITICAL_PRISONER')return {ru:'Признан политзаключённым по данным Правозащитного центра «Вясна».',be:'Прызнаны палітвязнем паводле Праваабарончага цэнтра «Вясна».',en:'Recognized as a political prisoner according to Human Rights Center Viasna.',pl:'Uznany za więźnia politycznego według Centrum Praw Człowieka Viasna.'};
  if(type==='FORMER_POLITICAL_PRISONER')return {ru:'Указан как бывший политзаключённый по данным Правозащитного центра «Вясна».',be:'Пазначаны як былы палітвязень паводле Праваабарончага цэнтра «Вясна».',en:'Listed as a former political prisoner according to Human Rights Center Viasna.',pl:'Wskazany jako były więzień polityczny według Centrum Praw Człowieka Viasna.'};
  return {ru:'Запись о политически мотивированном преследовании по данным Правозащитного центра «Вясна».',be:'Запіс пра палітычна матываваны пераслед паводле Праваабарончага цэнтра «Вясна».',en:'Record of politically motivated repression according to Human Rights Center Viasna.',pl:'Wpis o represjach motywowanych politycznie według Centrum Praw Człowieka Viasna.'};
}

function statusValue(type){if(type==='CURRENT_POLITICAL_PRISONER')return 'POLITICAL_PRISONER';if(type==='FORMER_POLITICAL_PRISONER')return 'FORMER_POLITICAL_PRISONER';return 'REPRESSION_DOCUMENTED';}
function sourceRecord(observation){return {source_id:'src-viasna',name:{ru:'Правозащитный центр «Вясна»',be:'Праваабарончы цэнтр «Вясна»',en:'Human Rights Center Viasna',pl:'Centrum Praw Człowieka Viasna'},url:obsUrl(observation),published_at:null,observed_at:observation.source_observed_at,human_verified_at:null};}
function fact(value,observation){return {value,source_id:'src-viasna',source_url:obsUrl(observation),source_published_at:null,source_observed_at:observation.source_observed_at,source_fetched_at:observation.source_fetched_at,human_verified_at:null,confidence:'SOURCE_ATTRIBUTED',publication_state:'PUBLIC_SOURCE_ATTRIBUTED'};}

export function partitionViasnaObservations(observations,{asOf=new Date().toISOString(),identityResolution=null}={}){
  const anomalies=detectObservationAnomalies(observations,{asOf});
  const effectiveAnomalies=anomalies.filter(item=>!isResolvedIdentityCollision(item,identityResolution));
  const blockedRows=new Set(effectiveAnomalies.filter(x=>HIGH.has(x.severity)&&Number.isInteger(x.row_number)).map(x=>x.row_number));
  return {
    clean:observations.filter(x=>!blockedRows.has(x.row_number)),
    quarantined:observations.filter(x=>blockedRows.has(x.row_number)),
    anomalies:effectiveAnomalies,
    raw_anomalies:anomalies,
    resolved_identity_findings:anomalies.filter(item=>isResolvedIdentityCollision(item,identityResolution)),
    blocked_rows:[...blockedRows].sort((a,b)=>a-b)
  };
}

function identityMap(existingPeople){
  const out=new Map();
  for(const person of existingPeople||[]){
    for(const key of person.source_identity_keys||[])if(key)out.set(key,person.person_id);
    const ru=person.canonical_name?.ru||person.canonical_name?.be||person.canonical_name?.en||'';
    if(ru){const birth=person.birth_date?{value:person.birth_date.value}:null;out.set(stableIdentityKey({name:ru,birthDate:birth}),person.person_id);}
  }
  return out;
}

function identityFor(observation){return observation.source_identity_key||stableIdentityKey({name:observation.reported_name,birthDate:observation.birth_date});}

function personIdForGroup(group,known,nextRef){
  const identities=unique(group.map(identityFor));
  const knownIds=unique(identities.map(key=>known.get(key)));
  if(knownIds.length>1)throw new Error(`VIASNA_IDENTITY_RESOLUTION_EXISTING_PERSON_CONFLICT:${knownIds.join(':')}`);
  const personId=knownIds[0]||`p-${String(nextRef.value++).padStart(7,'0')}`;
  for(const key of identities)known.set(key,personId);
  return {personId,identities};
}

function appendObservation(person,observation,prisonsById,asOf){
  const detDate=eventDate(observation.detention_date,asOf);const verdictDate=eventDate(observation.verdict_date,asOf);const releaseDate=eventDate(observation.release_date,asOf);
  const type=observation.source_status_claim?.claim_type||'NO_DESIGNATION';const status=statusValue(type);const sourceUrl=obsUrl(observation);
  if(detDate)person.detentions.push({event_id:eventId('det',person.person_id,observation.row_number),date:detDate,summary:{ru:'Дата задержания по данным «Вясны».',be:'Дата затрымання паводле «Вясны».',en:'Detention date according to Viasna.',pl:'Data zatrzymania według Viasny.'},location:null,source_id:'src-viasna',source_url:sourceUrl,source_observed_at:observation.source_observed_at,state:'ACTIVE'});
  if((observation.charge_articles||[]).length||observation.charges_raw)person.charges.push({event_id:eventId('charge',person.person_id,observation.row_number),articles:observation.charge_articles||[],summary:localized(observation.charges_raw||''),source_id:'src-viasna',source_url:sourceUrl,source_observed_at:observation.source_observed_at,state:'ACTIVE'});
  if(verdictDate||observation.judge_raw||observation.prosecutor_raw)person.judgments.push({event_id:eventId('jud',person.person_id,observation.row_number),date:verdictDate,verdict:localized(observation.sentence_raw||observation.penalty_raw||''),judge:observation.judge_raw||null,prosecutor:observation.prosecutor_raw||null,source_id:'src-viasna',source_url:sourceUrl,source_observed_at:observation.source_observed_at,state:'ACTIVE'});
  if(observation.sentence_raw||observation.penalty_raw)person.sentences.push({event_id:eventId('sen',person.person_id,observation.row_number),date:verdictDate,value:localized([observation.sentence_raw,observation.penalty_raw].filter(Boolean).join(' · ')),source_id:'src-viasna',source_url:sourceUrl,source_observed_at:observation.source_observed_at,state:'ACTIVE'});
  if(observation.prison?.facility){const pid=prisonId(observation.prison.facility,observation.prison.address);const prison={prison_id:pid,name:localized(observation.prison.facility),address:localized(observation.prison.address||''),source_id:'src-viasna',source_url:sourceUrl,publication_state:'PUBLIC_SOURCE_ATTRIBUTED'};prisonsById.set(pid,prison);person.prison_placements.push({event_id:eventId('place',person.person_id,observation.row_number),started_at:verdictDate||detDate,current:status==='POLITICAL_PRISONER'&&!releaseDate&&!observation.release_claim,prison_id:pid,prison_name:localized(observation.prison.facility),source_id:'src-viasna',source_url:sourceUrl,source_observed_at:observation.source_observed_at,state:'ACTIVE'});}
  if(releaseDate||observation.release_claim)person.release_events.push({event_id:eventId('rel',person.person_id,observation.row_number),date:releaseDate,summary:{ru:'Источник указывает, что человек освобождён.',be:'Крыніца пазначае, што чалавек вызвалены.',en:'The source lists the person as released.',pl:'Źródło wskazuje, że osoba została zwolniona.'},source_id:'src-viasna',source_url:sourceUrl,source_observed_at:observation.source_observed_at,state:'ACTIVE'});
  person.status_events.push({event_id:eventId('status',person.person_id,observation.row_number),status,state:'ACTIVE',designation:'SOURCE_ATTRIBUTED',effective_date:null,source_id:'src-viasna',source_url:sourceUrl,source_published_at:null,source_observed_at:observation.source_observed_at,human_verified_at:null,recognized_ex_post_facto:Boolean(observation.source_status_claim?.recognized_ex_post_facto),summary:statusSummary(type)});
}

function buildPerson(group,primary,personId,identities,prisonsById,asOf){
  const birth=publicDate(primary.birth_date);
  const resolvedGender=gender(primary.gender_raw)!=='UNKNOWN'?gender(primary.gender_raw):(group.map(item=>gender(item.gender_raw)).find(value=>value!=='UNKNOWN')||'UNKNOWN');
  const person={person_id:personId,canonical_name:localized(primary.reported_name),aliases:unique(group.map(item=>String(item.reported_name||'').trim())),source_identity_keys:identities,birth_date:birth,gender:resolvedGender,region:null,photo:null,facts:{},cases:[],detentions:[],charges:[],judgments:[],sentences:[],prison_placements:[],release_events:[],status_events:[],health_claims:[],risk_assessments:[],sources:[sourceRecord(primary)],evidence:[],change_history:[],publication_state:'PUBLIC_SOURCE_ATTRIBUTED'};
  if(birth)person.facts.birth_date=fact(birth,primary);
  const ordered=[...group.filter(item=>item!==primary),primary];
  for(const observation of ordered)appendObservation(person,observation,prisonsById,asOf);
  return person;
}

export function promoteViasnaObservations(observations,{existingPeople=[],asOf=new Date().toISOString(),identityResolution=null}={}){
  const partition=partitionViasnaObservations(observations,{asOf,identityResolution});
  const known=identityMap(existingPeople);const nextRef={value:Math.max(0,...(existingPeople||[]).map(x=>idNum(x.person_id)))+1};
  const cleanById=new Map(partition.clean.map(item=>[String(item.source_record_id||''),item]).filter(([id])=>id));
  const people=[];const prisonsById=new Map();const consumed=new Set();
  for(const observation of partition.clean){
    const key=observationKey(observation);if(consumed.has(key))continue;
    const decision=resolutionDecisionForObservation(observation,identityResolution);
    let group=[observation];let primary=observation;
    if(decision?.action==='MERGE_SAME_PERSON'){
      group=decision.source_record_ids.map(id=>cleanById.get(id));
      if(group.some(item=>!item))throw new Error(`VIASNA_IDENTITY_MERGE_MEMBER_QUARANTINED:${decision.decision_id}`);
      primary=cleanById.get(decision.primary_source_record_id);
      if(!primary)throw new Error(`VIASNA_IDENTITY_MERGE_PRIMARY_QUARANTINED:${decision.decision_id}`);
    }
    for(const item of group)consumed.add(observationKey(item));
    if(!primary.reported_name)continue;
    const {personId,identities}=personIdForGroup(group,known,nextRef);
    people.push(buildPerson(group,primary,personId,identities,prisonsById,asOf));
  }
  const current=people.filter(p=>p.status_events.at(-1)?.status==='POLITICAL_PRISONER').length;
  const former=people.filter(p=>p.status_events.at(-1)?.status==='FORMER_POLITICAL_PRISONER').length;
  const reviewFindings=partition.anomalies.filter(x=>x.severity==='REVIEW');
  const resolutionSummary=identityResolution?{components_total:identityResolution.components_total,resolved_components:identityResolution.resolved_components,unresolved_components:identityResolution.unresolved_components,resolved_rows:identityResolution.resolved_rows,unresolved_rows:identityResolution.unresolved_rows,keep_distinct_components:identityResolution.keep_distinct_components,merge_components:identityResolution.merge_components,resolved_collision_findings:partition.resolved_identity_findings.length}:null;
  return {people,prisons:[...prisonsById.values()].sort((a,b)=>a.prison_id.localeCompare(b.prison_id)),counts:{people:people.length,political_prisoners_current:current,former_political_prisoners:former,repressed_total:people.length},quarantine:{rows:partition.blocked_rows,count:partition.quarantined.length,anomalies:partition.anomalies.filter(x=>HIGH.has(x.severity))},review:{count:reviewFindings.length,findings:reviewFindings},identity_resolution:resolutionSummary,diagnostics:partition.anomalies.filter(x=>!HIGH.has(x.severity)&&x.severity!=='REVIEW')};
}
