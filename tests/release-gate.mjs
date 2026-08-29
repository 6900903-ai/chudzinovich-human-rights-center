import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const script = join(root,'scripts/release-status.mjs');
const status = spawnSync(process.execPath,[script],{encoding:'utf8'});
assert.equal(status.status,0);
const report = JSON.parse(status.stdout);
assert.equal(report.production_authorized,false);
assert.equal(report.derived_gates.SNAPSHOT_INTEGRITY_GATE,'PASS');
assert.ok(report.blocking.some(item => item.name === 'REAL_DATA_SNAPSHOT_GATE'));
assert.ok(report.blocking.some(item => item.name === 'LEGAL_DATA_REUSE_GATE'));
const enforce = spawnSync(process.execPath,[script,'--enforce'],{encoding:'utf8'});
assert.equal(enforce.status,2);
console.log('RELEASE_GATE_TEST=PASS fail_closed=true');
