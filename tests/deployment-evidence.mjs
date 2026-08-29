import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const live = JSON.parse(await readFile(join(root,'release/evidence/deployment-live-20260829T102857Z.json'),'utf8'));
const guard = JSON.parse(await readFile(join(root,'release/evidence/pages-deployment-guard-20260829T103315Z.json'),'utf8'));
const gates = JSON.parse(await readFile(join(root,'release/gates.json'),'utf8'));
const pages = await readFile(join(root,'.github/workflows/pages.yml'),'utf8');

assert.equal(live.evidence_type,'DEPLOYMENT_LIVE_CHECK');
assert.equal(live.target_url,'https://chudzinovich.pp.ua/');
assert.equal(live.pre_live_validation_suite,'PASS');
assert.equal(live.dns.result,'ENOTFOUND');
assert.equal(live.http_reached,false);
assert.equal(live.deployment_result,'FAIL_DNS_ENOTFOUND');
assert.equal(live.production_authorized,false);

assert.equal(guard.initial_ungated_deployment.snapshot_people,0);
assert.equal(guard.initial_ungated_deployment.production_release_gate_enforced_before_deploy,false);
assert.equal(guard.fail_closed_hotfix.release_gate,'FAIL_AS_DESIGNED');
assert.equal(guard.fail_closed_hotfix.pages_artifact_upload,'SKIPPED');
assert.equal(guard.fail_closed_hotfix.pages_deploy,'SKIPPED');
assert.equal(guard.fail_closed_hotfix.future_deployment_requires_release_gate_pass,true);

assert.equal(gates.gates.DNS_DOMAIN_GATE,'FAIL_DNS_ENOTFOUND');
assert.equal(gates.gates.HOSTING_SECURITY_HEADERS_GATE,'BLOCKED_BY_DNS_NOT_LIVE_VALIDATED');
assert.equal(gates.production_authorized,false);
assert.ok(pages.indexOf('run: npm run release:gate') < pages.indexOf('uses: actions/upload-pages-artifact@'));

console.log('DEPLOYMENT_EVIDENCE_TEST=PASS dns_blocker_recorded=true pages_guarded=true');
