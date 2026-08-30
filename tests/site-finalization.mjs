import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createSitemapArtifacts, sitemapLocs } from '../scripts/lib/sitemap.mjs';

const root=new URL('../',import.meta.url).pathname;
for(const script of ['build.mjs','build-news.mjs','build-news-indexes.mjs','build-policy-pages.mjs','build-sources-page.mjs','build-public-sections.mjs','build-channel-pages.mjs','build-media-pages.mjs','build-case-index.mjs','build-global-search.mjs','enhance-public-shell.mjs','finalize-site.mjs'])execFileSync(process.execPath,[join(root,'scripts',script)],{stdio:'inherit'});
const sitemap=await readFile(join(root,'_site/sitemap.xml'),'utf8');
const robots=await readFile(join(root,'_site/robots.txt'),'utf8');
const search=await readFile(join(root,'_site/search/index.html'),'utf8');
const notFound=await readFile(join(root,'_site/404.html'),'utf8');
const mediaDetail=await readFile(join(root,'_site/media/zerkalo/index.html'),'utf8');
const channelDetail=await readFile(join(root,'_site/channels/evanews25/index.html'),'utf8');
const newsArchive=await readFile(join(root,'_site/news/archive/index.html'),'utf8');
const caseIndex=await readFile(join(root,'_site/case-index/index.html'),'utf8');

assert.ok(sitemap.includes('https://chudzinovich.pp.ua/media/'));
assert.ok(sitemap.includes('https://chudzinovich.pp.ua/channels/'));
assert.ok(sitemap.includes('https://chudzinovich.pp.ua/news/'));
assert.ok(!sitemap.includes('https://chudzinovich.pp.ua/media/zerkalo/'));
assert.ok(!sitemap.includes('https://chudzinovich.pp.ua/channels/evanews25/'));
assert.ok(!sitemap.includes('https://chudzinovich.pp.ua/en/media/nasha-niva/'));
assert.ok(!sitemap.includes('/news/archive/'));
assert.ok(!sitemap.includes('/news/kind/'));
assert.ok(!sitemap.includes('/news/page/'));
assert.ok(!sitemap.includes('/search/'));
assert.ok(!sitemap.includes('/404.html'));
assert.ok(!sitemap.includes('/case-index/'));
assert.equal((sitemap.match(/<loc>/g)||[]).length,new Set([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(x=>x[1])).size);
assert.equal(robots,'User-agent: *\nAllow: /\nSitemap: https://chudzinovich.pp.ua/sitemap.xml\n');
for(const page of [search,notFound,mediaDetail,channelDetail,newsArchive,caseIndex])assert.ok(page.includes('<meta name="robots" content="noindex,follow">'));
assert.ok(notFound.includes('CHUDO HUMAN RIGHTS CENTER'));

const projected=Array.from({length:25001},(_,index)=>({url:`https://chudzinovich.pp.ua/person/p-${String(index+1).padStart(7,'0')}/`,lastmod:null}));
const sharded=createSitemapArtifacts(projected,{site:'https://chudzinovich.pp.ua',shardSize:10000});
assert.equal(sharded.sharded,true);
assert.equal(sharded.shard_count,3);
assert.equal(sharded.files.length,4);
assert.equal(sharded.files[0].name,'sitemap.xml');
assert.ok(sharded.files[0].xml.includes('<sitemapindex'));
assert.deepEqual(sitemapLocs(sharded.files[0].xml),[
  'https://chudzinovich.pp.ua/sitemap-001.xml',
  'https://chudzinovich.pp.ua/sitemap-002.xml',
  'https://chudzinovich.pp.ua/sitemap-003.xml'
]);
assert.deepEqual(sharded.files.slice(1).map(file=>file.count),[10000,10000,5001]);
const shardUrls=sharded.files.slice(1).flatMap(file=>sitemapLocs(file.xml));
assert.equal(shardUrls.length,25001);
assert.equal(new Set(shardUrls).size,25001);

console.log(`SITE_FINALIZATION_TEST=PASS sitemap_urls=${(sitemap.match(/<loc>/g)||[]).length} robots=PASS 404=PASS search_noindex=PASS derivative_noindex=PASS empty_database_noindex=PASS sitemap_sharding=PASS`);
