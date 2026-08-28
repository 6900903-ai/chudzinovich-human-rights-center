import { readJson } from './lib/fs.mjs';

const base = new URL('../data/public/current/', import.meta.url);
const manifest = await readJson(new URL('manifest.json', base));
const people = await readJson(new URL('people.json', base));

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
console.log('DATA_VALIDATION=PASS');
