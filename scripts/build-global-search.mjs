import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { readJson, writeJson, writeText } from './lib/fs.mjs';
import { resolvePublicDataDir } from './lib/public-data.mjs';
import { buildSearchRecord, localized, normalizeSearch, prisonRelativePath, publishedPeople, slugify } from './lib/catalog.mjs';
import { publicNewsItems, localizedNewsValue, newsRelativePath } from './lib/news.mjs';
import { loadMediaRegistry } from './lib/media-registry.mjs';
import { loadTelegramRegistry } from './lib/telegram-registry.mjs';
import { layout, route, esc } from './templates.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=join(root,'_site');
const dataDir=resolvePublicDataDir(root);
const people=publishedPeople(await readJson(join(dataDir,'people.json')));
const prisons=await readJson(join(dataDir,'prisons.json'));
const news=publicNewsItems(await readJson(join(dataDir,'news.json')));
const media=(await loadMediaRegistry()).sources;
const channels=(await loadTelegramRegistry()).channels.filter(x=>x.publication_enabled===true);
const langs=['ru','be','en','pl'];

const COPY={
 ru:{title:'Поиск',intro:'Поиск по публичной базе CHUDO, местам заключения, новостям и зарегистрированным источникам. Запрос обрабатывается только в вашем браузере.',placeholder:'Имя, место, новость или источник…',all:'Все',person:'Люди',prison:'Места заключения',news:'Новости',media:'СМИ',telegram:'Telegram',empty:'Ничего не найдено.',hint:'Введите минимум 2 символа.',found:'Найдено'},
 be:{title:'Пошук',intro:'Пошук па публічнай базе CHUDO, месцах зняволення, навінах і зарэгістраваных крыніцах. Запыт апрацоўваецца толькі ў вашым браўзеры.',placeholder:'Імя, месца, навіна або крыніца…',all:'Усе',person:'Людзі',prison:'Месцы зняволення',news:'Навіны',media:'СМІ',telegram:'Telegram',empty:'Нічога не знойдзена.',hint:'Увядзіце мінімум 2 сімвалы.',found:'Знойдзена'},
 en:{title:'Search',intro:'Search the public CHUDO database, detention facilities, news and registered sources. Your query is processed only in your browser.',placeholder:'Name, place, news or source…',all:'All',person:'People',prison:'Detention places',news:'News',media:'Media',telegram:'Telegram',empty:'Nothing found.',hint:'Enter at least 2 characters.',found:'Found'},
 pl:{title:'Wyszukiwanie',intro:'Przeszukuj publiczną bazę CHUDO, miejsca osadzenia, aktualności i zarejestrowane źródła. Zapytanie jest przetwarzane wyłącznie w przeglądarce.',placeholder:'Osoba, miejsce, wiadomość lub źródło…',all:'Wszystko',person:'Osoby',prison:'Miejsca osadzenia',news:'Aktualności',media:'Media',telegram:'Telegram',empty:'Brak wyników.',hint:'Wpisz co najmniej 2 znaki.',found:'Znaleziono'}
};

function outputPath(lang,path){const prefix=lang==='ru'?'':lang;const clean=String(path).replace(/^\//,'').replace(/\/$/,'');return join(out,prefix,clean,'index.html');}
function qText(...values){const raw=values.flat().filter(Boolean).join(' ');return normalizeSearch(`${raw} ${slugify(raw).replaceAll('-',' ')}`);}
function mediaPath(source){return `/media/${source.source_id.replace(/^src-/,'')}/`;}
function channelPath(source){return `/channels/${source.handle.toLowerCase()}/`;}
function prisonName(prison,lang){return localized(prison.name||prison.names,lang,prison.prison_id||'');}

function indexFor(lang){
 const result=[];
 for(const person of people){const r=buildSearchRecord(person,lang,route);result.push({t:'person',n:r.name,d:[r.status,r.region,r.prison_name].filter(Boolean).join(' · '),u:r.profile_url,q:r.search_text});}
 for(const prison of prisons){const name=prisonName(prison,lang);result.push({t:'prison',n:name,d:localized(prison.region,lang,''),u:route(lang,prisonRelativePath(prison,lang)),q:qText(name,prison.prison_id,localized(prison.region,'ru',''),localized(prison.region,'be',''))});}
 for(const item of news){const name=localizedNewsValue(item.title,lang);const summary=localizedNewsValue(item.summary,lang);result.push({t:'news',n:name,d:item.source_name||'',u:route(lang,newsRelativePath(item)),q:qText(name,summary,item.source_name)});}
 for(const source of media){result.push({t:'media',n:source.name,d:source.media_class,u:route(lang,mediaPath(source)),q:qText(source.name,source.media_class,source.canonical_domains||[],source.source_id)});}
 for(const source of channels){result.push({t:'telegram',n:source.display_name,d:`@${source.handle}`,u:route(lang,channelPath(source)),q:qText(source.display_name,source.handle,source.source_class)});}
 return result;
}

function body(lang,indexSize){const c=COPY[lang];const types=[['all',c.all],['person',c.person],['prison',c.prison],['news',c.news],['media',c.media],['telegram',c.telegram]];return `<article class="container page global-search-page" data-lang="${lang}" data-index="/assets/search/${lang}.json" data-found="${esc(c.found)}" data-empty="${esc(c.empty)}" data-hint="${esc(c.hint)}"><p class="eyebrow">CHUDO HUMAN RIGHTS CENTER</p><h1>${esc(c.title)}</h1><p class="catalog-note">${esc(c.intro)}</p><div class="sticky-search"><label class="sr-only" for="global-search">${esc(c.placeholder)}</label><input id="global-search" type="search" autocomplete="off" placeholder="${esc(c.placeholder)}" autofocus></div><div class="view-switch global-search-types" role="group" aria-label="Search type">${types.map(([value,label],i)=>`<button type="button" data-search-type="${value}" aria-pressed="${i===0?'true':'false'}">${esc(label)}</button>`).join('')}</div><p id="global-search-status" class="search-status" aria-live="polite">${esc(c.hint)}</p><div id="global-search-results" class="people-grid" data-index-size="${indexSize}"></div></article>`;}

for(const lang of langs){const index=indexFor(lang);await writeJson(join(out,'assets','search',`${lang}.json`),index);const c=COPY[lang];await writeText(outputPath(lang,'/search/'),layout({lang,title:c.title,description:c.intro,path:'/search/',body:body(lang,index.length)}));const home=outputPath(lang,'/');try{let html=await readFile(home,'utf8');html=html.replace(`action="${route(lang,'/repressed/')}"`,`action="${route(lang,'/search/')}"`);html=html.replace('</body>','<script src="/assets/js/global-search.js" defer></script></body>');await writeText(home,html);}catch{}}
console.log(`GLOBAL_SEARCH_BUILD=PASS people=${people.length} prisons=${prisons.length} news=${news.length} media=${media.length} telegram=${channels.length}`);
