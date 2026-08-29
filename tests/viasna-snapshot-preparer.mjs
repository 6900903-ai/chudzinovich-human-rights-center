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
assert.equal(result.people,2);
assert.equal(result.prisons,1);
assert.equal(result.quarantined,1);
const integrity=await verifySnapshot(result.snapshotDir);
assert.equal(integrity.ok,true);
assert.equal(integrity.manifest.publication_state,'CANDIDATE_REVIEW');
assert.equal(integrity.manifest.counts.people,2);
const people=JSON.parse(await readFile(join(result.snapshotDir,'people.json'),'utf8'));
assert.equal(people.length,2);
assert.ok(people.every(p=>p.fixture!==true));
const quarantine=JSON.parse(await readFile(join(result.runDir,'private-review/quarantine.json'),'utf8'));
assert.equal(quarantine.count,1);
assert.ok(quarantine.anomalies.some(x=>x.code==='FUTURE_EVENT_DATE'));
await assert.rejects(access(join(result.snapshotDir,'quarantine.json')));
await assert.rejects(access(join(result.snapshotDir,'source.csv')));
const marker=JSON.parse(await readFile(join(result.runDir,'PREPARED_CANDIDATE.json'),'utf8'));
assert.equal(marker.state,'PREPARED_NOT_PUBLISHED');
assert.equal(marker.public_repo_mutated,false);
const publicCurrent=JSON.parse(await readFile(join(root,'data/public/current/people.json'),'utf8'));
assert.equal(publicCurrent.length,0);
console.log('VIASNA_SNAPSHOT_PREPARER_TEST=PASS people=2 prisons=1 quarantine_private=PASS raw_csv_public=ZERO current_mutation=ZERO');
