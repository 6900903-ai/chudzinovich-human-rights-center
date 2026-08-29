import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const evidence = JSON.parse(await readFile(join(root,'release/evidence/deployment-live-20260829T102857Z.json'),'utf8'));
const gates = JSON.parse(await readFile(join(root,'release/gates.json'),'utf8'));

assert.equal(evidence.evidence_type,'DEPLOYMENT_LIVE_CHECK');
assert.equal(evidence.target_url,'https://chudzinovich.pp.ua/');
assert.equal(evidence.pre_live_validation_suite,'PASS');
assert.equal(evidence.dns.result,'ENOTFOUND');
assert.equal(evidence.http_reached,false);
assert.equal(evidence.deployment_result,'FAIL_DNS_ENOTFOUND');
assert.equal(evidence.production_authorized,false);
assert.equal(gates.gates.DNS_DOMAIN_GATE,'FAIL_DNS_ENOTFOUND');
assert.equal(gates.gates.HOSTING_SECURITY_HEADERS_GATE,'BLOCKED_BY_DNS_NOT_LIVE_VALIDATED');
assert.equal(gates.production_authorized,false);

console.log('DEPLOYMENT_EVIDENCE_TEST=PASS dns_blocker_recorded=true');
