import { readJson } from './lib/fs.mjs';
import { assertPublicDatasetProvenance } from './lib/provenance.mjs';

const baseUrl = new URL('../data/public/current/', import.meta.url);
const people = await readJson(new URL('people.json',baseUrl));
assertPublicDatasetProvenance(people);
console.log('PUBLIC_PROVENANCE=PASS');
