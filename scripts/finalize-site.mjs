import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeText } from './lib/fs.mjs';
import { resolvePublicDataDir } from './lib/public-data.mjs';
import { loadTelegramRegistry } from './lib/telegram-registry.mjs';
import { loadMediaRegistry } from './lib/media-registry.mjs';
import { loadCombinedPublicNewsWithMedia } from './lib/media-feed.mjs';
import { newsRelativePath } from './lib/news.mjs';
import { layout, esc } from './templates.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=join(root,'_site');
const dataDir=resolvePublicDataDir(root);
const SITE='https://chudzinovich.pp.ua';
const langs=['ru','be','en','pl'];

async function htmlFiles(dir){const entries=await readdir(dir,{withFileTypes:true});const files=[];for(const entry of entries){const path=join(dir,entry.name);if(entry.isDirectory())files.push(...await htmlFiles(path));else if(entry.isFile()&&entry.name.endsWith('.html'))files.push(path);}return files;}
function urlPath(file){const rel=relative(out,file).split(sep).join('/');if(rel==='index.html')return'/';if(rel.endsWith('/index.html'))return`/${rel.slice(0,-'index.html'.length)}`;return`/${rel}`;}
function logicalPath(path){return path.replace(/^\/(?:be|en|pl)(?=\/)/,'')||'/';}
function xmlEscape(value){return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');}
function sitemapLastmod(html){const raw=html.match(/<meta\s+property="article:(?:modified|published)_time"\s+content="([^"]+)"/i)?.[1];if(!raw)return null;const date=new Date(raw);return Number.isNaN(date.getTime())?null:date.toISOString();}
function outputPath(lang,path){const prefix=lang==='ru'?'':lang;const clean=String(path||'/').replace(/^\//,'').replace(/\/$/,'');return clean?join(out,prefix,clean,'index.html'):join(out,prefix,'index.html');}

async function ensureNoIndex(path){
  try{
    let html=await readFile(path,'utf8');
    if(/<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html))return false;
    if(/<meta\s+name=["']robots["']/i.test(html)){
      html=html.replace(/<meta\s+name=["']robots["']\s+content=["'][^"']*["']\s*\/?>/i,'<meta name="robots" content="noindex,follow">');
    }else if(html.includes('<meta name="description"')){
      html=html.replace('<meta name="description"','<meta name="robots" content="noindex,follow">\n<meta name="description"');
    }else{
      html=html.replace('</head>','<meta name="robots" content="noindex,follow">\n</head>');
    }
    await writeText(path,html);
    return true;
  }catch(error){if(error?.code==='ENOENT')return false;throw error;}
}

let noindexApplied=0;
for(const lang of langs)if(await ensureNoIndex(outputPath(lang,'/search/')))noindexApplied++;

const manifest=await readJson(join(dataDir,'manifest.json'));
if(manifest.publication_state!=='PUBLISHED'){
  for(const lang of langs){
    for(const path of ['/prisoners/','/former-prisoners/','/repressed/','/prisons/','/case-index/','/judges/','/prosecutors/','/criminal-code/']){
      if(await ensureNoIndex(outputPath(lang,path)))noindexApplied++;
    }
  }
}

const telegramRegistry=await loadTelegramRegistry();
const mediaRegistry=await loadMediaRegistry();
const news=await loadCombinedPublicNewsWithMedia(root,dataDir,telegramRegistry,mediaRegistry);
const sourceOnlyNews=news.filter(item=>item.source_claim_only===true||item.publication_state==='PUBLIC_DISPUTED');
for(const item of sourceOnlyNews){
  for(const lang of langs)if(await ensureNoIndex(outputPath(lang,newsRelativePath(item))))noindexApplied++;
}

// Google should discover the useful hub pages, but not hundreds of automatically
// generated source-detail/archive/pagination pages that add little original CHUDO value.
let derivativeNoindex=0;
for(const file of await htmlFiles(out)){
  const path=urlPath(file);
  const logical=logicalPath(path);
  const derivative =
    /^\/media\/[^/]+\/$/.test(logical) ||
    /^\/channels\/[^/]+\/$/.test(logical) ||
    /^\/news\/page\/\d+\/$/.test(logical) ||
    /^\/news\/kind\//.test(logical) ||
    /^\/news\/archive\//.test(logical);
  if(derivative&&await ensureNoIndex(file)){noindexApplied++;derivativeNoindex++;}
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
console.log(`SITE_FINALIZE=PASS sitemap_urls=${entries.length} dated=${entries.filter(x=>x.lastmod).length} noindex_applied=${noindexApplied} derivative_noindex=${derivativeNoindex} source_only_noindex=${sourceOnlyNews.length*langs.length} publication_state=${manifest.publication_state} robots=PASS 404=PASS`);
