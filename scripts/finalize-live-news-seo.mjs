import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeText } from './lib/fs.mjs';
import { resolvePublicDataDir } from './lib/public-data.mjs';
import { localizedNewsValue, newsRelativePath } from './lib/news.mjs';
import { loadTelegramRegistry } from './lib/telegram-registry.mjs';
import { loadMediaRegistry } from './lib/media-registry.mjs';
import { loadCombinedPublicNewsWithMedia } from './lib/media-feed.mjs';
import { route } from './templates.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=join(root,'_site');
const dataDir=resolvePublicDataDir(root);
const SITE='https://chudzinovich.pp.ua';
const telegramRegistry=await loadTelegramRegistry();
const mediaRegistry=await loadMediaRegistry();
const news=await loadCombinedPublicNewsWithMedia(root,dataDir,telegramRegistry,mediaRegistry);
const langs=['ru','be','en','pl'];

function xml(value=''){return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');}
function absolute(lang,path){return `${SITE}${route(lang,path)}`;}
function rssDate(value){const d=new Date(value);return Number.isNaN(d.getTime())?new Date(0).toUTCString():d.toUTCString();}
function output(lang,name){return join(out,lang==='ru'?'':lang,name);}

for(const lang of langs){
  const title=({ru:'Правозащитный центр CHUDO — новости',be:'Праваабарончы цэнтр CHUDO — навіны',en:'CHUDO Human Rights Center — News',pl:'Centrum Praw Człowieka CHUDO — Aktualności'})[lang];
  const description=({ru:'Свежие публикации CHUDO из зарегистрированных Telegram-каналов, белорусских СМИ и других публичных источников.',be:'Свежыя публікацыі CHUDO з зарэгістраваных Telegram-каналаў, беларускіх СМІ і іншых публічных крыніц.',en:'Latest CHUDO publications from registered Telegram channels, Belarus media and other public sources.',pl:'Najnowsze publikacje CHUDO z zarejestrowanych kanałów Telegram, białoruskich mediów i innych źródeł publicznych.'})[lang];
  const entries=news.slice(0,100).map(item=>{
    const link=absolute(lang,newsRelativePath(item));
    return `<item><title>${xml(localizedNewsValue(item.title,lang))}</title><link>${xml(link)}</link><guid isPermaLink="true">${xml(link)}</guid><description>${xml(localizedNewsValue(item.summary,lang))}</description><pubDate>${xml(rssDate(item.published_at))}</pubDate><source url="${xml(item.source_url)}">${xml(item.source_name)}</source></item>`;
  }).join('');
  const rss=`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${xml(title)}</title><link>${xml(absolute(lang,'/news/'))}</link><description>${xml(description)}</description><language>${lang}</language><lastBuildDate>${xml(new Date().toUTCString())}</lastBuildDate>${entries}</channel></rss>\n`;
  await writeText(output(lang,'feed.xml'),rss);
}

const googleNewsEligible=news.filter(item=>item.source_claim_only!==true&&item.publication_state!=='PUBLIC_DISPUTED');
const now=Date.now();
const twoDays=48*60*60*1000;
const fresh=googleNewsEligible.filter(item=>{const t=new Date(item.published_at).getTime();return Number.isFinite(t)&&t<=now+5*60*1000&&now-t<=twoDays;}).slice(0,1000);
const newsMap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${fresh.map(item=>`  <url><loc>${xml(absolute('ru',newsRelativePath(item)))}</loc><news:news><news:publication><news:name>CHUDO Human Rights Center</news:name><news:language>ru</news:language></news:publication><news:publication_date>${xml(new Date(item.published_at).toISOString())}</news:publication_date><news:title>${xml(localizedNewsValue(item.title,'ru'))}</news:title></news:news></url>`).join('\n')}\n</urlset>\n`;
await writeText(join(out,'news-sitemap.xml'),newsMap);

const robotsPath=join(out,'robots.txt');
let robots=await readFile(robotsPath,'utf8');
const newsSitemap=`Sitemap: ${SITE}/news-sitemap.xml`;
if(!robots.includes(newsSitemap))robots=robots.trimEnd()+`\n${newsSitemap}\n`;
await writeText(robotsPath,robots);
console.log(`LIVE_NEWS_SEO_FINALIZE=PASS rss_entries=${Math.min(news.length,100)} total_news=${news.length} google_news_eligible=${googleNewsEligible.length} fresh_news_sitemap=${fresh.length} locales=4`);
