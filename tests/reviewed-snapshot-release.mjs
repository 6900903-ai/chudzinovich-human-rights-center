import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { auditReviewedSnapshot } from '../scripts/lib/reviewed-snapshot.mjs';

const root=new URL('../',import.meta.url).pathname;
const temp=await mkdtemp(join(tmpdir(),'chudo-reviewed-snapshot-'));
const source=join(temp,'reviewed');const destination=join(temp,'public-current');
await cp(join(root,'tests','fixtures'),join(temp,'unrelated-fixtures-copy'),{recursive:true});
await import('node:fs/promises').then(fs=>fs.mkdir(source,{recursive:true}));
const sourceDigest='a'.repeat(64);
const timestamp='2026-08-29T18:00:00.000Z';
const person={
  person_id:'p-0000001',canonical_name:{ru:'Тестовая Персона',be:'Тэставая Асоба',en:'Synthetic Person',pl:'Osoba Testowa'},
  aliases:['Тестовая Персона'],source_identity_keys:['synthetic-person-2000'],birth_date:{value:'2000',precision:'year'},
  gender:'UNKNOWN',region:null,photo:null,facts:{},cases:[],detentions:[],charges:[],judgments:[],sentences:[],prison_placements:[],release_events:[],
  status_events:[{event_id:'status-0000001-00001',status:'POLITICAL_PRISONER',state:'ACTIVE',designation:'SOURCE_ATTRIBUTED',effective_date:null,source_id:'src-synthetic',source_url:'https://example.org/person/1',source_published_at:null,source_observed_at:timestamp,human_verified_at:null,recognized_ex_post_facto:false,summary:{ru:'Синтетическая запись.',be:'Сінтэтычны запіс.',en:'Synthetic record.',pl:'Wpis syntetyczny.'}}],
  health_claims:[],risk_assessments:[],sources:[{source_id:'src-synthetic',name:{ru:'Синтетический источник',be:'Сінтэтычная крыніца',en:'Synthetic source',pl:'Źródło syntetyczne'},url:'https://example.org/person/1',published_at:null,observed_at:timestamp,human_verified_at:null}],evidence:[],change_history:[],publication_state:'PUBLIC_SOURCE_ATTRIBUTED'
};
const data={'people.json':[person],'prisons.json':[],'news.json':[],'reports.json':[]};
const files=[];
for(const [name,value] of Object.entries(data)){const bytes=Buffer.from(JSON.stringify(value,null,2)+'\n');await writeFile(join(source,name),bytes);files.push({path:name,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});}
const manifest={snapshot_id:'snap-20260829T180000Z-1234abcd',created_at:timestamp,publication_state:'PUBLISHED',counts:{people:1,political_prisoners_current:1,former_political_prisoners:0,repressed_total:1},source_snapshots:[{source_id:'src-synthetic',observed_at:timestamp,source_manifest_sha256:sourceDigest}],files};
const manifestBytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n');await writeFile(join(source,'manifest.json'),manifestBytes);const manifestDigest=createHash('sha256').update(manifestBytes).digest('hex');

try{
  const audit=await auditReviewedSnapshot(source,{testMode:true,env:{}});
  assert.equal(audit.audit_state,'VALIDATED_PRIVATE_SNAPSHOT');assert.equal(audit.counts.people,1);assert.equal(audit.release_ready,false);assert.equal(audit.controls.public_repo_mutated,false);assert.equal(audit.controls.network_access_used,false);

  const command=[join(root,'scripts','promote-reviewed-snapshot.mjs')];
  const baseEnv={...process.env,CHRC_TEST_MODE:'1',CHRC_REVIEW_SNAPSHOT_DIR:source,CHRC_PUBLIC_DATA_DESTINATION:destination,EXPECTED_SNAPSHOT_ID:manifest.snapshot_id,EXPECTED_MANIFEST_SHA256:manifestDigest,EXPECTED_SOURCE_EXPORT_SHA256:sourceDigest};
  const blocked=spawnSync(process.execPath,command,{cwd:root,env:baseEnv,encoding:'utf8'});assert.notEqual(blocked.status,0);assert.match(blocked.stderr,/REVIEWED_SNAPSHOT_RELEASE_GATES_NOT_PASS/);
  const gateEnv={...baseEnv,LEGAL_DATA_REUSE_GATE:'PASS',PRIVACY_DPIA_GATE:'PASS',EDITORIAL_REVIEW_GATE:'PASS',SOURCE_ATTRIBUTION_GATE:'PASS',IMAGE_RIGHTS_GATE:'PASS',REAL_DATA_RELEASE_AUTHORIZATION:'PASS'};
  const output=execFileSync(process.execPath,command,{cwd:root,env:gateEnv,encoding:'utf8'});assert.match(output,/REVIEWED_SNAPSHOT_PROMOTION=PASS/);
  const installed=await auditReviewedSnapshot(destination,{testMode:true,env:gateEnv});assert.equal(installed.snapshot_id,manifest.snapshot_id);assert.equal(installed.manifest_sha256,manifestDigest);assert.equal(installed.release_ready,true);

  const tampered=join(temp,'tampered');await cp(source,tampered,{recursive:true});const tamperedPeople=JSON.parse(await readFile(join(tampered,'people.json'),'utf8'));tamperedPeople[0].private_phone='+000';await writeFile(join(tampered,'people.json'),JSON.stringify(tamperedPeople,null,2)+'\n');
  await assert.rejects(()=>auditReviewedSnapshot(tampered,{testMode:true,env:{}}),/SNAPSHOT_FILE_SHA_MISMATCH|FORBIDDEN_PRIVATE_OR_EDITORIAL_FIELD/);

  const highRisk=join(temp,'high-risk');await cp(source,highRisk,{recursive:true});const highPeople=JSON.parse(await readFile(join(highRisk,'people.json'),'utf8'));highPeople[0].health_claims=[{event_id:'health-1',source_id:'src-synthetic',source_url:'https://example.org/person/1',publication_state:'PUBLIC_SOURCE_ATTRIBUTED',human_verified_at:null}];
  const highBytes=Buffer.from(JSON.stringify(highPeople,null,2)+'\n');await writeFile(join(highRisk,'people.json'),highBytes);const highManifest=JSON.parse(await readFile(join(highRisk,'manifest.json'),'utf8'));const entry=highManifest.files.find(item=>item.path==='people.json');entry.sha256=createHash('sha256').update(highBytes).digest('hex');entry.bytes=highBytes.length;await writeFile(join(highRisk,'manifest.json'),JSON.stringify(highManifest,null,2)+'\n');
  await assert.rejects(()=>auditReviewedSnapshot(highRisk,{testMode:true,env:{}}),/HIGH_RISK_EVENT_NOT_HUMAN_CONFIRMED/);
  console.log('REVIEWED_SNAPSHOT_RELEASE_TEST=PASS audit=PASS gates=FAIL_CLOSED atomic_promotion=PASS private_field_block=PASS high_risk_block=PASS network=ZERO');
}finally{await rm(temp,{recursive:true,force:true});}
