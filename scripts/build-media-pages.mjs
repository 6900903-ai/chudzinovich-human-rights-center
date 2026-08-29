import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeText } from './lib/fs.mjs';
import { resolvePublicDataDir } from './lib/public-data.mjs';
import { loadMediaRegistry } from './lib/media-registry.mjs';
import { loadMediaFeed, mediaMaterialsToNews } from './lib/media-feed.mjs';
import { publicNewsItems, localizedNewsValue, newsRelativePath } from './lib/news.mjs';
import { layout, route, esc } from './templates.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = join(root,'_site');
const dataDir = resolvePublicDataDir(root);
const registry = await loadMediaRegistry();
const canonical = await readJson(join(dataDir,'news.json'));
const mediaFeed = await loadMediaFeed(root,registry);
const news = publicNewsItems([...canonical,...mediaMaterialsToNews(mediaFeed,registry)]);
const sources = [...registry.sources].sort((a,b) => { const active = Number(b.candidate_discovery_enabled === true) - Number(a.candidate_discovery_enabled === true); return active || String(a.name).localeCompare(String(b.name),'en'); });
const enabled = sources.filter(x => x.candidate_discovery_enabled === true);
const langs = ['ru','be','en','pl'];

const COPY = {
  ru:{title:'СМИ и медиапроекты',intro:'Публичный каталог зарегистрированных медиа-источников CHUDO. Для источников с подтверждённой RSS-лентой сайт автоматически показывает заголовок, дату и ссылку на оригинал; полный текст статьи не копируется.',all:'Всего источников',active:'Активно для discovery',materials:'Материалы источника',empty:'Опубликованных материалов этого источника пока нет.',site:'Открыть сайт',back:'Все СМИ',status:'Статус мониторинга',class:'Класс источника',weight:'Роль в подтверждении',domains:'Домены',enabled:'Используется для поиска новых сообщений',disabled:'Сохранён в реестре, автоматический discovery выключен'},
  be:{title:'СМІ і медыяпраекты',intro:'Публічны каталог зарэгістраваных медыя-крыніц CHUDO. Для крыніц з пацверджанай RSS-стужкай сайт аўтаматычна паказвае загаловак, дату і спасылку на арыгінал; поўны тэкст артыкула не капіруецца.',all:'Усяго крыніц',active:'Актыўна для discovery',materials:'Матэрыялы крыніцы',empty:'Апублікаваных матэрыялаў гэтай крыніцы пакуль няма.',site:'Адкрыць сайт',back:'Усе СМІ',status:'Стан маніторынгу',class:'Клас крыніцы',weight:'Роля ў пацвярджэнні',domains:'Дамены',enabled:'Выкарыстоўваецца для пошуку новых паведамленняў',disabled:'Захавана ў рэестры, аўтаматычны discovery выключаны'},
  en:{title:'Media sources',intro:'Public directory of registered CHUDO media sources. For sources with a verified RSS feed, the site automatically shows the headline, date and original link; the article body is not copied.',all:'Total sources',active:'Discovery enabled',materials:'Source materials',empty:'No published materials from this source yet.',site:'Open website',back:'All media',status:'Monitoring state',class:'Source class',weight:'Corroboration role',domains:'Domains',enabled:'Used for discovery of new reports',disabled:'Kept in the registry; automatic discovery is disabled'},
  pl:{title:'Źródła medialne',intro:'Publiczny katalog zarejestrowanych źródeł medialnych CHUDO. Dla źródeł ze zweryfikowanym RSS serwis automatycznie pokazuje nagłówek, datę i link do oryginału; pełny tekst artykułu nie jest kopiowany.',all:'Wszystkie źródła',active:'Aktywne w discovery',materials:'Materiały źródła',empty:'Brak opublikowanych materiałów z tego źródła.',site:'Otwórz stronę',back:'Wszystkie media',status:'Stan monitoringu',class:'Klasa źródła',weight:'Rola w potwierdzaniu',domains:'Domeny',enabled:'Używane do wyszukiwania nowych doniesień',disabled:'Zachowane w rejestrze; automatyczne discovery wyłączone'}
};

function outputPath(lang,path){const prefix=lang==='ru'?'':lang;const clean=String(path).replace(/^\//,'').replace(/\/$/,'');return join(out,prefix,clean,'index.html');}
function sourcePath(source){return `/media/${source.source_id.replace(/^src-/,'')}/`;}
function itemsFor(source){return news.filter(item => item.source_kind === 'MEDIA' && item.source_id === source.source_id);}
function human(value){return String(value || '').replaceAll('_',' ').toLowerCase();}
function sourceCard(source,lang){const c=COPY[lang],count=itemsFor(source).length;return `<article class="person-card media-source-card" data-enabled="${source.candidate_discovery_enabled===true}"><div class="person-card-main"><p class="eyebrow">${esc(source.media_class)}</p><h2><a href="${route(lang,sourcePath(source))}">${esc(source.name)}</a></h2><p class="card-meta">${esc(source.candidate_discovery_enabled?c.enabled:c.disabled)}</p><p class="record-id">${esc(source.source_id)} · ${count}</p></div></article>`;}
function materialCard(item,lang){return `<article class="tech-news-card"><p class="eyebrow">${esc(item.source_name)}</p><h2 class="tech-news-title"><a href="${route(lang,newsRelativePath(item))}">${esc(localizedNewsValue(item.title,lang))}</a></h2><p class="tech-news-summary">${esc(localizedNewsValue(item.summary,lang))}</p></article>`;}
function indexBody(lang){const c=COPY[lang];return `<article class="container page"><p class="eyebrow">CHUDO HUMAN RIGHTS CENTER</p><h1>${esc(c.title)}</h1><p class="catalog-note">${esc(c.intro)}</p><section class="stats source-stats"><article><strong>${sources.length}</strong><span>${esc(c.all)}</span></article><article><strong>${enabled.length}</strong><span>${esc(c.active)}</span></article></section><div class="people-grid media-source-grid">${sources.map(x=>sourceCard(x,lang)).join('')}</div></article>`;}
function detailBody(source,lang){const c=COPY[lang],items=itemsFor(source),domains=source.canonical_domains||[];return `<article class="container page"><p class="eyebrow">MEDIA · ${esc(source.source_id)}</p><h1>${esc(source.name)}</h1><p class="catalog-note">${esc(source.candidate_discovery_enabled?c.enabled:c.disabled)}</p><dl class="profile-fields"><div class="profile-field"><dt>${esc(c.class)}</dt><dd>${esc(human(source.media_class))}</dd></div><div class="profile-field"><dt>${esc(c.status)}</dt><dd>${esc(human(source.monitoring_state))}</dd></div><div class="profile-field"><dt>${esc(c.weight)}</dt><dd>${esc(human(source.corroboration_weight))}</dd></div><div class="profile-field"><dt>${esc(c.domains)}</dt><dd>${esc(domains.join(', ')||'—')}</dd></div></dl><p>${source.homepage_url?`<a class="secondary-btn" href="${esc(source.homepage_url)}" rel="external nofollow noopener">${esc(c.site)}</a> `:''}<a class="secondary-btn" href="${route(lang,'/media/')}">${esc(c.back)}</a></p><section class="profile-section"><h2>${esc(c.materials)} · ${items.length}</h2>${items.length?`<div class="news-grid">${items.map(x=>materialCard(x,lang)).join('')}</div>`:`<div class="empty-state"><p>${esc(c.empty)}</p></div>`}</section></article>`;}
for(const lang of langs){const c=COPY[lang];await writeText(outputPath(lang,'/media/'),layout({lang,title:c.title,description:c.intro,path:'/media/',body:indexBody(lang)}));for(const source of sources){const path=sourcePath(source);await writeText(outputPath(lang,path),layout({lang,title:`${source.name} — ${c.title}`,description:c.intro,path,body:detailBody(source,lang)}));}}
console.log(`MEDIA_DIRECTORY_BUILD=PASS sources=${sources.length} enabled=${enabled.length} live_materials=${mediaFeed.materials.length}`);
