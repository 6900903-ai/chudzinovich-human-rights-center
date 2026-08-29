import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root=new URL('../',import.meta.url).pathname;
const testEnv={...process.env,CHRC_TEST_MODE:'1',CHRC_PUBLIC_DATA_DIR:'tests/fixtures/public-snapshot'};
execFileSync(process.execPath,[join(root,'scripts/build.mjs')],{stdio:'inherit',env:testEnv});
execFileSync(process.execPath,[join(root,'scripts/build-case-index.mjs')],{stdio:'inherit',env:testEnv});
execFileSync(process.execPath,[join(root,'scripts/build-global-search.mjs')],{stdio:'inherit',env:testEnv});

const hub=await readFile(join(root,'_site/case-index/index.html'),'utf8');
const article=await readFile(join(root,'_site/criminal-code/130-ch-1/index.html'),'utf8');
const judge=await readFile(join(root,'_site/judges/testovyy-sudya/index.html'),'utf8');
const prosecutor=await readFile(join(root,'_site/prosecutors/testovyy-prokuror/index.html'),'utf8');
const search=JSON.parse(await readFile(join(root,'_site/assets/search/ru.json'),'utf8'));

assert.ok(hub.includes('Суды и статьи УК'));
assert.ok(hub.includes('130 ч. 1'));
assert.ok(article.includes('Тестовый Человек А'));
assert.ok(article.includes('p-0000001'));
assert.ok(judge.includes('Тестовый судья'));
assert.ok(judge.includes('Тестовый Человек А'));
assert.ok(prosecutor.includes('Тестовый прокурор'));
assert.ok(search.some(item=>item.t==='case'&&item.n.includes('130 ч. 1')&&item.u==='/criminal-code/130-ch-1/'));
assert.ok(search.some(item=>item.t==='case'&&item.n.includes('Тестовый судья')&&item.u==='/judges/testovyy-sudya/'));
assert.ok(search.some(item=>item.t==='case'&&item.n.includes('Тестовый прокурор')&&item.u==='/prosecutors/testovyy-prokuror/'));

execFileSync(process.execPath,[join(root,'scripts/build.mjs')],{stdio:'inherit',env:{...process.env,CHRC_TEST_MODE:'0'}});
console.log('CASE_INDEX_TEST=PASS article=PASS judge=PASS prosecutor=PASS search=PASS fixture_cleanup=PASS');
