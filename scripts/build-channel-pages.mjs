import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeText } from './lib/fs.mjs';
import { resolvePublicDataDir } from './lib/public-data.mjs';
import { loadTelegramRegistry } from './lib/telegram-registry.mjs';
import { localizedNewsValue, newsRelativePath } from './lib/news.mjs';
import { loadCombinedPublicNews } from './lib/telegram-feed.mjs';
import { layout, route, esc } from './templates.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = join(root,'_site');
const dataDir = resolvePublicDataDir(root);
const registry = await loadTelegramRegistry();
const news = await loadCombinedPublicNews(root,dataDir,registry);
const channels = registry.channels.filter(x => x.publication_enabled === true);
const langs = ['ru','be','en','pl'];

const COPY = {
 ru:{title:'Telegram-источники',intro:'Зарегистрированные каналы, материалы которых CHUDO публикует с указанием источника и ссылкой на оригинал.',materials:'Материалы канала',empty:'Опубликованных материалов этого канала пока нет.',original:'Открыть канал',back:'Все Telegram-источники',claim:'Материалы на этой странице являются публикациями указанного источника.'},
 be:{title:'Telegram-крыніцы',intro:'Зарэгістраваныя каналы, матэрыялы якіх CHUDO публікуе з указаннем крыніцы і спасылкай на арыгінал.',materials:'Матэрыялы канала',empty:'Апублікаваных матэрыялаў гэтага канала пакуль няма.',original:'Адкрыць канал',back:'Усе Telegram-крыніцы',claim:'Матэрыялы на гэтай старонцы з’яўляюцца публікацыямі названай крыніцы.'},
 en:{title:'Telegram sources',intro:'Registered channels whose materials CHUDO publishes with source attribution and an original-post link.',materials:'Channel materials',empty:'No published materials from this channel yet.',original:'Open channel',back:'All Telegram sources',claim:'Materials on this page are publications of the named source.'},
 pl:{title:'Źródła Telegram',intro:'Zarejestrowane kanały, których materiały CHUDO publikuje z podaniem źródła i linkiem do oryginału.',materials:'Materiały kanału',empty:'Brak opublikowanych materiałów z tego kanału.',original:'Otwórz kanał',back:'Wszystkie źródła Telegram',claim:'Materiały na tej stronie są publikacjami wskazanego źródła.'}
};
function outputPath(lang,path){const prefix=lang==='ru'?'':lang;const clean=String(path).replace(/^\//,'').replace(/\/$/,'');return join(out,prefix,clean,'index.html');}
function channelPath(source){return `/channels/${source.handle.toLowerCase()}/`;}
function itemsFor(source){return news.filter(item=>item.source_kind==='TELEGRAM'&&item.source_id===source.source_id);}
function card(source,lang){return `<article class="person-card"><div class="person-card-main"><p class="eyebrow">@${esc(source.handle)}</p><h2><a href="${route(lang,channelPath(source))}">${esc(source.display_name)}</a></h2><p class="card-meta">${esc(source.source_class||'TELEGRAM')} · ${itemsFor(source).length}</p></div></article>`;}
function material(item,lang){return `<article class="tech-news-card"><p class="eyebrow">${esc(item.source_name)}</p><h2 class="tech-news-title"><a href="${route(lang,newsRelativePath(item))}">${esc(localizedNewsValue(item.title,lang))}</a></h2><p class="tech-news-summary">${esc(localizedNewsValue(item.summary,lang))}</p></article>`;}
function indexBody(lang){const c=COPY[lang];return `<article class="container page"><p class="eyebrow">CHUDO HUMAN RIGHTS CENTER</p><h1>${esc(c.title)}</h1><p class="catalog-note">${esc(c.intro)}</p><div class="people-grid">${channels.map(x=>card(x,lang)).join('')}</div></article>`;}
function channelBody(source,lang){const c=COPY[lang],items=itemsFor(source);return `<article class="container page"><p class="eyebrow">TELEGRAM · @${esc(source.handle)}</p><h1>${esc(source.display_name)}</h1><p class="catalog-note">${esc(c.claim)}</p><p><a class="secondary-btn" href="${esc(source.canonical_url)}" rel="external nofollow noopener">${esc(c.original)}</a> <a class="secondary-btn" href="${route(lang,'/channels/')}">${esc(c.back)}</a></p><section class="profile-section"><h2>${esc(c.materials)} · ${items.length}</h2>${items.length?`<div class="news-grid">${items.map(x=>material(x,lang)).join('')}</div>`:`<div class="empty-state"><p>${esc(c.empty)}</p></div>`}</section></article>`;}
for(const lang of langs){const c=COPY[lang];await writeText(outputPath(lang,'/channels/'),layout({lang,title:c.title,description:c.intro,path:'/channels/',body:indexBody(lang)}));for(const source of channels){const path=channelPath(source);await writeText(outputPath(lang,path),layout({lang,title:`${source.display_name} — ${c.title}`,description:c.claim,path,body:channelBody(source,lang)}));}}
console.log(`CHANNEL_ARCHIVE_BUILD=PASS channels=${channels.length} materials=${news.filter(x=>x.source_kind==='TELEGRAM').length}`);
