import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { readJson } from './lib/fs.mjs';
import { resolvePublicDataDir } from './lib/public-data.mjs';
import { verifySnapshot } from './lib/snapshot.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const basePath=resolvePublicDataDir(root);
const manifest=await readJson(join(basePath,'manifest.json'));
const people=await readJson(join(basePath,'people.json'));
const candidateAuditMode=process.env.CHRC_CANDIDATE_BUILD_MODE==='AUDIT_ONLY';

if (!/^snap-\d{8}T\d{6}Z-[a-f0-9]{8}$/.test(manifest.snapshot_id)) {
  throw new Error('Invalid snapshot_id');
}
if(candidateAuditMode&&manifest.publication_state!=='PUBLISHED')throw new Error(`Candidate full-build preview requires PUBLISHED render state: ${manifest.publication_state||'missing'}`);
if(!candidateAuditMode&&!['DEVELOPMENT_EMPTY','PUBLISHED'].includes(manifest.publication_state))throw new Error(`Invalid public snapshot state: ${manifest.publication_state||'missing'}`);
if (!Array.isArray(people)) throw new Error('people.json must be an array');
const ids = new Set();
for (const person of people) {
  if (person.fixture === true) throw new Error(`Fixture leaked into public data: ${person.person_id}`);
  if (!/^p-\d{7}$/.test(person.person_id)) throw new Error(`Invalid person_id: ${person.person_id}`);
  if (ids.has(person.person_id)) throw new Error(`Duplicate person_id: ${person.person_id}`);
  ids.add(person.person_id);
}
if (manifest.counts.people !== people.length) {
  throw new Error(`Snapshot count mismatch: manifest=${manifest.counts.people}, people=${people.length}`);
}

const integrity = await verifySnapshot(basePath);
if (!integrity.ok) {
  throw new Error(`Snapshot integrity failed: ${JSON.stringify(integrity.failures)}`);
}

for (const required of ['people.json', 'prisons.json', 'news.json', 'reports.json']) {
  if (!manifest.files.some(file => file.path === required)) throw new Error(`Snapshot manifest missing ${required}`);
}

console.log(`DATA_VALIDATION=PASS state=${manifest.publication_state} candidate_audit_mode=${candidateAuditMode}`);
