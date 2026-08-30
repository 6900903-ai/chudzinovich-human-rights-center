import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root=new URL('../',import.meta.url).pathname;
const fixtureEnv={...process.env,CHRC_TEST_MODE:'1',CHRC_PUBLIC_DATA_DIR:'tests/fixtures/public-snapshot'};

try{
  execFileSync(process.execPath,[join(root,'scripts/build.mjs')],{stdio:'inherit',env:fixtureEnv});
  execFileSync(process.execPath,[join(root,'scripts/build-person-directory.mjs')],{stdio:'inherit',env:fixtureEnv});
  execFileSync(process.execPath,[join(root,'scripts/finalize-site.mjs')],{stdio:'inherit',env:fixtureEnv});

  const ru=await readFile(join(root,'_site/database/index.html'),'utf8');
  const en=await readFile(join(root,'_site/en/database/index.html'),'utf8');
  const be=await readFile(join(root,'_site/be/database/index.html'),'utf8');
  const pl=await readFile(join(root,'_site/pl/database/index.html'),'utf8');
  const home=await readFile(join(root,'_site/index.html'),'utf8');
  const current=await readFile(join(root,'_site/prisoners/index.html'),'utf8');
  const former=await readFile(join(root,'_site/former-prisoners/index.html'),'utf8');
  const all=await readFile(join(root,'_site/repressed/index.html'),'utf8');
  const sitemap=await readFile(join(root,'_site/sitemap.xml'),'utf8');

  assert.ok(ru.includes('База людей CHUDO'));
  assert.ok(en.includes('CHUDO people database'));
  assert.ok(be.includes('База людзей CHUDO'));
  assert.ok(pl.includes('Baza osób CHUDO'));
  assert.ok(!ru.includes('name="robots" content="noindex'));
  assert.ok(ru.includes('>1<') && ru.includes('>3<'),'fixture statistics missing');
  assert.ok(ru.includes('ПОЛИТЗАКЛЮЧЁННЫЕ · 1'));
  assert.ok(ru.includes('БЫВШИЕ · 1'));
  assert.ok(ru.includes('ВСЕ РЕПРЕССИИ · 3'));
  assert.ok(home.includes('data-person-directory-entry'));
  assert.ok(home.includes('href="/database/"'));
  for(const page of [current,former,all]){
    assert.ok(page.includes('registry-tabs'));
    assert.ok(page.includes('href="/database/"'));
  }
  assert.ok(sitemap.includes('<loc>https://chudzinovich.pp.ua/database/</loc>'));
  assert.ok(sitemap.includes('<loc>https://chudzinovich.pp.ua/en/database/</loc>'));

  execFileSync(process.execPath,[join(root,'scripts/build.mjs')],{stdio:'inherit',env:process.env});
  execFileSync(process.execPath,[join(root,'scripts/build-person-directory.mjs')],{stdio:'inherit',env:process.env});
  execFileSync(process.execPath,[join(root,'scripts/finalize-site.mjs')],{stdio:'inherit',env:process.env});
  const empty=await readFile(join(root,'_site/database/index.html'),'utf8');
  const emptySitemap=await readFile(join(root,'_site/sitemap.xml'),'utf8');
  assert.ok(empty.includes('name="robots" content="noindex,follow"'));
  assert.ok(empty.includes('Реальная каноническая база ещё не включена'));
  assert.ok(!emptySitemap.includes('<loc>https://chudzinovich.pp.ua/database/</loc>'));

  console.log('PERSON_DIRECTORY_TEST=PASS locales=4 published_stats=PASS empty_noindex=PASS catalog_tabs=PASS home_entry=PASS');
}finally{
  execFileSync(process.execPath,[join(root,'scripts/build.mjs')],{stdio:'inherit',env:process.env});
}
