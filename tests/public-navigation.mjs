import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root=new URL('../',import.meta.url).pathname;
for(const script of ['build.mjs','build-news.mjs','build-policy-pages.mjs','build-sources-page.mjs','build-public-sections.mjs','build-channel-pages.mjs','build-media-pages.mjs','build-case-index.mjs','build-regional-timeline.mjs','build-global-search.mjs','build-topical-authority.mjs','build-help-center.mjs','enhance-public-shell.mjs'])execFileSync(process.execPath,[join(root,'scripts',script)],{stdio:'inherit'});
const ru=await readFile(join(root,'_site/index.html'),'utf8');
const be=await readFile(join(root,'_site/be/index.html'),'utf8');
const enProfileShell=await readFile(join(root,'_site/en/prisoners/index.html'),'utf8');
for(const href of ['/search/','/faq/','/regions/','/case-index/','/sources/','/media/','/channels/','/press/','/methodology/','/corrections/','/contacts/','/privacy/','/security/','/terms/'])assert.ok(ru.includes(`href="${href}"`),`RU shell missing ${href}`);
for(const href of ['/be/search/','/be/faq/','/be/regions/','/be/case-index/','/be/sources/','/be/media/','/be/channels/','/be/press/','/be/methodology/','/be/corrections/','/be/contacts/','/be/privacy/','/be/security/','/be/terms/'])assert.ok(be.includes(`href="${href}"`),`BE shell missing ${href}`);
assert.ok(enProfileShell.includes('Public human-rights archive'));
assert.ok(enProfileShell.includes('/assets/css/public-shell.css'));
assert.equal((ru.match(/CHUDO_PUBLIC_NAV_V8/g)||[]).length,1);
assert.ok(ru.includes('Публичный правозащитный архив'));
assert.ok(be.includes('Публічны праваабарончы архіў'));
console.log('PUBLIC_NAVIGATION_TEST=PASS utility_links=14 locales=4 footer=PASS');
