import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { readJson, writeJson, writeText } from './lib/fs.mjs';
import { resolvePublicDataDir } from './lib/public-data.mjs';
import { buildSearchRecord, extractArticles, localized, normalizeSearch, prisonRelativePath, publishedPeople, slugify } from './lib/catalog.mjs';
import { localizedNewsValue, newsRelativePath } from './lib/news.mjs';
import { loadCombinedPublicNewsWithMedia } from './lib/media-feed.mjs';
import { loadMediaRegistry } from './lib/media-registry.mjs';
import { loadTelegramRegistry } from './lib/telegram-registry.mjs';
import { layout, route, esc } from './templates.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=join(root,'_site');
const dataDir=resolvePublicDataDir(root);
const testMode=process.env.CHRC_TEST_MODE==='1';
const people=publishedPeople(await readJson(join(dataDir,'people.json')),{allowFixtures:testMode});
const indexablePeople=people.filter(p=>p.publication_state!=='PUBLIC_DISPUTED');
const prisons=await readJson(join(dataDir,'prisons.json'));
const telegramRegistry=await loadTelegramRegistry();
const mediaRegistry=await loadMediaRegistry();
const news=await loadCombinedPublicNewsWithMedia(root,dataDir,telegramRegistry,mediaRegistry);
const media=mediaRegistry.sources;
const channels=telegramRegistry.channels.filter(x=>x.publication_enabled===true);
const youtube=await readJson(join(root,'data','public','youtube.json'));
const videos=Array.isArray(youtube.videos)?youtube.videos:[];
const langs=['ru','be','en','pl'];
const CLOSED=new Set(['RETRACTED','SUPERSEDED']);

const COPY={
 ru:{title:'Поиск',intro:'Поиск по публичной базе CHUDO, справочнику, местам заключения, видео, новостям, судебным индексам и зарегистрированным источникам. Запрос обрабатывается только в вашем браузере.',placeholder:'Имя, тема справочника, статья УК, судья, видео, место, новость или источник…',all:'Все',guide:'Справочник',person:'Люди',prison:'Места заключения',case:'Суды / статьи',video:'Видео',news:'Новости',media:'СМИ',telegram:'Telegram',empty:'Ничего не найдено.',hint:'Введите минимум 2 символа.',found:'Найдено',article:'Статья УК',judge:'Судья',prosecutor:'Прокурор'},
 be:{title:'Пошук',intro:'Пошук па публічнай базе CHUDO, даведніку, месцах зняволення, відэа, навінах, судовых індэксах і зарэгістраваных крыніцах. Запыт апрацоўваецца толькі ў вашым браўзеры.',placeholder:'Імя, тэма даведніка, артыкул КК, суддзя, відэа, месца, навіна або крыніца…',all:'Усе',guide:'Даведнік',person:'Людзі',prison:'Месцы зняволення',case:'Суды / артыкулы',video:'Відэа',news:'Навіны',media:'СМІ',telegram:'Telegram',empty:'Нічога не знойдзена.',hint:'Увядзіце мінімум 2 сімвалы.',found:'Знойдзена',article:'Артыкул КК',judge:'Суддзя',prosecutor:'Пракурор'},
 en:{title:'Search',intro:'Search the public CHUDO database, human-rights guide, detention facilities, videos, news, court indexes and registered sources. Your query is processed only in your browser.',placeholder:'Name, guide topic, Criminal Code article, judge, video, place, news or source…',all:'All',guide:'Guide',person:'People',prison:'Detention places',case:'Courts / articles',video:'Videos',news:'News',media:'Media',telegram:'Telegram',empty:'Nothing found.',hint:'Enter at least 2 characters.',found:'Found',article:'Criminal Code article',judge:'Judge',prosecutor:'Prosecutor'},
 pl:{title:'Wyszukiwanie',intro:'Przeszukuj publiczną bazę CHUDO, przewodnik, miejsca osadzenia, wideo, aktualności, indeksy sądowe i zarejestrowane źródła. Zapytanie jest przetwarzane wyłącznie w przeglądarce.',placeholder:'Osoba, temat przewodnika, artykuł kodeksu, sędzia, wideo, miejsce, wiadomość lub źródło…',all:'Wszystko',guide:'Przewodnik',person:'Osoby',prison:'Miejsca osadzenia',case:'Sądy / artykuły',video:'Wideo',news:'Aktualności',media:'Media',telegram:'Telegram',empty:'Brak wyników.',hint:'Wpisz co najmniej 2 znaki.',found:'Znaleziono',article:'Artykuł kodeksu',judge:'Sędzia',prosecutor:'Prokurator'}
};
function outputPath(lang,path){const prefix=lang==='ru'?'':lang;const clean=String(path).replace(/^\//,'').replace(/\/$/,'');return join(out,prefix,clean,'index.html');}
function qText(...values){const raw=values.flat().filter(Boolean).join(' ');return normalizeSearch(`${raw} ${slugify(raw).replaceAll('-',' ')}`);}
function mediaPath(source){return `/media/${source.source_id.replace(/^src-/,'')}/`;}
function channelPath(source){return `/channels/${source.handle.toLowerCase()}/`;}
function articlePath(value){return `/criminal-code/${slugify(value)}/`;}
function officialPath(kind,value){return `/${kind}/${slugify(value)}/`;}
function videoPath(video){return `/videos/${video.video_id}/`;}
function prisonName(prison,lang){return localized(prison.name||prison.names,lang,prison.prison_id||'');}
async function guideRecords(lang){try{const value=await readJson(join(out,'assets','guide-index',`${lang}.json`));return Array.isArray(value)?value:[];}catch(error){if(error?.code==='ENOENT')return[];throw error;}}
function caseRecords(lang){const c=COPY[lang],out=[];const seen=new Set();for(const person of indexablePeople){for(const article of extractArticles(person)){const key=`article:${article}`;if(!seen.has(key)){seen.add(key);out.push({t:'case',n:`${c.article}: ${article}`,d:c.article,u:route(lang,articlePath(article)),q:qText(article,c.article)});}}for(const judgment of person.judgments||[]){if(!judgment||CLOSED.has(judgment.state))continue;for(const [kind,name,label] of [['judges',judgment.judge,c.judge],['prosecutors',judgment.prosecutor,c.prosecutor]]){const clean=String(name||'').trim();if(!clean)continue;const key=`${kind}:${clean.toLocaleLowerCase('ru')}`;if(seen.has(key))continue;seen.add(key);out.push({t:'case',n:`${label}: ${clean}`,d:label,u:route(lang,officialPath(kind,clean)),q:qText(clean,label)});}}}return out;}
async function indexFor(lang){const result=[];result.push(...await guideRecords(lang));for(const person of people){const r=buildSearchRecord(person,lang,route);result.push({t:'person',n:r.name,d:[r.status,r.region,r.prison_name].filter(Boolean).join(' · '),u:r.profile_url,q:r.search_text});}for(const prison of prisons){const name=prisonName(prison,lang);result.push({t:'prison',n:name,d:localized(prison.region,lang,''),u:route(lang,prisonRelativePath(prison,lang)),q:qText(name,prison.prison_id,localized(prison.region,'ru',''),localized(prison.region,'be',''))});}result.push(...caseRecords(lang));for(const video of videos)result.push({t:'video',n:video.title,d:youtube.channel_title||'YouTube',u:route(lang,videoPath(video)),q:qText(video.title,youtube.channel_title,video.video_id)});for(const item of news){const name=localizedNewsValue(item.title,lang),summary=localizedNewsValue(item.summary,lang);result.push({t:'news',n:name,d:item.source_name||'',u:route(lang,newsRelativePath(item)),q:qText(name,summary,item.source_name)});}for(const source of media)result.push({t:'media',n:source.name,d:source.media_class,u:route(lang,mediaPath(source)),q:qText(source.name,source.media_class,source.canonical_domains||[],source.source_id)});for(const source of channels)result.push({t:'telegram',n:source.display_name,d:`@${source.handle}`,u:route(lang,channelPath(source)),q:qText(source.display_name,source.handle,source.source_class)});return result;}
function body(lang,indexSize){const c=COPY[lang],types=[['all',c.all],['guide',c.guide],['person',c.person],['prison',c.prison],['case',c.case],['video',c.video],['news',c.news],['media',c.media],['telegram',c.telegram]];return `<article class="container page global-search-page" data-lang="${lang}" data-index="/assets/search/${lang}.json" data-found="${esc(c.found)}" data-empty="${esc(c.empty)}" data-hint="${esc(c.hint)}"><p class="eyebrow">CHUDO HUMAN RIGHTS CENTER</p><h1>${esc(c.title)}</h1><p class="catalog-note">${esc(c.intro)}</p><div class="sticky-search"><label class="sr-only" for="global-search">${esc(c.placeholder)}</label><input id="global-search" type="search" autocomplete="off" placeholder="${esc(c.placeholder)}" autofocus></div><div class="view-switch global-search-types" role="group" aria-label="Search type">${types.map(([value,label],i)=>`<button type="button" data-search-type="${value}" aria-pressed="${i===0?'true':'false'}">${esc(label)}</button>`).join('')}</div><p id="global-search-status" class="search-status" aria-live="polite">${esc(c.hint)}</p><div id="global-search-results" class="people-grid" data-index-size="${indexSize}"></div></article>`;}
for(const lang of langs){const index=await indexFor(lang);await writeJson(join(out,'assets','search',`${lang}.json`),index);const c=COPY[lang];let searchHtml=layout({lang,title:c.title,description:c.intro,path:'/search/',body:body(lang,index.length)});searchHtml=searchHtml.replace('</body>','<script src="/assets/js/global-search.js" defer></script></body>');await writeText(outputPath(lang,'/search/'),searchHtml);const home=outputPath(lang,'/');try{let html=await readFile(home,'utf8');html=html.replace(`action="${route(lang,'/repressed/')}"`,`action="${route(lang,'/search/')}"`);await writeText(home,html);}catch{}}
console.log(`GLOBAL_SEARCH_BUILD=PASS guide=7 people=${people.length} prisons=${prisons.length} case_records=${caseRecords('ru').length} videos=${videos.length} news=${news.length} media=${media.length} telegram=${channels.length} test_mode=${testMode}`);
