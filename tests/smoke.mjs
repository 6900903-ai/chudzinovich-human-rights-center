import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
execFileSync(process.execPath, [join(root, 'scripts/validate-public-boundary.mjs')], { stdio: 'inherit' });
execFileSync(process.execPath, [join(root, 'scripts/validate-data.mjs')], { stdio: 'inherit' });
execFileSync(process.execPath, [join(root, 'scripts/build.mjs')], { stdio: 'inherit' });

const home = await readFile(join(root, '_site/index.html'), 'utf8');
const js = await readFile(join(root, '_site/assets/js/main.js'), 'utf8');
const manifest = JSON.parse(await readFile(join(root, '_site/build-manifest.json'), 'utf8'));

if (!home.includes('CHUDZINOVICH HUMAN RIGHTS CENTER')) throw new Error('Home brand missing');
if (!home.includes('Публичная база ещё не опубликована')) throw new Error('Empty-data fallback missing');
if (/https?:\/\//.test(js)) throw new Error('Runtime JS contains external URL');
if (manifest.third_party_runtime_requests !== 0) throw new Error('Third-party runtime policy violated');
if (manifest.political_prisoner_autodesignation !== false) throw new Error('Political-prisoner auto-designation must be false');
if (manifest.high_risk_autopublish !== false) throw new Error('High-risk autopublish must be false');
console.log('SMOKE_TEST=PASS');
