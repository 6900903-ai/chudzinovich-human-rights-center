import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { loadTelegramRegistry } from '../scripts/lib/telegram-registry.mjs';
import { loadMediaRegistry } from '../scripts/lib/media-registry.mjs';
import { loadCombinedPublicNewsWithMedia } from '../scripts/lib/media-feed.mjs';

const root=new URL('../',import.meta.url).pathname;
for(const script of ['build.mjs','build-news.mjs','build-news-indexes.mjs'])execFileSync(process.execPath,[join(root,'scripts',script)],{stdio:'inherit'});
const telegram=await loadTelegramRegistry();const media=await loadMediaRegistry();const news=await loadCombinedPublicNewsWithMedia(root,join(root,'data/public/current'),telegram,media);
const index=await readFile(join(root,'_site/news/index.html'),'utf8');
const cards=(index.match(/class="tech-news-card"/g)||[]).length;
assert.ok(cards<=36);
assert.ok(index.includes('/news/kind/telegram/'));
assert.ok(index.includes('/news/kind/media/'));
assert.ok(index.includes('/news/archive/'));
const tg=await readFile(join(root,'_site/news/kind/telegram/index.html'),'utf8');
const md=await readFile(join(root,'_site/news/kind/media/index.html'),'utf8');
assert.ok(tg.includes('Telegram'));
assert.ok(md.includes('СМИ'));
const archive=await readFile(join(root,'_site/news/archive/index.html'),'utf8');
assert.ok(archive.includes('/news/archive/'));
if(news.length>36){await access(join(root,'_site/news/page/2/index.html'));const page2=await readFile(join(root,'_site/news/page/2/index.html'),'utf8');assert.ok(page2.includes('rel="prev"'));}
console.log(`NEWS_INDEXES_TEST=PASS total=${news.length} first_page_cards=${cards} pagination=PASS kind_archives=PASS month_archive=PASS`);
