import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('../', import.meta.url).pathname;
const workflow = await readFile(join(root,'.github/workflows/pages.yml'),'utf8');
const gate = workflow.indexOf('run: npm run pages:gate');
const upload = workflow.indexOf('uses: actions/upload-pages-artifact@');
const deploy = workflow.indexOf('uses: actions/deploy-pages@');

assert.ok(gate >= 0,'Pages workflow must enforce pages:gate');
assert.ok(upload > gate,'Pages artifact upload must occur only after pages:gate');
assert.ok(deploy > upload,'Pages deployment must occur only after gated artifact upload');
assert.match(workflow,/permissions:\n\s+contents: read\n\s+pages: write\n\s+id-token: write/);

const shell=spawnSync(process.execPath,[join(root,'scripts/pages-release-status.mjs')],{encoding:'utf8'});
assert.equal(shell.status,0,`empty public shell must be deployable: ${shell.stderr}`);
assert.match(shell.stdout,/"mode": "PUBLIC_SHELL_ONLY"/);
const forced=spawnSync(process.execPath,[join(root,'scripts/pages-release-status.mjs')],{encoding:'utf8',env:{...process.env,CHRC_PAGES_GATE_FORCE_FULL:'1'}});
assert.notEqual(forced.status,0,'forcing full production mode must remain fail-closed while full gates are pending');

console.log('PAGES_RELEASE_GATE_TEST=PASS shell_only=true real_data_fail_closed=true');
