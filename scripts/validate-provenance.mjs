import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { readJson } from './lib/fs.mjs';
import { resolvePublicDataDir } from './lib/public-data.mjs';
import { assertPublicDatasetProvenance } from './lib/provenance.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const basePath=resolvePublicDataDir(root);
const people=await readJson(join(basePath,'people.json'));
assertPublicDatasetProvenance(people);
console.log(`PUBLIC_PROVENANCE=PASS candidate_audit_mode=${process.env.CHRC_CANDIDATE_BUILD_MODE==='AUDIT_ONLY'}`);
