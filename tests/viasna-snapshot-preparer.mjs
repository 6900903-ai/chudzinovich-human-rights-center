import assert from 'node:assert/strict';
import { mkdtemp, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
console.log('VIASNA_SNAPSHOT_PREPARER_TEST=PASS people=3 prisons=1 field_review_private=PASS raw_csv_public=ZERO current_mutation=ZERO');
