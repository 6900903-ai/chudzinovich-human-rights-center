import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseViasnaCsv } from '../scripts/adapters/viasna.mjs';
import { validateViasnaIdentityResolution } from '../scripts/lib/viasna-identity-resolution.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const work=await mkdtemp(join(tmpdir(),'chudo-viasna-identity-review-'));
const source=join(work,'viasna-collisions.csv');
const output=join(work,'review');
const headers=['id','url','name','status','gender','photo','description','birthday','arrested','articles','prison','declaration','decision','penalty','judge','councel','penalty_start_date','release_date','verdict_date','appeal_date','fake_terrorist_list','died','clusters'];
const q=value=>{const s=String(value??'');return /[",\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s;};
const row=values=>headers.map(header=>q(values[header]??'')).join(',');
const csv=[headers.join(','),
  row({id:'101',url:'https://prisoners.spring96.org/ru/person/one',name:'Alpha Person',status:'np',gender:'Male',birthday:'1980-01-01'}),
  row({id:'102',url:'https://prisoners.spring96.org/ru/person/one',name:'Alpha Person',status:'np',gender:'Male',birthday:'1981-01-01'}),
  row({id:'201',url:'https://prisoners.spring96.org/ru/person/two-a',name:'Beta Person',status:'former',gender:'Female',birthday:'1990-03-04'}),
  row({id:'202',url:'https://prisoners.spring96.org/ru/person/two-b',name:'Beta Person',status:'former',gender:'Female',birthday:'1990-03-04'}),
  row({id:'301',url:'https://prisoners.spring96.org/ru/person/three',name:'Generic One',status:'np',gender:'Male'}),
  row({id:'302',url:'https://prisoners.spring96.org/ru/person/three',name:'Generic Two',status:'np',gender:'Male'}),
  row({id:'401',url:'https://prisoners.spring96.org/ru/person/unique',name:'Unique Person',status:'active',gender:'Male',birthday:'1975-02-02'})
].join('\n')+'\n';
await writeFile(source,csv,'utf8');

try{
  const run=spawnSync(process.execPath,[join(root,'scripts/export-viasna-identity-review-packet.mjs')],{
    encoding:'utf8',
    env:{...process.env,CHRC_TEST_MODE:'1',VIASNA_SOURCE_FILE:source,CHRC_VIASNA_IDENTITY_REVIEW_DIR:output,VIASNA_EXPECTED_IDENTITY_COMPONENTS:'3',VIASNA_EXPECTED_IDENTITY_COLLISION_ROWS:'6',CHRC_AS_OF:'2026-08-30T16:00:00.000Z'}
  });
  assert.equal(run.status,0,run.stderr||run.stdout);
  assert.match(run.stdout,/VIASNA_IDENTITY_REVIEW_PACKET=PASS/);
  assert.match(run.stdout,/components=3 collision_rows=6 hard_merge_blocked=1 automatic_decisions=0 published=false/);
  const runDir=run.stdout.match(/VIASNA_IDENTITY_REVIEW_RUN_DIR=(.+)/)?.[1]?.trim();
  assert.ok(runDir);
  const packet=JSON.parse(await readFile(join(runDir,'identity-review-components.json'),'utf8'));
  const template=JSON.parse(await readFile(join(runDir,'identity-resolution.template.json'),'utf8'));
  const receipt=JSON.parse(await readFile(join(runDir,'IDENTITY_REVIEW_RECEIPT.json'),'utf8'));
  assert.equal(packet.state,'PRIVATE_IDENTITY_REVIEW_REQUIRED');
  assert.equal(packet.components_total,3);
  assert.equal(packet.collision_rows,6);
  assert.equal(packet.hard_merge_blocked_components,1);
  assert.equal(packet.automatic_decisions,0);
  assert.equal(template.state,'PRIVATE_REVIEW_TEMPLATE_NOT_EXECUTABLE');
  assert.equal(template.decisions.length,3);
  assert.ok(template.decisions.every(item=>item.action===null&&item.primary_source_record_id===null));
  assert.equal(receipt.state,'PRIVATE_IDENTITY_REVIEW_PACKET_PREPARED_NOT_PUBLISHED');
  assert.equal(receipt.automatic_decisions,0);
  assert.equal(receipt.public_repo_mutated,false);
  assert.equal(receipt.production_published,false);
  assert.match(receipt.packet_sha256,/^[a-f0-9]{64}$/);
  assert.match(receipt.template_sha256,/^[a-f0-9]{64}$/);

  const parsed=parseViasnaCsv(csv,{sourceUrl:'https://prisoners.spring96.org/ru/list',fetchedAt:'2026-08-30T16:00:00.000Z',observedAt:'2026-08-30T16:00:00.000Z',locale:'ru'});
  const reviewed={version:1,source_id:'src-viasna',source_sha256:receipt.source_sha256,decisions:template.decisions.map(item=>({decision_id:item.decision_id,action:'KEEP_DISTINCT',source_record_ids:item.source_record_ids}))};
  const compiled=validateViasnaIdentityResolution(reviewed,{observations:parsed.observations,sourceSha256:receipt.source_sha256,asOf:'2026-08-30T16:00:00.000Z'});
  assert.equal(compiled.components_total,3,'review packet components must exactly match executable resolution components');
  assert.equal(compiled.resolved_components,3);
  assert.equal(compiled.unresolved_components,0);

  const blocked=packet.components.find(item=>item.editorial_gate.merge_hard_blocked);
  assert.ok(blocked);
  const illegalMerge={version:1,source_id:'src-viasna',source_sha256:receipt.source_sha256,decisions:[{decision_id:'blocked-merge',action:'MERGE_SAME_PERSON',source_record_ids:blocked.source_record_ids,primary_source_record_id:blocked.source_record_ids[0]}]};
  assert.throws(()=>validateViasnaIdentityResolution(illegalMerge,{observations:parsed.observations,sourceSha256:receipt.source_sha256,asOf:'2026-08-30T16:00:00.000Z'}),/VIASNA_IDENTITY_MERGE_BIRTH_CONFLICT/);

  const wrongCount=spawnSync(process.execPath,[join(root,'scripts/export-viasna-identity-review-packet.mjs')],{encoding:'utf8',env:{...process.env,CHRC_TEST_MODE:'1',VIASNA_SOURCE_FILE:source,CHRC_VIASNA_IDENTITY_REVIEW_DIR:join(work,'wrong'),VIASNA_EXPECTED_IDENTITY_COMPONENTS:'4'}});
  assert.notEqual(wrongCount.status,0);
  assert.match((wrongCount.stderr||'')+(wrongCount.stdout||''),/VIASNA_IDENTITY_REVIEW_COMPONENT_COUNT_MISMATCH/);

  console.log('VIASNA_IDENTITY_REVIEW_PACKET_TEST=PASS components=3 collision_rows=6 automatic_decisions=ZERO executable_component_match=PASS hard_merge_block=PASS private_only=PASS');
}finally{await rm(work,{recursive:true,force:true});}
