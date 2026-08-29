import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
execFileSync(process.execPath,[join(root,'scripts/build.mjs')],{stdio:'inherit'});
execFileSync(process.execPath,[join(root,'scripts/build-policy-pages.mjs')],{stdio:'inherit'});
execFileSync(process.execPath,[join(root,'scripts/build-sources-page.mjs')],{stdio:'inherit'});
const ru = await readFile(join(root,'_site/sources/index.html'),'utf8');
const en = await readFile(join(root,'_site/en/sources/index.html'),'utf8');
for (const handle of ['Z690002','phoenixosintvirus','dw_belarus','shtabonoshko','statkevichm','oshorg','doska_pozora_lida','evanews25','narodnireporter']) {assert.ok(ru.includes(`@${handle}`),`RU sources page missing @${handle}`);assert.ok(en.includes(`@${handle}`),`EN sources page missing @${handle}`);}
assert.ok(ru.includes('SOURCE ≠ FACT'));
assert.ok(ru.includes('без факт-чека CHUDO'));
assert.ok(en.includes('without CHUDO fact-checking or manual editorial approval'));
assert.ok(ru.includes('Правозащитный центр «Вясна»'));
assert.ok(ru.includes('ТОЧКА НЕВОЗВРАТА Чудинович Юра'));
assert.ok(ru.includes('UCTXAwovvaec4w9ztbggWMEQ'));
assert.ok(ru.includes('126'));
assert.ok(ru.includes('62'));
assert.ok(!ru.includes('telegram.org/js'));
assert.ok(!ru.includes('<iframe'));
console.log('SOURCES_PAGE_TEST=PASS telegram=9 youtube=1 media_total=126 media_enabled=62');
