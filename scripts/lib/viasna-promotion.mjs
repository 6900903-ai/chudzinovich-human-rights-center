import { createHash } from 'node:crypto';
import { detectObservationAnomalies } from './anomaly.mjs';
import { normalizeForMatch, stableIdentityKey } from './normalization.mjs';

const HIGH = new Set(['HIGH','BLOCK']);

function publicDate(partial){return partial?.parse_state==='PARSED'&&partial.value?{value:partial.value,precision:partial.precision}:null;}
function localized(value){const clean=String(value||'').trim();return {ru:clean,be:clean,en:clean,pl:clean};}
function gender(value){const n=normalizeForMatch(value);if(['male','мужчина','мужской','мужчына'].includes(n))return 'MALE';if(['female','женщина','женский','жанчына'].includes(n))return 'FEMALE';return 'UNKNOWN';}
function idNum(id){const m=String(id||'').match(/^p-(\d{7})$/);return m?Number(m[1]):0;}
function prisonId(facility,address=''){const key=normalizeForMatch(`${facility}|${address}`);return `pr-${createHash('sha256').update(key).digest('hex').slice(0,12)}`;}
function eventId(prefix,personId,row){return `${prefix}-${personId.slice(2)}-${String(row).padStart(5,'0')}`;}

function statusSummary(type){
  if(type==='CURRENT_POLITICAL_PRISONER')return {ru:'Признан политзаключённым по данным Правозащитного центра «Вясна».',be:'Прызнаны палітвязнем паводле Праваабарончага цэнтра «Вясна».',en:'Recognized as a political prisoner according to Human Rights Center Viasna.',pl:'Uznany za więźnia politycznego według Centrum Praw Człowieka Viasna.'};
  if(type==='FORMER_POLITICAL_PRISONER')return {ru:'Указан как бывший политзаключённый по данным Правозащитного центра «Вясна».',be:'Пазначаны як былы палітвязень паводле Праваабарончага цэнтра «Вясна».',en:'Listed as a former political prisoner according to Human Rights Center Viasna.',pl:'Wskazany jako były więzień polityczny według Centrum Praw Człowieka Viasna.'};
  return {ru:'Запись о политически мотивированном преследовании по данным Правозащитного центра «Вясна».',be:'Запіс пра палітычна матываваны пераслед паводле Праваабарончага цэнтра «Вясна».',en:'Record of politically motivated repression according to Human Rights Center Viasna.',pl:'Wpis o represjach motywowanych politycznie według Centrum Praw Człowieka Viasna.'};
}

function statusValue(type){if(type==='CURRENT_POLITICAL_PRISONER')return 'POLITICAL_PRISONER';if(type==='FORMER_POLITICAL_PRISONER')return 'FORMER_POLITICAL_PRISONER';return 'REPRESSION_DOCUMENTED';}
function sourceRecord(observation){return {source_id:'src-viasna',name:{ru:'Правозащитный центр «Вясна»',be:'Праваабарончы цэнтр «Вясна»',en:'Human Rights Center Viasna',pl:'Centrum Praw Człowieka Viasna'},url:observation.source_url,published_at:null,observed_at:observation.source_observed_at,human_verified_at:null};}
function fact(value,observation){return {value,source_id:'src-viasna',source_url:observation.source_url,source_published_at:null,source_observed_at:observation.source_observed_at,source_fetched_at:observation.source_fetched_at,human_verified_at:null,confidence:'SOURCE_ATTRIBUTED',publication_state:'PUBLIC_SOURCE_ATTRIBUTED'};}

export function partitionViasnaObservations(observations,{asOf=new Date().toISOString()}={}){
  const anomalies=detectObservationAnomalies(observations,{asOf});
  const blockedRows=new Set(anomalies.filter(x=>HIGH.has(x.severity)&&Number.isInteger(x.row_number)).map(x=>x.row_number));
  return {clean:observations.filter(x=>!blockedRows.has(x.row_number)),quarantined:observations.filter(x=>blockedRows.has(x.row_number)),anomalies,blocked_rows:[...blockedRows].sort((a,b)=>a-b)};
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

export function promoteViasnaObservations(observations,{existingPeople=[],asOf=new Date().toISOString()}={}){
  const partition=partitionViasnaObservations(observations,{asOf});
  const known=identityMap(existingPeople);
  let next=Math.max(0,...(existingPeople||[]).map(x=>idNum(x.person_id)))+1;
  const people=[];const prisonsById=new Map();
  for(const observation of partition.clean){
    if(!observation.reported_name)continue;
    const identity=observation.source_identity_key||stableIdentityKey({name:observation.reported_name,birthDate:observation.birth_date});
    let personId=known.get(identity);if(!personId){personId=`p-${String(next++).padStart(7,'0')}`;known.set(identity,personId);}
    const birth=publicDate(observation.birth_date);
    const type=observation.source_status_claim?.claim_type||'NO_DESIGNATION';
    const status=statusValue(type);
    const detDate=publicDate(observation.detention_date);const verdictDate=publicDate(observation.verdict_date);
    const person={person_id:personId,canonical_name:localized(observation.reported_name),aliases:[observation.reported_name],source_identity_keys:[identity],birth_date:birth,gender:gender(observation.gender_raw),region:null,photo:null,facts:{},cases:[],detentions:[],charges:[],judgments:[],sentences:[],prison_placements:[],release_events:[],status_events:[],health_claims:[],risk_assessments:[],sources:[sourceRecord(observation)],evidence:[],change_history:[],publication_state:'PUBLIC_SOURCE_ATTRIBUTED'};
    if(birth)person.facts.birth_date=fact(birth,observation);
    if(detDate)person.detentions.push({event_id:eventId('det',personId,observation.row_number),date:detDate,summary:{ru:'Дата задержания по данным «Вясны».',be:'Дата затрымання паводле «Вясны».',en:'Detention date according to Viasna.',pl:'Data zatrzymania według Viasny.'},location:null,source_id:'src-viasna',source_url:observation.source_url,source_observed_at:observation.source_observed_at,state:'ACTIVE'});
    if((observation.charge_articles||[]).length||observation.charges_raw)person.charges.push({event_id:eventId('charge',personId,observation.row_number),articles:observation.charge_articles||[],summary:localized(observation.charges_raw||''),source_id:'src-viasna',source_url:observation.source_url,source_observed_at:observation.source_observed_at,state:'ACTIVE'});
    if(verdictDate||observation.judge_raw||observation.prosecutor_raw)person.judgments.push({event_id:eventId('jud',personId,observation.row_number),date:verdictDate,verdict:localized(observation.sentence_raw||observation.penalty_raw||''),judge:observation.judge_raw||null,prosecutor:observation.prosecutor_raw||null,source_id:'src-viasna',source_url:observation.source_url,source_observed_at:observation.source_observed_at,state:'ACTIVE'});
    if(observation.sentence_raw||observation.penalty_raw)person.sentences.push({event_id:eventId('sen',personId,observation.row_number),date:verdictDate,value:localized([observation.sentence_raw,observation.penalty_raw].filter(Boolean).join(' · ')),source_id:'src-viasna',source_url:observation.source_url,source_observed_at:observation.source_observed_at,state:'ACTIVE'});
    if(observation.prison?.facility){const pid=prisonId(observation.prison.facility,observation.prison.address);const prison={prison_id:pid,name:localized(observation.prison.facility),address:localized(observation.prison.address||''),source_id:'src-viasna',source_url:observation.source_url,publication_state:'PUBLIC_SOURCE_ATTRIBUTED'};prisonsById.set(pid,prison);person.prison_placements.push({event_id:eventId('place',personId,observation.row_number),started_at:verdictDate||detDate,current:true,prison_id:pid,prison_name:localized(observation.prison.facility),source_id:'src-viasna',source_url:observation.source_url,source_observed_at:observation.source_observed_at,state:'ACTIVE'});}
    if(observation.release_claim)person.release_events.push({event_id:eventId('rel',personId,observation.row_number),date:null,summary:{ru:'Источник указывает, что человек освобождён.',be:'Крыніца пазначае, што чалавек вызвалены.',en:'The source lists the person as released.',pl:'Źródło wskazuje, że osoba została zwolniona.'},source_id:'src-viasna',source_url:observation.source_url,source_observed_at:observation.source_observed_at,state:'ACTIVE'});
    person.status_events.push({event_id:eventId('status',personId,observation.row_number),status,state:'ACTIVE',designation:'SOURCE_ATTRIBUTED',effective_date:null,source_id:'src-viasna',source_url:observation.source_url,source_published_at:null,source_observed_at:observation.source_observed_at,human_verified_at:null,recognized_ex_post_facto:Boolean(observation.source_status_claim?.recognized_ex_post_facto),summary:statusSummary(type)});
    people.push(person);
  }
  const current=people.filter(p=>p.status_events[0]?.status==='POLITICAL_PRISONER').length;
  const former=people.filter(p=>p.status_events[0]?.status==='FORMER_POLITICAL_PRISONER').length;
  return {people,prisons:[...prisonsById.values()].sort((a,b)=>a.prison_id.localeCompare(b.prison_id)),counts:{people:people.length,political_prisoners_current:current,former_political_prisoners:former,repressed_total:people.length},quarantine:{rows:partition.blocked_rows,count:partition.quarantined.length,anomalies:partition.anomalies.filter(x=>HIGH.has(x.severity))},diagnostics:partition.anomalies.filter(x=>!HIGH.has(x.severity))};
}
