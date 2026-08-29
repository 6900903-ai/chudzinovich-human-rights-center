import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson } from './lib/fs.mjs';
import { verifySnapshot } from './lib/snapshot.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const gateConfig = await readJson(join(root,'release/gates.json'));
const dataDir = join(root,'data/public/current');
const snapshot = await verifySnapshot(dataDir);

const REQUIRED = [
  'LEGAL_DATA_REUSE_GATE','PRIVACY_DPIA_GATE','PRIVATE_EDITORIAL_STORAGE_GATE','FETCHER_SECURITY_GATE',
  'CI_SUPPLY_CHAIN_GATE','IMAGE_RIGHTS_GATE','SOURCE_ATTRIBUTION_GATE','RELEASE_TESTS',
  'PUBLIC_CONTACT_GATE','HOSTING_SECURITY_HEADERS_GATE','DNS_DOMAIN_GATE','REAL_DATA_SNAPSHOT_GATE'
];

const configured = Object.fromEntries(REQUIRED.map(name => [name, gateConfig.gates?.[name] ?? 'MISSING']));
const codeDerived = {
  SNAPSHOT_INTEGRITY_GATE: snapshot.ok ? 'PASS' : 'FAIL',
  PUBLICATION_STATE_GATE: snapshot.ok && snapshot.manifest?.publication_state === 'PUBLISHED' ? 'PASS' : 'PENDING',
  NONEMPTY_PUBLIC_DATA_GATE: snapshot.ok && Number(snapshot.manifest?.counts?.people || 0) > 0 ? 'PASS' : 'PENDING'
};

function isPass(value) { return value === 'PASS'; }
const blockingConfigured = Object.entries(configured).filter(([,value]) => !isPass(value));
const blockingDerived = Object.entries(codeDerived).filter(([,value]) => value !== 'PASS');
const productionAuthorized = blockingConfigured.length === 0 && blockingDerived.length === 0 && gateConfig.production_authorized === true;

const report = {
  production_authorized: productionAuthorized,
  configured_gates: configured,
  derived_gates: codeDerived,
  blocking: [...blockingConfigured.map(([name,value]) => ({name,value})), ...blockingDerived.map(([name,value]) => ({name,value}))],
  snapshot_id: snapshot.manifest?.snapshot_id || null
};

console.log(JSON.stringify(report,null,2));
if (process.argv.includes('--enforce') && !productionAuthorized) process.exit(2);
