import { fileURLToPath } from 'node:url';
import { readJson } from './lib/fs.mjs';
import { verifySnapshot } from './lib/snapshot.mjs';

const baseUrl = new URL('../data/public/current/', import.meta.url);
const basePath = fileURLToPath(baseUrl);
const manifest = await readJson(new URL('manifest.json', baseUrl));
const people = await readJson(new URL('people.json', baseUrl));

if (!/^snap-\d{8}T\d{6}Z-[a-f0-9]{8}$/.test(manifest.snapshot_id)) {
  throw new Error('Invalid snapshot_id');
}
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

console.log('DATA_VALIDATION=PASS');
