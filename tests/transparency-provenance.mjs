import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const marker='CHUDO_DATA_PROVENANCE_TRANSPARENCY_V1';
const publishedEnv={...process.env,CHRC_TEST_MODE:'1',CHRC_PUBLIC_DATA_DIR:'tests/fixtures/public-snapshot/wave46'};

execFileSync(process.execPath,[join(root,'scripts/build-trust-center.mjs')],{stdio:'inherit',env:publishedEnv});
execFileSync(process.execPath,[join(root,'scripts/enhance-transparency-provenance.mjs')],{stdio:'inherit',env:publishedEnv});

const paths={ru:join(root,'_site/transparency/index.html'),be:join(root,'_site/be/transparency/index.html'),en:join(root,'_site/en/transparency/index.html'),pl:join(root,'_site/pl/transparency/index.html')};
const pages=Object.fromEntries(await Promise.all(Object.entries(paths).map(async([lang,path])=>[lang,await readFile(path,'utf8')])));
for(const [lang,html] of Object.entries(pages)){
  assert.equal((html.match(new RegExp(marker,'g'))||[]).length,1,`${lang} marker must appear once`);
  assert.ok(html.includes('>8696<'),`${lang} source rows`);
  assert.ok(html.includes('>8642<'),`${lang} public people`);
  assert.ok(html.includes('>54<'),`${lang} quarantine rows`);
  assert.ok(html.includes('>11<'),`${lang} review fields`);
  assert.ok(html.includes('>889<'),`${lang} active count`);
  assert.ok(html.includes('>3952<'),`${lang} former count`);
  assert.ok(html.includes('>3801<'),`${lang} repression count`);
  assert.ok(html.includes('0c0b5eeb9108e850a3d021a41913726824d0ba1fe2a43a545af2fa084c22b661'),`${lang} source sha`);
  assert.ok(html.includes('snap-20260830T160000Z-abcdef12'),`${lang} public snapshot`);
  for(const forbidden of ['identity_conflicts','review_queue','source_record_id','private_editorial_notes'])assert.ok(!html.includes(forbidden),`${lang} must not expose ${forbidden}`);
}
assert.ok(pages.ru.includes('Строка исходного файла не равна человеку'));
assert.ok(pages.ru.includes('Строк удержано из-за структурных конфликтов'));
assert.ok(pages.be.includes('Радок зыходнага файла не роўны чалавеку'));
assert.ok(pages.en.includes('A source-file row is not the same thing as a person'));
assert.ok(pages.pl.includes('Wiersz pliku źródłowego nie jest tym samym co osoba'));
assert.ok(pages.en.includes('Quarantine means source rows that did not enter public person profiles'));

const invalidEnv={...process.env,CHRC_TEST_MODE:'1',CHRC_PUBLIC_DATA_DIR:'tests/fixtures/public-snapshot/wave46-invalid'};
execFileSync(process.execPath,[join(root,'scripts/build-trust-center.mjs')],{stdio:'inherit',env:invalidEnv});
const invalid=spawnSync(process.execPath,[join(root,'scripts/enhance-transparency-provenance.mjs')],{encoding:'utf8',env:invalidEnv});
assert.notEqual(invalid.status,0);
assert.match((invalid.stderr||'')+(invalid.stdout||''),/TRANSPARENCY_PROVENANCE_CLEAN_PEOPLE_MISMATCH:2:3/);

execFileSync(process.execPath,[join(root,'scripts/build-trust-center.mjs')],{stdio:'inherit'});
execFileSync(process.execPath,[join(root,'scripts/enhance-transparency-provenance.mjs')],{stdio:'inherit'});
const restored=await readFile(paths.ru,'utf8');
assert.ok(restored.includes('Каноническая база людей ещё не опубликована'));
assert.ok(!restored.includes(marker),'empty shell must not expose published provenance block');

console.log('TRANSPARENCY_PROVENANCE_TEST=PASS locales=4 source_rows=8696 people=8642 quarantine=54 review_fields=11 private_details=ZERO fail_closed=PASS empty_shell=PASS');
