import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root=new URL('../',import.meta.url).pathname;
for(const script of ['build.mjs','build-news.mjs','build-policy-pages.mjs','build-sources-page.mjs','build-public-sections.mjs','build-youtube-pages.mjs','build-guide.mjs','build-global-search.mjs','build-topical-authority.mjs','build-help-center.mjs','build-trust-center.mjs','enhance-public-shell.mjs','enhance-seo.mjs','finalize-site.mjs'])execFileSync(process.execPath,[join(root,'scripts',script)],{stdio:'inherit'});

const topics=['political-prisoner','detention','trial-sentence','detention-places','release','verification'];
const localePaths=[['ru',''],['be','be/'],['en','en/'],['pl','pl/']];
for(const [lang,prefix] of localePaths){
  const hub=await readFile(join(root,`_site/${prefix}guide/index.html`),'utf8');
  assert.ok(hub.includes('CHUDO HUMAN RIGHTS CENTER · GUIDE'));
  for(const topic of topics){
    assert.ok(hub.includes(`/${prefix}guide/${topic}/`),`${lang} guide hub missing ${topic}`);
    const page=await readFile(join(root,`_site/${prefix}guide/${topic}/index.html`),'utf8');
    assert.ok(page.includes('<h1>'));
    assert.ok((page.match(/<section class="profile-section">/g)||[]).length>=6,`${lang}:${topic} is too thin`);
    assert.ok(!page.includes('name="robots" content="noindex'));
  }
  const index=JSON.parse(await readFile(join(root,`_site/assets/guide-index/${lang}.json`),'utf8'));
  assert.equal(index.length,7);
  assert.equal(index.filter(x=>x.t==='guide').length,7);
}
const ru=await readFile(join(root,'_site/guide/political-prisoner/index.html'),'utf8');
assert.ok(ru.includes('Статус — это не ключевое слово'));
assert.ok(ru.includes('Короткая проверка'));
const sitemap=await readFile(join(root,'_site/sitemap.xml'),'utf8');
assert.ok(sitemap.includes('<loc>https://chudzinovich.pp.ua/guide/</loc>'));
assert.ok(sitemap.includes('<loc>https://chudzinovich.pp.ua/guide/verification/</loc>'));
assert.ok(sitemap.includes('<loc>https://chudzinovich.pp.ua/en/guide/political-prisoner/</loc>'));
console.log('GUIDE_TEST=PASS topics=6 pages=28 locales=4 search_records=28 sitemap=PASS thin_content=ZERO');
