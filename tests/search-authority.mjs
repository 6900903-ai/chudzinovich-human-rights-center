import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const root=new URL('../',import.meta.url).pathname;
execFileSync(process.platform==='win32'?'npm.cmd':'npm',['run','build'],{cwd:root,stdio:'inherit'});
const out=join(root,'_site');

async function text(path){return readFile(join(out,path),'utf8');}
async function exists(path){try{return(await stat(join(out,path))).isFile();}catch{return false;}}
function description(html){return html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1]||'';}
function title(html){return html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||'';}

for(const path of ['assets/brand/social-card.png','assets/brand/icon-512.png','assets/brand/favicon.svg','manifest.webmanifest','sitemap-index.xml','humans.txt','.well-known/security.txt','search-authority.json'])assert.ok(await exists(path),`Missing ${path}`);
for(const path of ['editorial-policy/index.html','be/editorial-policy/index.html','en/editorial-policy/index.html','pl/editorial-policy/index.html'])assert.ok(await exists(path),`Missing ${path}`);

const social=await readFile(join(out,'assets/brand/social-card.png'));
assert.deepEqual([...social.subarray(0,8)],[137,80,78,71,13,10,26,10]);
assert.equal(social.readUInt32BE(16),1200);
assert.equal(social.readUInt32BE(20),630);
const icon=await readFile(join(out,'assets/brand/icon-512.png'));
assert.equal(icon.readUInt32BE(16),512);
assert.equal(icon.readUInt32BE(20),512);

const home=await text('index.html');
assert.match(title(home),/Правозащитный центр CHUDO/);
assert.match(title(home),/репрессии в Беларуси/);
assert.ok(description(home).length>=110&&description(home).length<=190,`Home description length ${description(home).length}`);
assert.ok(home.includes('<meta name="twitter:card" content="summary_large_image">'));
assert.ok(home.includes('property="og:image" content="https://chudzinovich.pp.ua/assets/brand/social-card.png"'));
assert.ok(home.includes('rel="icon" href="/assets/brand/favicon.svg"'));
assert.ok(home.includes('rel="manifest" href="/manifest.webmanifest"'));
assert.ok(home.includes('CHUDO_SEARCH_AUTHORITY_V1'));
assert.ok(home.includes('"@type":"Organization"'));
assert.ok(home.includes('"@type":"WebSite"'));
assert.ok(home.includes('https://t.me/Z690002'));
assert.ok(home.includes('data-editorial-policy-link'));

const policy=await text('editorial-policy/index.html');
assert.ok(!policy.includes('content="noindex'));
assert.match(policy,/Источник не равен установленному факту/);
assert.match(policy,/Статус политзаключённого/);
assert.ok(policy.includes('"@type":"Article"'));
assert.ok(description(policy).length>=100);

const highValue=['index.html','about/index.html','methodology/index.html','sources/index.html','corrections/index.html','help/index.html','monitoring/index.html','reports/index.html','news/index.html','media/index.html','channels/index.html','videos/index.html','privacy/index.html','security/index.html','contacts/index.html'];
for(const path of highValue){const html=await text(path);assert.ok(title(html).length>=30,`Short title ${path}: ${title(html)}`);assert.ok(description(html).length>=90,`Short description ${path}: ${description(html).length}`);assert.ok(html.includes('property="og:image"'),`No OG image ${path}`);assert.ok(html.includes('name="author" content="CHUDO Human Rights Center"'),`No author ${path}`);}

const sitemapIndex=await text('sitemap-index.xml');
assert.ok(sitemapIndex.includes('<sitemapindex'));
assert.ok(sitemapIndex.includes('https://chudzinovich.pp.ua/sitemap.xml'));
assert.ok(sitemapIndex.includes('https://chudzinovich.pp.ua/news-sitemap.xml'));
const robots=await text('robots.txt');
assert.ok(robots.includes('Sitemap: https://chudzinovich.pp.ua/sitemap-index.xml'));
assert.ok(robots.includes('Sitemap: https://chudzinovich.pp.ua/sitemap.xml'));
assert.ok(robots.includes('Sitemap: https://chudzinovich.pp.ua/news-sitemap.xml'));
const sitemap=await text('sitemap.xml');
assert.ok(sitemap.includes('<loc>https://chudzinovich.pp.ua/editorial-policy/</loc>'));
assert.ok(sitemap.includes('<loc>https://chudzinovich.pp.ua/en/editorial-policy/</loc>'));

const manifest=JSON.parse(await text('manifest.webmanifest'));
assert.equal(manifest.name,'CHUDO Human Rights Center');
assert.equal(manifest.theme_color,'#0A2540');
assert.ok(manifest.icons.some(item=>item.src==='/assets/brand/icon-512.png'));
const report=JSON.parse(await text('search-authority.json'));
assert.ok(report.optimized_high_value_pages>=50);
assert.equal(report.organization_identity_pages,4);
assert.ok((await text('.well-known/security.txt')).includes('Canonical: https://chudzinovich.pp.ua/.well-known/security.txt'));
console.log(`SEARCH_AUTHORITY_TEST=PASS optimized=${report.optimized_high_value_pages} identity=${report.organization_identity_pages} policy=4 social=1200x630 sitemap_index=PASS`);
