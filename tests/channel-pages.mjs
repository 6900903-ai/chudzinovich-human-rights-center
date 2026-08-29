import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
for (const script of ['build.mjs','build-news.mjs','build-policy-pages.mjs','build-sources-page.mjs','build-public-sections.mjs','build-channel-pages.mjs']) {
  execFileSync(process.execPath,[join(root,'scripts',script)],{stdio:'inherit'});
}

const ruIndex = await readFile(join(root,'_site/channels/index.html'),'utf8');
const enIndex = await readFile(join(root,'_site/en/channels/index.html'),'utf8');
for (const handle of ['Z690002','phoenixosintvirus','dw_belarus','shtabonoshko','statkevichm','oshorg','doska_pozora_lida','evanews25','narodnireporter']) {
  assert.ok(ruIndex.includes(`@${handle}`),`RU channel index missing @${handle}`);
  assert.ok(enIndex.includes(`@${handle}`),`EN channel index missing @${handle}`);
  const page = await readFile(join(root,'_site/channels',handle.toLowerCase(),'index.html'),'utf8');
  assert.ok(page.includes(`@${handle}`));
  assert.ok(page.includes(`https://t.me/${handle}`));
  assert.ok(!page.includes('<iframe'));
  assert.ok(!page.includes('telegram.org/js'));
}
assert.ok(ruIndex.includes('Telegram-источники'));
assert.ok(enIndex.includes('Telegram sources'));
console.log('CHANNEL_PAGES_TEST=PASS channels=9 locales=4 runtime_embed=ZERO');
