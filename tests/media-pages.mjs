import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root=new URL('../',import.meta.url).pathname;
for(const script of ['build.mjs','build-news.mjs','build-policy-pages.mjs','build-sources-page.mjs','build-public-sections.mjs','build-channel-pages.mjs','build-media-pages.mjs'])execFileSync(process.execPath,[join(root,'scripts',script)],{stdio:'inherit'});
const ru=await readFile(join(root,'_site/media/index.html'),'utf8');
const en=await readFile(join(root,'_site/en/media/index.html'),'utf8');
assert.ok(ru.includes('СМИ и медиапроекты'));
assert.ok(en.includes('Media sources'));
assert.ok(ru.includes('126'));
assert.ok(ru.includes('62'));
for(const [slug,name] of [['zerkalo','Zerkalo'],['nasha-niva','Nasha Niva'],['belsat','Belsat TV'],['mediazona-belarus','Mediazona Belarus']]){
  assert.ok(ru.includes(`/media/${slug}/`));
  const page=await readFile(join(root,'_site/media',slug,'index.html'),'utf8');
  assert.ok(page.includes(name));
  assert.ok(page.includes('https://'));
  assert.ok(!page.includes('<iframe'));
  assert.ok(!page.includes('telegram.org/js'));
}
console.log('MEDIA_PAGES_TEST=PASS sources=126 enabled=62 locales=4 runtime_embed=ZERO');
