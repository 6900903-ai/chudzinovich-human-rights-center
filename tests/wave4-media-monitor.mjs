import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  loadMediaRegistry, validateMediaRegistry, getEnabledMediaSources,
  getSchedulableMediaSources, sourceForUrl, sourceById
} from '../scripts/lib/media-registry.mjs';
import { classifyMediaText, CLASSIFIER_POLICY } from '../scripts/lib/media-classifier.mjs';
import { summarizeIndependence, confidenceFromIndependence } from '../scripts/lib/source-independence.mjs';
import { buildPrivateCandidate, resolvePrivateReviewDir, writePrivateCandidate } from '../scripts/lib/private-candidate-sink.mjs';
import { validateSourceUrl, assertPublicDns, fetchMediaText } from '../scripts/adapters/media-generic.mjs';
import { schedulerPlan } from '../scripts/media-scheduler.mjs';
import { runFixture } from '../scripts/media-monitor.mjs';

const registry = await loadMediaRegistry();
const stats = validateMediaRegistry(registry);
assert.equal(stats.source_count,126);
assert.equal(stats.enabled_count,62);
assert.equal(getSchedulableMediaSources(registry).length,0);
for (const name of ['Zerkalo','Nasha Niva','Belsat TV','Euroradio','Reform.news','Pozirk','Hrodna.life','NEXTA Belarus','BELTA','Telegraf.news','PALATNO','s13.ru — Grodno News','ZnadNiemna.pl']) {
  assert.ok(registry.sources.some(s => s.name === name), `missing source ${name}`);
}
for (const source of getEnabledMediaSources(registry)) {
  assert.equal(source.monitoring_state,'ACTIVE_VERIFIED');
  assert.ok(source.canonical_domains.length > 0);
  assert.equal(source.claim_semantics,'SOURCE_CLAIM_ONLY');
  assert.equal(source.runtime_allowed,false);
}
assert.equal(sourceForUrl(registry,'https://news.zerkalo.io/test')?.source_id,'src-zerkalo');
assert.equal(registry.policy.media_report_is_political_prisoner_designation,false);

let c = classifyMediaText({title:'Задержан активист за участие в протестах 2020 года'});
assert.equal(c.classification,'POLITICAL_REPRESSION_CANDIDATE');
c = classifyMediaText({title:'Мужчину задержали за незаконный оборот наркотиков'});
assert.equal(c.classification,'ORDINARY_CRIME');
c = classifyMediaText({title:'Сообщается о пытках заключенного'});
assert.equal(c.classification,'HUMAN_RIGHTS_RELEVANT');
assert.ok(c.high_risk_flags.includes('TORTURE'));
assert.equal(CLASSIFIER_POLICY.media_report_is_political_prisoner_designation,false);

const relay = ['src-zerkalo','src-nasha-niva','src-reform','src-belta'].map((source_id,i)=>({
  source_id, article_url:`https://example.invalid/${i}`, title:'Задержан тестовый человек',
  event_hint:'DETENTION', person_names:[i===1?'Тэставы Чалавек':'Тестовый Человек'],
  upstream_source:'by-mvd', classification:'POLITICAL_REPRESSION_CANDIDATE', high_risk_flags:[]
}));
let independence = summarizeIndependence(relay);
assert.equal(independence.source_count,4);
assert.equal(independence.independent_origin_count,1);
independence = summarizeIndependence([...relay,{source_id:'src-belsat',article_url:'https://example.invalid/witness',title:'Очевидец сообщил о задержании',event_hint:'DETENTION',person_names:['Тестовый Человек'],upstream_source:null,classification:'POLITICAL_REPRESSION_CANDIDATE',high_risk_flags:[]}]);
assert.equal(independence.source_count,5);
assert.equal(independence.independent_origin_count,2);
assert.equal(confidenceFromIndependence(independence),'HIGH');

const observation={source_id:'src-zerkalo',article_url:'https://zerkalo.io/test/synthetic',title:'Синтетический пример',summary:'',event_hint:'DETENTION',person_names:['Тестовый Человек'],upstream_source:null,origin_claim_id:'oc-synthetic',classification:'POLITICAL_REPRESSION_CANDIDATE',high_risk_flags:[],source_claim_only:true,publication_state:'PRIVATE_DISCOVERY_ONLY'};
const {candidate}=buildPrivateCandidate([observation],{name_as_reported:'Тестовый Человек'});
assert.equal(candidate.publication_blocked,true);
assert.equal(candidate.private_record,true);
assert.ok(!Object.hasOwn(candidate,'political_prisoner'));
await assert.rejects(()=>resolvePrivateReviewDir(resolve('data/review-wave4')),/PRIVATE_REVIEW_DIR_INSIDE_PUBLIC_REPO/);
const external=await mkdtemp(join(tmpdir(),'chrc-private-review-'));
try {
  const savedPath=await writePrivateCandidate(candidate,external);
  const saved=JSON.parse(await readFile(savedPath,'utf8'));
  assert.equal(saved.publication_blocked,true);
} finally { await rm(external,{recursive:true,force:true}); }

const zerkalo=sourceById(registry,'src-zerkalo');
assert.equal(validateSourceUrl(zerkalo,'https://zerkalo.io/test').hostname,'zerkalo.io');
assert.throws(()=>validateSourceUrl(zerkalo,'http://zerkalo.io/test'),/MEDIA_HTTPS_ONLY/);
assert.throws(()=>validateSourceUrl(zerkalo,'https://example.com/test'),/MEDIA_SOURCE_DOMAIN_NOT_ALLOWED/);
await assert.rejects(()=>assertPublicDns('zerkalo.io',async()=>[{address:'127.0.0.1',family:4}]),/MEDIA_DNS_FORBIDDEN_ADDRESS/);
await assert.rejects(()=>fetchMediaText(zerkalo,'https://zerkalo.io/test'),/MEDIA_MONITOR_NETWORK_GATE_NOT_PASS/);

const plan=await schedulerPlan();
assert.equal(plan.total_sources,126);
assert.equal(plan.candidate_eligible_sources,62);
assert.equal(plan.schedulable_sources.length,0);
assert.equal(plan.live_polling_enabled,false);

process.env.CHRC_TEST_MODE='1';
const result=await runFixture(resolve('tests/fixtures/media-articles.synthetic.json'));
assert.equal(result.observations.length,7);
assert.equal(result.candidates.length,2);
const caseA=result.candidates.find(x=>x.group_id==='case-a');
assert.equal(caseA.candidate.source_count,5);
assert.equal(caseA.candidate.independent_origin_count,2);
assert.equal(caseA.candidate.confidence,'HIGH');
assert.equal(result.observations.find(o=>o.article_url.includes('synthetic-b1')).classification,'ORDINARY_CRIME');
assert.ok(result.candidates.find(x=>x.group_id==='case-c').candidate.high_risk_flags.includes('TORTURE'));

console.log('WAVE4_MEDIA_MONITOR_TEST=PASS sources=126 candidate_eligible=62 schedulable=0');
