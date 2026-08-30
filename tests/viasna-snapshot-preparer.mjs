import assert from 'node:assert/strict';
import { mkdtemp, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { prepareViasnaSnapshot } from '../scripts/lib/viasna-snapshot-preparer.mjs';
import { verifySnapshot } from '../scripts/lib/snapshot.mjs';

const root=new URL('../',import.meta.url).pathname;
const output=await mkdtemp(join(tmpdir(),'chudo-viasna-prepare-'));
const result=await prepareViasnaSnapshot({
  sourceFile:join(root,'tests/fixtures/viasna.synthetic.csv'),
  outputRoot:output,
  currentPublicDir:join(root,'data/public/current'),
  sourcePageUrl:'https://prisoners.spring96.org/en/list',
  locale:'en',
  asOf:'2026-08-29T12:00:00Z'
});
assert.equal(result.people,3);
assert.equal(result.prisons,1);
assert.equal(result.quarantined,0);
assert.equal(result.reviewRequired,1);
const integrity=await verifySnapshot(result.snapshotDir);
assert.equal(integrity.ok,true);
assert.equal(integrity.manifest.publication_state,'CANDIDATE_REVIEW');
assert.equal(integrity.manifest.counts.people,3);
const people=JSON.parse(await readFile(join(result.snapshotDir,'people.json'),'utf8'));
assert.equal(people.length,3);
assert.ok(people.every(p=>p.fixture!==true));
assert.equal(people[1].detentions.length,0,'future detention field must not enter public candidate');
const quarantine=JSON.parse(await readFile(join(result.runDir,'private-review/quarantine.json'),'utf8'));
assert.equal(quarantine.count,0);
const review=JSON.parse(await readFile(join(result.runDir,'private-review/review-required.json'),'utf8'));
assert.equal(review.count,1);
assert.ok(review.findings.some(x=>x.code==='FUTURE_EVENT_DATE_WITHHELD'&&x.field==='detention_date'));
await assert.rejects(access(join(result.snapshotDir,'quarantine.json')));
await assert.rejects(access(join(result.snapshotDir,'review-required.json')));
await assert.rejects(access(join(result.snapshotDir,'source.csv')));
const marker=JSON.parse(await readFile(join(result.runDir,'PREPARED_CANDIDATE.json'),'utf8'));
assert.equal(marker.state,'PREPARED_NOT_PUBLISHED');
assert.equal(marker.public_repo_mutated,false);
assert.equal(marker.review_required_findings,1);
const publicCurrent=JSON.parse(await readFile(join(root,'data/public/current/people.json'),'utf8'));
assert.equal(publicCurrent.length,0);

const audit=spawnSync(process.execPath,[join(root,'scripts/audit-viasna-candidate.mjs')],{
  encoding:'utf8',
  env:{
    ...process.env,
    CHRC_TEST_MODE:'1',
    CHRC_VIASNA_CANDIDATE_DIR:result.snapshotDir,
    VIASNA_EXPECTED_PEOPLE:'3',
    VIASNA_EXPECTED_PRISONS:'1',
    VIASNA_EXPECTED_CANDIDATE_ACTIVE:'1',
    VIASNA_EXPECTED_CANDIDATE_FORMER:'1',
    VIASNA_EXPECTED_CANDIDATE_NP:'1',
    CHRC_CANDIDATE_SITEMAP_URL_RESERVE:'5000'
  }
});
assert.equal(audit.status,0,audit.stderr||audit.stdout);
assert.match(audit.stdout,/REAL_VIASNA_CANDIDATE_AUDIT=PASS/);
assert.match(audit.stdout,/people=3 active=1 former=1 np=1 prisons=1/);
assert.match(audit.stdout,/private_leaks=0 published=false/);
const auditJson=JSON.parse(audit.stdout.trim().split('\n').at(-1));
assert.equal(auditJson.state,'REAL_VIASNA_CANDIDATE_AUDIT_PASS_NOT_PUBLISHED');
assert.equal(auditJson.next_gate,'FULL_CANDIDATE_BUILD_AUDIT');
assert.equal(auditJson.projected_profile_pages,12);
assert.ok(auditJson.projected_sitemap_with_reserve<50000);
assert.equal(auditJson.public_repo_mutated,false);
assert.equal(auditJson.production_published,false);

const budgetFail=spawnSync(process.execPath,[join(root,'scripts/audit-viasna-candidate.mjs')],{
  encoding:'utf8',
  env:{...process.env,CHRC_TEST_MODE:'1',CHRC_VIASNA_CANDIDATE_DIR:result.snapshotDir,CHRC_CANDIDATE_MAX_CORE_URLS:'1'}
});
assert.notEqual(budgetFail.status,0);
assert.match((budgetFail.stderr||'')+(budgetFail.stdout||''),/VIASNA_CANDIDATE_CORE_URL_BUDGET_EXCEEDED/);

console.log('VIASNA_SNAPSHOT_PREPARER_TEST=PASS people=3 prisons=1 field_review_private=PASS raw_csv_public=ZERO current_mutation=ZERO candidate_scale_audit=PASS next_gate=FULL_CANDIDATE_BUILD_AUDIT');
await import('./viasna-snapshot-promotion.mjs');
