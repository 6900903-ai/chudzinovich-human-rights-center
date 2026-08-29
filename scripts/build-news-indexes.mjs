import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeText } from './lib/fs.mjs';
import { resolvePublicDataDir } from './lib/public-data.mjs';
import { localizedNewsValue, newsRelativePath } from './lib/news.mjs';
import { loadTelegramRegistry } from './lib/telegram-registry.mjs';
import { loadMediaRegistry } from './lib/media-registry.mjs';
import { loadCombinedPublicNewsWithMedia } from './lib/media-feed.mjs';
import { layout, route, esc } from './templates.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=join(root,'_site');
const dataDir=resolvePublicDataDir(root);
const telegramRegistry=await loadTelegramRegistry();
const mediaRegistry=await loadMediaRegistry();
const news=await loadCombinedPublicNewsWithMedia(root,dataDir,telegramRegistry,mediaRegistry);
const langs=['ru','be','en','pl'];
const PAGE_SIZE=36;

const COPY={
  ru:{title:'Новости и материалы',intro:'Свежие публикации CHUDO из зарегистрированных источников. На этой странице показываются материалы Telegram и заголовки подтверждённых RSS-лент СМИ со ссылками на оригиналы.',telegram:'Telegram',media:'СМИ',videos:'Видео',all:'Все материалы',archive:'Архив по месяцам',page:'Страница',prev:'Назад',next:'Дальше',source:'Источник',empty:'Материалов пока нет.'},
  be:{title:'Навіны і матэрыялы',intro:'Свежыя публікацыі CHUDO з зарэгістраваных крыніц. Тут паказваюцца матэрыялы Telegram і загалоўкі пацверджаных RSS-стужак СМІ са спасылкамі на арыгіналы.',telegram:'Telegram',media:'СМІ',videos:'Відэа',all:'Усе матэрыялы',archive:'Архіў па месяцах',page:'Старонка',prev:'Назад',next:'Далей',source:'Крыніца',empty:'Матэрыялаў пакуль няма.'},
  en:{title:'News and source materials',intro:'Latest CHUDO publications from registered sources. This index includes Telegram items and headlines from verified media RSS feeds with links to the originals.',telegram:'Telegram',media:'Media',videos:'Videos',all:'All materials',archive:'Monthly archive',page:'Page',prev:'Previous',next:'Next',source:'Source',empty:'No materials yet.'},
  pl:{title:'Aktualności i materiały źródłowe',intro:'Najnowsze publikacje CHUDO z zarejestrowanych źródeł. Indeks obejmuje materiały Telegram oraz nagłówki ze zweryfikowanych kanałów RSS mediów z linkami do oryginałów.',telegram:'Telegram',media:'Media',videos:'Wideo',all:'Wszystkie materiały',archive:'Archiwum miesięczne',page:'Strona',prev:'Wstecz',next:'Dalej',source:'Źródło',empty:'Brak materiałów.'}
};

function outputPath(lang,path){const prefix=lang==='ru'?'':lang;const clean=String(path).replace(/^\//,'').replace(/\/$/,'');return join(out,prefix,clean,'index.html');}
function formatDate(value,lang){try{return new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}catch{return value||'';}}
function card(item,lang){return `<article class="tech-news-card"><div class="tech-news-meta"><span class="tech-news-tag">${esc(item.category||item.source_kind)}</span><time class="tech-news-date" datetime="${esc(item.published_at)}">${esc(formatDate(item.published_at,lang))}</time></div><h2 class="tech-news-title"><a href="${route(lang,newsRelativePath(item))}">${esc(localizedNewsValue(item.title,lang))}</a></h2><p class="tech-news-summary">${esc(localizedNewsValue(item.summary,lang))}</p><p class="source-mini">${esc(COPY[lang].source)}: ${esc(item.source_name)}</p></article>`;}
function chunks(items){const out=[];for(let i=0;i<items.length;i+=PAGE_SIZE)out.push(items.slice(i,i+PAGE_SIZE));return out.length?out:[[]];}
function pagePath(base,page){if(page===1)return base;return `${base}page/${page}/`;}
function pageLinks(lang,base,page,total){if(total<=1)return'';const c=COPY[lang];const prev=page>1?`<a class="secondary-btn" rel="prev" href="${route(lang,pagePath(base,page-1))}">← ${esc(c.prev)}</a>`:'';const next=page<total?`<a class="secondary-btn" rel="next" href="${route(lang,pagePath(base,page+1))}">${esc(c.next)} →</a>`:'';return `<nav class="pagination" aria-label="Pagination">${prev}<span>${esc(c.page)} ${page} / ${total}</span>${next}</nav>`;}
function tabs(lang){const c=COPY[lang];return `<nav class="view-switch news-source-tabs" aria-label="News source type"><a href="${route(lang,'/news/')}">${esc(c.all)}</a><a href="${route(lang,'/news/kind/telegram/')}">${esc(c.telegram)}</a><a href="${route(lang,'/news/kind/media/')}">${esc(c.media)}</a><a href="${route(lang,'/videos/')}">${esc(c.videos)}</a><a href="${route(lang,'/news/archive/')}">${esc(c.archive)}</a></nav>`;}
async function collection(lang,{base,title,intro,items}){const pages=chunks(items),total=pages.length;for(let i=0;i<total;i++){const page=i+1,path=pagePath(base,page);const pageTitle=page===1?title:`${title} — ${COPY[lang].page} ${page}`;const body=`<article class="container page news-feed-section"><p class="eyebrow">CHUDO HUMAN RIGHTS CENTER</p><h1>${esc(pageTitle)}</h1><p class="catalog-note">${esc(intro)}</p>${tabs(lang)}${items.length?`<div class="news-grid">${pages[i].map(x=>card(x,lang)).join('')}</div>`:`<div class="empty-state"><p>${esc(COPY[lang].empty)}</p></div>`}${pageLinks(lang,base,page,total)}</article>`;let html=layout({lang,title:pageTitle,description:intro,path,body});const prev=page>1?route(lang,pagePath(base,page-1)):null,next=page<total?route(lang,pagePath(base,page+1)):null;const rels=[prev?`<link rel="prev" href="${prev}">`:'',next?`<link rel="next" href="${next}">`:''].filter(Boolean).join('\n');if(rels)html=html.replace('</head>',`${rels}\n</head>`);await writeText(outputPath(lang,path),html);}}
function monthKey(item){const d=new Date(item.published_at);if(Number.isNaN(d.getTime()))return null;return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;}
function monthTitle(key,lang){const [y,m]=key.split('-').map(Number);try{return new Intl.DateTimeFormat(lang,{year:'numeric',month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,1)));}catch{return key;}}

const months=new Map();for(const item of news){const key=monthKey(item);if(!key)continue;if(!months.has(key))months.set(key,[]);months.get(key).push(item);}
const monthKeys=[...months.keys()].sort().reverse();
for(const lang of langs){
  const c=COPY[lang];
  await collection(lang,{base:'/news/',title:c.title,intro:c.intro,items:news});
  await collection(lang,{base:'/news/kind/telegram/',title:`${c.title} — ${c.telegram}`,intro:c.intro,items:news.filter(x=>x.source_kind==='TELEGRAM')});
  await collection(lang,{base:'/news/kind/media/',title:`${c.title} — ${c.media}`,intro:c.intro,items:news.filter(x=>x.source_kind==='MEDIA')});
  const archiveBody=`<article class="container page"><p class="eyebrow">CHUDO HUMAN RIGHTS CENTER</p><h1>${esc(c.archive)}</h1>${tabs(lang)}<div class="people-grid">${monthKeys.map(key=>`<article class="person-card"><div class="person-card-main"><h2><a href="${route(lang,`/news/archive/${key.slice(0,4)}/${key.slice(5,7)}/`)}">${esc(monthTitle(key,lang))}</a></h2><p class="record-id">${months.get(key).length}</p></div></article>`).join('')}</div></article>`;
  await writeText(outputPath(lang,'/news/archive/'),layout({lang,title:c.archive,description:c.intro,path:'/news/archive/',body:archiveBody}));
  for(const key of monthKeys){const base=`/news/archive/${key.slice(0,4)}/${key.slice(5,7)}/`;await collection(lang,{base,title:`${c.title} — ${monthTitle(key,lang)}`,intro:c.intro,items:months.get(key)});}
}
console.log(`NEWS_INDEXES_BUILD=PASS total=${news.length} pages=${Math.ceil(news.length/PAGE_SIZE)} telegram=${news.filter(x=>x.source_kind==='TELEGRAM').length} media=${news.filter(x=>x.source_kind==='MEDIA').length} months=${monthKeys.length} locales=4`);
