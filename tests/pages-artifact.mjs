import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
execFileSync(npm, ['run', 'build'], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [join(root, 'scripts/validate-pages-artifact.mjs')], { cwd: root, stdio: 'inherit' });
const manifest = JSON.parse(await readFile(join(root, '_site/release-artifact.json'), 'utf8'));
if (manifest.total_files < 1200) throw new Error(`Pages artifact file count too low: ${manifest.total_files}`);
if (manifest.html_files < 1000) throw new Error(`Pages artifact HTML count too low: ${manifest.html_files}`);
if (manifest.sitemap_urls !== manifest.indexable_urls) throw new Error('Pages sitemap/indexable count mismatch');
if (manifest.json_ld_pages < 10) throw new Error('Pages JSON-LD coverage unexpectedly low');
console.log(`PAGES_ARTIFACT_TEST=PASS files=${manifest.total_files} html=${manifest.html_files} indexable=${manifest.indexable_urls}`);
