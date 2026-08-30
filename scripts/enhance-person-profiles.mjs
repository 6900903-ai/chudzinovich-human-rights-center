import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeText } from './lib/fs.mjs';
import { resolvePublicDataDir } from './lib/public-data.mjs';
import { categoryFor, extractArticles, latestCurrentPrisonPlacement, localized, personName, profileRelativePath, publishedPeople } from './lib/catalog.mjs';
import { route, esc } from './templates.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=join(root,'_site');
const dataDir=resolvePublicDataDir(root);
const testMode=process.env.CHRC_TEST_MODE==='1';
const people=publishedPeople(await readJson(join(dataDir,'people.json')),{allowFixtures:testMode});
const manifest=await readJson(join(dataDir,'manifest.json'));
const langs=['ru','be','en','pl'];
const MARKER='<!-- CHUDO_PROFILE_CONTEXT_V1 -->';

const COPY={
 ru:{database:'База людей',current:'Политзаключённые',former:'Бывшие политзаключённые',all:'Репрессии',search:'Поиск',copy:'СКОПИРОВАТЬ ССЫЛКУ',copied:'ССЫЛКА СКОПИРОВАНА',samePrison:'Другие записи с тем же местом заключения',sameArticles:'Другие записи с совпадающей статьёй УК',note:'Совпадение места заключения или статьи УК не означает связи между людьми. Это только навигация по одному признаку внутри одного snapshot.',snapshot:'Snapshot',open:'ОТКРЫТЬ КАРТОЧКУ'},
 be:{database:'База людзей',current:'Палітвязні',former:'Былыя палітвязні',all:'Рэпрэсіі',search:'Пошук',copy:'СКАПІРАВАЦЬ СПАСЫЛКУ',copied:'СПАСЫЛКА СКАПІРАВАНА',samePrison:'Іншыя запісы з тым жа месцам зняволення',sameArticles:'Іншыя запісы з супадальным артыкулам КК',note:'Супадзенне месца зняволення або артыкула КК не азначае сувязі паміж людзьмі. Гэта толькі навігацыя па адной прыкмеце ў адным snapshot.',snapshot:'Snapshot',open:'АДКРЫЦЬ КАРТКУ'},
 en:{database:'People database',current:'Political prisoners',former:'Former political prisoners',all:'Repression',search:'Search',copy:'COPY LINK',copied:'LINK COPIED',samePrison:'Other records with the same detention place',sameArticles:'Other records with a matching Criminal Code article',note:'Sharing a detention place or Criminal Code article does not imply a relationship between people. These links are only navigation by one attribute inside the same snapshot.',snapshot:'Snapshot',open:'OPEN PROFILE'},
 pl:{database:'Baza osób',current:'Więźniowie polityczni',former:'Byli więźniowie polityczni',all:'Represje',search:'Szukaj',copy:'KOPIUJ LINK',copied:'LINK SKOPIOWANY',samePrison:'Inne wpisy z tym samym miejscem osadzenia',sameArticles:'Inne wpisy z tym samym artykułem kodeksu',note:'To samo miejsce osadzenia lub artykuł kodeksu nie oznacza związku między osobami. To wyłącznie nawigacja według jednej cechy w tym samym snapshotcie.',snapshot:'Snapshot',open:'OTWÓRZ PROFIL'}
};

function outputPath(lang,path){const prefix=lang==='ru'?'':lang;const clean=String(path).replace(/^\//,'').replace(/\/$/,'');return join(out,prefix,clean,'index.html');}
function categoryPath(person){const category=categoryFor(person);if(category==='prisoners')return'/prisoners/';if(category==='former-prisoners')return'/former-prisoners/';return'/repressed/';}
function categoryLabel(person,lang){const c=COPY[lang],category=categoryFor(person);if(category==='prisoners')return c.current;if(category==='former-prisoners')return c.former;return c.all;}
function prisonKey(person){return latestCurrentPrisonPlacement(person)?.prison_id||null;}

const byPrison=new Map();
const byArticle=new Map();
for(const person of people){
  const prison=prisonKey(person);if(prison){if(!byPrison.has(prison))byPrison.set(prison,[]);byPrison.get(prison).push(person);}
  for(const article of extractArticles(person)){if(!byArticle.has(article))byArticle.set(article,[]);byArticle.get(article).push(person);}
}

function relatedByPrison(person){const key=prisonKey(person);return key?(byPrison.get(key)||[]).filter(x=>x.person_id!==person.person_id).slice(0,6):[];}
function relatedByArticles(person){const seen=new Map();for(const article of extractArticles(person)){for(const other of byArticle.get(article)||[]){if(other.person_id===person.person_id)continue;const current=seen.get(other.person_id)||{person:other,count:0};current.count++;seen.set(other.person_id,current);}}return [...seen.values()].sort((a,b)=>b.count-a.count||a.person.person_id.localeCompare(b.person.person_id)).slice(0,6).map(x=>x.person);}
function relatedCard(person,lang){const c=COPY[lang],prison=latestCurrentPrisonPlacement(person);return `<article class="tech-news-card"><p class="eyebrow">${esc(person.person_id)}</p><h3><a href="${route(lang,profileRelativePath(person,lang))}">${esc(personName(person,lang))}</a></h3>${prison?`<p>${esc(localized(prison.prison_name||prison.name,lang,prison.prison_id||''))}</p>`:''}<a class="secondary-btn" href="${route(lang,profileRelativePath(person,lang))}">${esc(c.open)}</a></article>`;}
function breadcrumb(person,lang){const c=COPY[lang];return `<nav class="quick-links profile-breadcrumbs" aria-label="Breadcrumb"><a href="${route(lang,'/database/')}">${esc(c.database)}</a><span>›</span><a href="${route(lang,categoryPath(person))}">${esc(categoryLabel(person,lang))}</a><span>›</span><span aria-current="page">${esc(personName(person,lang))}</span></nav>`;}
function toolbar(lang){const c=COPY[lang];return `<div class="quick-links profile-tools" data-profile-tools data-copy-label="${esc(c.copy)}" data-copied-label="${esc(c.copied)}"><a class="secondary-btn" href="${route(lang,'/search/')}">${esc(c.search)}</a><button class="secondary-btn" type="button" data-copy-current>${esc(c.copy)}</button><span class="record-id">${esc(c.snapshot)}: ${esc(manifest.snapshot_id||'—')}</span></div>`;}
function contextSections(person,lang){const c=COPY[lang],samePrison=relatedByPrison(person),sameArticles=relatedByArticles(person);if(!samePrison.length&&!sameArticles.length)return `<section class="container profile-section profile-context"><p class="catalog-note">${esc(c.note)}</p></section>`;return `<section class="container profile-section profile-context"><p class="catalog-note">${esc(c.note)}</p>${samePrison.length?`<h2>${esc(c.samePrison)}</h2><div class="news-grid">${samePrison.map(x=>relatedCard(x,lang)).join('')}</div>`:''}${sameArticles.length?`<h2>${esc(c.sameArticles)}</h2><div class="news-grid">${sameArticles.map(x=>relatedCard(x,lang)).join('')}</div>`:''}</section>`;}

let enhanced=0;
for(const lang of langs){for(const person of people){const path=profileRelativePath(person,lang),file=outputPath(lang,path);let html;try{html=await readFile(file,'utf8');}catch{continue;}if(html.includes(MARKER))continue;html=html.replace('<div class="profile-hero">',`${breadcrumb(person,lang)}${toolbar(lang)}<div class="profile-hero">`);html=html.replace('</main>',`${contextSections(person,lang)}${MARKER}</main>`);if(!html.includes('/assets/js/profile-tools.js'))html=html.replace('</body>','<script src="/assets/js/profile-tools.js" defer></script></body>');await writeText(file,html);enhanced++;}}
console.log(`PERSON_PROFILE_CONTEXT=PASS profiles=${enhanced} people=${people.length} locales=4 snapshot=${manifest.snapshot_id}`);
