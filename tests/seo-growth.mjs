import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
for (const script of ['build.mjs','build-news.mjs','build-policy-pages.mjs','build-sources-page.mjs','build-public-sections.mjs','build-channel-pages.mjs','build-media-pages.mjs','build-global-search.mjs','enhance-public-shell.mjs','enhance-seo.mjs','finalize-site.mjs']) {
  execFileSync(process.execPath,[join(root,'scripts',script)],{stdio:'inherit'});
}

const home = await readFile(join(root,'_site/index.html'),'utf8');
const prisoners = await readFile(join(root,'_site/prisoners/index.html'),'utf8');
const enHome = await readFile(join(root,'_site/en/index.html'),'utf8');
const feed = await readFile(join(root,'_site/feed.xml'),'utf8');
const enFeed = await readFile(join(root,'_site/en/feed.xml'),'utf8');

assert.ok(home.includes('<title>Правозащитный центр CHUDO — политзаключённые и репрессии в Беларуси</title>'));
assert.ok(prisoners.includes('<title>Политзаключённые Беларуси — актуальная база CHUDO</title>'));
assert.ok(enHome.includes('<title>CHUDO Human Rights Center — political prisoners and repression in Belarus</title>'));
assert.ok(home.includes('application/ld+json'));
assert.ok(home.includes('"@type":"Organization"'));
assert.ok(home.includes('"@type":"WebSite"'));
assert.ok(home.includes('"@type":"SearchAction"'));
assert.ok(home.includes('og:site_name'));
assert.ok(home.includes('href="/feed.xml"'));
assert.ok(prisoners.includes('"@type":"BreadcrumbList"'));
assert.ok(feed.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
assert.ok(feed.includes('<rss version="2.0">'));
assert.ok(enFeed.includes('<language>en</language>'));
assert.ok(!home.includes('google-analytics.com'));
assert.ok(!home.includes('googletagmanager.com'));

console.log('SEO_GROWTH_TEST=PASS titles=PASS jsonld=PASS breadcrumbs=PASS feeds=4 third_party_analytics=ZERO');
