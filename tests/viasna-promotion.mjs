import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseViasnaCsv } from '../scripts/adapters/viasna.mjs';
import { loadViasnaIdentityResolution, validateViasnaIdentityResolution } from '../scripts/lib/viasna-identity-resolution.mjs';
import { promoteViasnaObservations } from '../scripts/lib/viasna-promotion.mjs';

const root=new URL('../',import.meta.url).pathname;
const csv=await readFile(new URL('./fixtures/viasna.synthetic.csv',import.meta.url),'utf8');
const parsed=parseViasnaCsv(csv,{locale:'en',sourceUrl:'https://prisoners.spring96.org/en/list',fetchedAt:'2026-08-29T12:00:00Z',observedAt:'2026-08-29T12:00:00Z'});
const promoted=promoteViasnaObservations(parsed.observations,{asOf:'2026-08-29T12:00:00Z'});
assert.equal(parsed.observations.length,3);
assert.equal(promoted.people.length,3);
assert.equal(promoted.quarantine.count,0);
assert.equal(promoted.review.count,1);
assert.ok(promoted.review.findings.some(x=>x.code==='FUTURE_EVENT_DATE_WITHHELD'&&x.row_number===3&&x.field==='detention_date'));
assert.equal(promoted.people[0].person_id,'p-0000001');
assert.equal(promoted.people[1].person_id,'p-0000002');
assert.equal(promoted.people[2].person_id,'p-0000003');
assert.equal(promoted.people[0].status_events[0].status,'POLITICAL_PRISONER');
assert.equal(promoted.people[0].status_events[0].designation,'SOURCE_ATTRIBUTED');
assert.ok(promoted.people[0].status_events[0].summary.ru.includes('«Вясна»'));
assert.equal(promoted.people[1].status_events[0].status,'FORMER_POLITICAL_PRISONER');
assert.equal(promoted.people[2].status_events[0].status,'REPRESSION_DOCUMENTED');
assert.equal(promoted.counts.political_prisoners_current,1);
assert.equal(promoted.counts.former_political_prisoners,1);
assert.equal(promoted.counts.repressed_total,3);
assert.equal(promoted.prisons.length,1);
assert.equal(promoted.people[0].prison_placements[0].prison_id,promoted.prisons[0].prison_id);
assert.deepEqual(promoted.people[0].birth_date,{value:'1990-01-02',precision:'day'});
assert.deepEqual(promoted.people[0].detentions[0].date,{value:'2026-04',precision:'month'});
assert.deepEqual(promoted.people[0].judgments[0].date,{value:'2026',precision:'year'});
assert.equal(promoted.people[1].detentions.length,0,'future detention date must be withheld');
assert.deepEqual(promoted.people[1].judgments[0].date,{value:'2026-02-24',precision:'day'});
assert.equal(promoted.people[1].release_events.length,1,'release source claim should remain while future detention field is withheld');

const repeat=promoteViasnaObservations(parsed.observations,{existingPeople:promoted.people,asOf:'2026-08-29T12:00:00Z'});
assert.equal(repeat.people[0].person_id,promoted.people[0].person_id);
assert.equal(repeat.people[1].person_id,promoted.people[1].person_id);
assert.equal(repeat.people[2].person_id,promoted.people[2].person_id);
assert.ok(repeat.people.every(p=>/^p-\d{7}$/.test(p.person_id)));

const machineCsv=await readFile(new URL('./fixtures/viasna.machine-export.synthetic.csv',import.meta.url),'utf8');
const machine=parseViasnaCsv(machineCsv,{locale:'ru',sourceUrl:'https://prisoners.spring96.org/ru/list',fetchedAt:'2026-08-30T08:00:00Z',observedAt:'2026-08-30T08:00:00Z'});
const collisionA=structuredClone(machine.observations[0]);
const collisionB=structuredClone(machine.observations[1]);
for(const [observation,id,row,name] of [[collisionA,'91001',201,'Гражданин Тест А.'],[collisionB,'91002',202,'Гражданин Тест Б.']]){
  observation.source_record_id=id;observation.source_identity_key=`src-viasna-record:${id}`;observation.row_number=row;observation.reported_name=name;observation.normalized_name=name.toLocaleLowerCase('ru');
  observation.source_person_url='https://prisoners.spring96.org/ru/person/private-resolution-test';
  observation.birth_date={raw:'',value:null,precision:'unknown',parse_state:'UNKNOWN'};
  observation.gender_raw='';observation.died_raw='';observation.detention_date={raw:'',value:null,precision:'unknown',parse_state:'UNKNOWN'};observation.release_date={raw:'',value:null,precision:'unknown',parse_state:'UNKNOWN'};observation.verdict_date={raw:'',value:null,precision:'unknown',parse_state:'UNKNOWN'};
}
const collisionSourceSha='a'.repeat(64);
const unresolved=promoteViasnaObservations([collisionA,collisionB],{asOf:'2026-08-30T12:00:00Z'});
assert.equal(unresolved.people.length,0);
assert.equal(unresolved.quarantine.count,2,'unresolved identity collision must quarantine every member');

const keepDoc={version:1,source_id:'src-viasna',source_sha256:collisionSourceSha,decisions:[{decision_id:'keep-test',action:'KEEP_DISTINCT',source_record_ids:['91001','91002']}]};
const keepResolution=validateViasnaIdentityResolution(keepDoc,{observations:[collisionA,collisionB],sourceSha256:collisionSourceSha,asOf:'2026-08-30T12:00:00Z'});
assert.equal(keepResolution.components_total,1);assert.equal(keepResolution.resolved_components,1);assert.equal(keepResolution.unresolved_components,0);
const kept=promoteViasnaObservations([collisionA,collisionB],{asOf:'2026-08-30T12:00:00Z',identityResolution:keepResolution});
assert.equal(kept.people.length,2);assert.equal(kept.quarantine.count,0);assert.equal(kept.identity_resolution.keep_distinct_components,1);
assert.notEqual(kept.people[0].person_id,kept.people[1].person_id);

const mergeA=structuredClone(collisionA);const mergeB=structuredClone(collisionB);
mergeA.reported_name='Иван Тестовый';mergeA.normalized_name='иван тестовый';mergeA.birth_date={raw:'1985-04-12',value:'1985-04-12',precision:'day',parse_state:'PARSED'};mergeA.gender_raw='male';
mergeB.reported_name='Иван Тестовый';mergeB.normalized_name='иван тестовый';mergeB.birth_date={raw:'1985-04-12',value:'1985-04-12',precision:'day',parse_state:'PARSED'};mergeB.gender_raw='male';
mergeB.source_status_claim={...mergeB.source_status_claim,claim_type:'FORMER_POLITICAL_PRISONER',source_status_code:'former',human_rights_source_asserts:true,attribution_required:true,auto_designation_allowed:false};
const mergeDoc={version:1,source_id:'src-viasna',source_sha256:collisionSourceSha,decisions:[{decision_id:'merge-test',action:'MERGE_SAME_PERSON',source_record_ids:['91001','91002'],primary_source_record_id:'91002'}]};
const mergeResolution=validateViasnaIdentityResolution(mergeDoc,{observations:[mergeA,mergeB],sourceSha256:collisionSourceSha,asOf:'2026-08-30T12:00:00Z'});
const merged=promoteViasnaObservations([mergeA,mergeB],{asOf:'2026-08-30T12:00:00Z',identityResolution:mergeResolution});
assert.equal(merged.people.length,1);assert.equal(merged.quarantine.count,0);assert.equal(merged.identity_resolution.merge_components,1);
assert.deepEqual(merged.people[0].source_identity_keys.sort(),['src-viasna-record:91001','src-viasna-record:91002']);
assert.equal(merged.people[0].status_events.at(-1).status,'FORMER_POLITICAL_PRISONER','primary source record must determine canonical latest status');
assert.equal(merged.counts.former_political_prisoners,1);

const birthConflict=structuredClone(mergeB);birthConflict.birth_date={raw:'1986-04-12',value:'1986-04-12',precision:'day',parse_state:'PARSED'};
assert.throws(()=>validateViasnaIdentityResolution(mergeDoc,{observations:[mergeA,birthConflict],sourceSha256:collisionSourceSha,asOf:'2026-08-30T12:00:00Z'}),/VIASNA_IDENTITY_MERGE_BIRTH_CONFLICT/);
const collisionC=structuredClone(collisionB);collisionC.source_record_id='91003';collisionC.source_identity_key='src-viasna-record:91003';collisionC.row_number=203;
assert.throws(()=>validateViasnaIdentityResolution(keepDoc,{observations:[collisionA,collisionB,collisionC],sourceSha256:collisionSourceSha,asOf:'2026-08-30T12:00:00Z'}),/VIASNA_IDENTITY_RESOLUTION_PARTIAL_OR_NONCOLLISION_GROUP/);

const work=await mkdtemp(join(tmpdir(),'chudo-viasna-resolution-'));
try{
  const file=join(work,'identity-resolution.json');await writeFile(file,JSON.stringify(keepDoc),'utf8');
  const loaded=await loadViasnaIdentityResolution({file,repoRoot:root,observations:[collisionA,collisionB],sourceSha256:collisionSourceSha,asOf:'2026-08-30T12:00:00Z',testMode:false});
  assert.equal(loaded.resolved_components,1);assert.match(loaded.file_sha256,/^[a-f0-9]{64}$/);
  await assert.rejects(()=>loadViasnaIdentityResolution({file:join(root,'package.json'),repoRoot:root,observations:[collisionA,collisionB],sourceSha256:collisionSourceSha,testMode:false}),/VIASNA_IDENTITY_RESOLUTION_INSIDE_PUBLIC_REPO/);
}finally{await rm(work,{recursive:true,force:true});}

console.log('VIASNA_PROMOTION_TEST=PASS people=3 field_review=1 quarantine=0 stable_ids=PASS source_attribution=PASS partial_dates=PASS private_identity_resolution=PASS fail_closed=PASS');
