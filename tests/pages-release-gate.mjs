import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const workflow = await readFile(join(root,'.github/workflows/pages.yml'),'utf8');
const gate = workflow.indexOf('run: npm run release:gate');
const upload = workflow.indexOf('uses: actions/upload-pages-artifact@');
const deploy = workflow.indexOf('uses: actions/deploy-pages@');

assert.ok(gate >= 0,'Pages workflow must enforce release:gate');
assert.ok(upload > gate,'Pages artifact upload must occur only after release:gate');
assert.ok(deploy > upload,'Pages deployment must occur only after gated artifact upload');
assert.match(workflow,/permissions:\n\s+contents: read\n\s+pages: write\n\s+id-token: write/);

console.log('PAGES_RELEASE_GATE_TEST=PASS fail_closed=true');
