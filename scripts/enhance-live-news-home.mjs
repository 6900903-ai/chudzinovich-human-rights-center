import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeText } from './lib/fs.mjs';
import { resolvePublicDataDir } from './lib/public-data.mjs';
import { localizedNewsValue, newsRelativePath } from './lib/news.mjs';
import { loadTelegramRegistry } from './lib/telegram-registry.mjs';
import { loadCombinedPublicNews } from './lib/telegram-feed.mjs';
import { esc } from './templates.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=join(root,'_site');
const dataDir=resolvePublicDataDir(root);
const registry=await loadTelegramRegistry();
const news=(await loadCombinedPublicNews(root,dataDir,registry)).slice(0,6);
const copy={
 ru:{latest:'Последние материалы',all:'ВСЕ НОВОСТИ',empty:'Опубликованных материалов пока нет.'},
 be:{latest:'Апошнія матэрыялы',all:'УСЕ НАВІНЫ',empty:'Апублікаваных матэрыялаў пакуль няма.'},
 en:{latest:'Latest materials',all:'ALL NEWS',empty:'No published materials yet.'},
 pl:{latest:'Najnowsze materiały',all:'WSZYSTKIE AKTUALNOŚCI',empty:'Brak opublikowanych materiałów.'}
};
function route(lang,path){return lang==='ru'?path:`/${lang}${path}`;}
function file(lang){return join(out,lang==='ru'?'':lang,'index.html');}
function cards(lang){if(!news.length)return `<div class="empty-state"><p>${esc(copy[lang].empty)}</p></div>`;return `<div class="news-grid">${news.map(item=>`<article class="tech-news-card"><p class="eyebrow">${esc(item.source_name)}</p><h3><a href="${route(lang,newsRelativePath(item))}">${esc(localizedNewsValue(item.title,lang))}</a></h3><p>${esc(localizedNewsValue(item.summary,lang))}</p></article>`).join('')}</div>`;}
for(const lang of ['ru','be','en','pl']){
  const path=file(lang);let html=await readFile(path,'utf8');const needle=`<h2>${esc(copy[lang].latest)}</h2>`;const at=html.indexOf(needle);if(at<0)throw new Error(`HOME_LATEST_SECTION_MISSING:${lang}`);
  const start=html.lastIndexOf('<section class="container page">',at),end=html.indexOf('</section>',at);if(start<0||end<0)throw new Error(`HOME_LATEST_SECTION_BOUNDS_INVALID:${lang}`);
  const section=`<section class="container page"><div class="catalog-head"><div><p class="eyebrow">CHUDO</p><h2>${esc(copy[lang].latest)}</h2></div><a class="secondary-btn" href="${route(lang,'/news/')}">${esc(copy[lang].all)}</a></div>${cards(lang)}</section>`;
  html=html.slice(0,start)+section+html.slice(end+'</section>'.length);await writeText(path,html);
}
console.log(`LIVE_NEWS_HOME_ENHANCE=PASS news=${news.length}`);
