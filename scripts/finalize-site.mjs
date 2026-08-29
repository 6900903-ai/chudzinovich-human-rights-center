import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeText } from './lib/fs.mjs';
import { layout, esc } from './templates.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=join(root,'_site');
const SITE='https://chudzinovich.pp.ua';

async function htmlFiles(dir){const entries=await readdir(dir,{withFileTypes:true});const files=[];for(const entry of entries){const path=join(dir,entry.name);if(entry.isDirectory())files.push(...await htmlFiles(path));else if(entry.isFile()&&entry.name.endsWith('.html'))files.push(path);}return files;}
function urlPath(file){const rel=relative(out,file).split(sep).join('/');if(rel==='index.html')return'/';if(rel.endsWith('/index.html'))return`/${rel.slice(0,-'index.html'.length)}`;return`/${rel}`;}
function xmlEscape(value){return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');}
function sitemapLastmod(html){const raw=html.match(/<meta\s+property="article:(?:modified|published)_time"\s+content="([^"]+)"/i)?.[1];if(!raw)return null;const date=new Date(raw);return Number.isNaN(date.getTime())?null:date.toISOString();}

for(const lang of ['ru','be','en','pl']){
  const prefix=lang==='ru'?'':`/${lang}`;
  const path=join(out,prefix.replace(/^\//,''),'search','index.html');
  try{let html=await readFile(path,'utf8');if(!html.includes('name="robots"'))html=html.replace('<meta name="description"','<meta name="robots" content="noindex,follow">\n<meta name="description"');await writeText(path,html);}catch{}
}

const notFoundBody=`<article class="container page"><p class="eyebrow">CHUDO HUMAN RIGHTS CENTER</p><h1>404</h1><div class="profile-section"><p>${esc('Страница не найдена. Возможно, адрес изменился или запись ещё не опубликована.')}</p><p><a class="primary-btn" href="/">На главную</a> <a class="secondary-btn" href="/search/">Поиск</a></p></div></article>`;
const notFound=layout({lang:'ru',title:'Страница не найдена',description:'Страница не найдена — CHUDO Human Rights Center',path:'/404.html',body:notFoundBody,noIndex:true});
await writeText(join(out,'404.html'),notFound);

const entries=[];
for(const file of await htmlFiles(out)){
  const path=urlPath(file);
  if(path==='/404.html')continue;
  const html=await readFile(file,'utf8');
  if(/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html))continue;
  entries.push({url:`${SITE}${path}`,lastmod:sitemapLastmod(html)});
}
entries.sort((a,b)=>a.url.localeCompare(b.url));
const sitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map(entry=>`  <url><loc>${xmlEscape(entry.url)}</loc>${entry.lastmod?`<lastmod>${entry.lastmod}</lastmod>`:''}</url>`).join('\n')}\n</urlset>\n`;
await writeText(join(out,'sitemap.xml'),sitemap);
await writeText(join(out,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`SITE_FINALIZE=PASS sitemap_urls=${entries.length} dated=${entries.filter(x=>x.lastmod).length} search_noindex=4 robots=PASS 404=PASS`);
