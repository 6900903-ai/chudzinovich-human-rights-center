import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const root=new URL('../',import.meta.url).pathname;
execFileSync(process.platform==='win32'?'npm.cmd':'npm',['run','build'],{cwd:root,stdio:'inherit'});
const out=join(root,'_site');
const langs=['ru','be','en','pl'];
const prefix={ru:'',be:'be/',en:'en/',pl:'pl/'};
const slugs=['political-prisoner-status','verify-repression-record','source-attribution','cite-the-database','data-quality-report-2026-08'];
async function text(path){return readFile(join(out,path),'utf8');}
async function exists(path){try{return(await stat(join(out,path))).isFile();}catch{return false;}}
function plain(html){return html.replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&[a-z#0-9]+;/gi,' ').replace(/\s+/g,' ').trim();}

let articles=0;let minimumWords=Infinity;
for(const lang of langs){
  const hubPath=`${prefix[lang]}guides/index.html`;assert.ok(await exists(hubPath),`Missing ${hubPath}`);const hub=await text(hubPath);assert.ok(!hub.includes('content="noindex'),`Hub noindex ${lang}`);assert.ok(hub.includes('"@type":"CollectionPage"'));assert.ok(hub.includes('/guides/political-prisoner-status/'));assert.ok(hub.includes('/guides/data-quality-report-2026-08/'));
  for(const slug of slugs){
    const path=`${prefix[lang]}guides/${slug}/index.html`;assert.ok(await exists(path),`Missing ${path}`);const html=await text(path);articles++;
    assert.ok(!html.includes('content="noindex'),`Article noindex ${path}`);
    assert.ok(html.includes('property="article:published_time"'),`No published date ${path}`);
    assert.ok(html.includes('"@type":"Article"'),`No Article schema ${path}`);
    assert.ok(html.includes('"@type":"BreadcrumbList"'),`No breadcrumbs schema ${path}`);
    assert.ok(html.includes('CHUDO Human Rights Center'),`No publisher ${path}`);
    assert.ok(html.includes('/assets/css/search-guides.css'),`No guide stylesheet ${path}`);
    assert.ok(html.includes('data-guides-link'),`No global guide link ${path}`);
    const main=html.match(/<article class="container page original-guide">([\s\S]*?)<\/article>/i)?.[1]||'';
    const count=plain(main).split(/\s+/).filter(Boolean).length;minimumWords=Math.min(minimumWords,count);assert.ok(count>=180,`Thin guide ${path}: ${count}`);
    if(slug==='political-prisoner-status')assert.ok(html.includes('https://pace.coe.int/en/files/19150/html'),`PACE citation missing ${path}`);
    if(slug==='data-quality-report-2026-08'){
      assert.match(plain(main),/5[\s ]*000|5,000/);assert.match(plain(main),/не опублик|не быў апублікаваны|not published|nie zostały opublikowane/i);
    }
  }
  const home=await text(`${prefix[lang]}index.html`);assert.ok(home.includes('data-original-authority-home'),`Homepage original section missing ${lang}`);assert.ok(home.includes(`${lang==='ru'?'':`/${lang}`}/guides/`),`Homepage guide link missing ${lang}`);assert.ok(home.includes('/assets/css/search-guides.css'),`Homepage guide CSS missing ${lang}`);
}
assert.equal(articles,20);
const sitemap=await text('sitemap.xml');
for(const lang of langs)for(const slug of slugs){const url=`https://chudzinovich.pp.ua${lang==='ru'?'':`/${lang}`}/guides/${slug}/`;assert.ok(sitemap.includes(`<loc>${url}</loc>`),`Sitemap missing ${url}`);}
for(const lang of langs){const url=`https://chudzinovich.pp.ua${lang==='ru'?'':`/${lang}`}/guides/`;assert.ok(sitemap.includes(`<loc>${url}</loc>`),`Sitemap missing hub ${url}`);}
const css=await text('assets/css/search-guides.css');assert.ok(css.length>1000);assert.ok(!/url\s*\(\s*['"]?https?:/i.test(css));
const mainJs=await text('assets/js/main.js');assert.ok(!/https?:\/\//.test(mainJs));
console.log(`ORIGINAL_SEARCH_AUTHORITY_TEST=PASS hubs=4 articles=${articles} min_visible_words=${minimumWords} sitemap=PASS home_links=PASS external_runtime=ZERO`);
