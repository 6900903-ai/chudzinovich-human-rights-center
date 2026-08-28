import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeJson, writeText, resetDir, copyDir } from './lib/fs.mjs';
import { verifySnapshot } from './lib/snapshot.mjs';
import { resolvePublicDataDir } from './lib/public-data.mjs';
import { assertPublicDatasetProvenance } from './lib/provenance.mjs';
import {
  STATUS, buildSearchRecord, categoryFor, extractArticles, latestCurrentPrisonPlacement,
  latestStatusEvent, latestVerifiedAt, localized, paginate, personName, prisonRelativePath, profileRelativePath,
  publishedPeople, sourceAttribution, sourceById, sourceName, sourceUrl
} from './lib/catalog.mjs';
import { layout, translations, route, esc } from './templates.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = join(root, '_site');
const dataDir = resolvePublicDataDir(root);
const testMode = process.env.CHRC_TEST_MODE === '1';

const integrity = await verifySnapshot(dataDir);
if (!integrity.ok) throw new Error(`BUILD_SNAPSHOT_INTEGRITY_FAIL:${JSON.stringify(integrity.failures)}`);

const manifest = integrity.manifest;
const allPeople = await readJson(join(dataDir, 'people.json'));
const prisons = await readJson(join(dataDir, 'prisons.json'));
const news = await readJson(join(dataDir, 'news.json'));
const people = publishedPeople(allPeople, { allowFixtures: testMode });
assertPublicDatasetProvenance(people);
if (!testMode && allPeople.some(person => person.fixture === true)) throw new Error('FIXTURE_IN_PUBLIC_BUILD_INPUT');

await resetDir(out);
await copyDir(join(root, 'src/assets'), join(out, 'assets'));

const langs = ['ru','be','en','pl'];
const PAGE_SIZE = 48;
const generatedPaths = new Map(langs.map(lang => [lang, new Set()]));

const staticPages = [
  ['/news/', {ru:'Новости',be:'Навіны',en:'News',pl:'Aktualności'}],
  ['/monitoring/', {ru:'Мониторинг',be:'Маніторынг',en:'Monitoring',pl:'Monitoring'}],
  ['/reports/', {ru:'Доклады',be:'Даклады',en:'Reports',pl:'Raporty'}],
  ['/help/', {ru:'Как помочь',be:'Як дапамагчы',en:'How to help',pl:'Jak pomóc'}],
  ['/about/', {ru:'О центре',be:'Пра цэнтр',en:'About the center',pl:'O centrum'}]
];

function outputPath(lang, path) {
  const prefix = lang === 'ru' ? '' : lang;
  const clean = String(path).replace(/^\//,'').replace(/\/$/,'');
  return join(out, prefix, clean, 'index.html');
}

async function emitPage(lang, path, html) {
  generatedPaths.get(lang).add(path);
  await writeText(outputPath(lang, path), html);
}

function statValue(value) { return manifest.publication_state === 'PUBLISHED' ? String(value) : '—'; }
function valueText(value, lang) { return localized(value, lang, ''); }

function formatPartialDate(value, lang) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const raw = value.value || '';
  if (!raw) return '';
  if (value.precision === 'year') return raw.slice(0,4);
  if (value.precision === 'month' && /^\d{4}-\d{2}$/.test(raw)) {
    const [year,month] = raw.split('-').map(Number);
    try { return new Intl.DateTimeFormat(lang, {month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,1))); } catch { return raw; }
  }
  if (value.precision === 'day' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    try { return new Intl.DateTimeFormat(lang, {day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${raw}T00:00:00Z`)); } catch { return raw; }
  }
  return raw;
}

function latestOpen(events = []) {
  return events.filter(event => event && !['RETRACTED','SUPERSEDED'].includes(event.state)).at(-1) || null;
}

function statusLabel(lang, event, person) {
  const t = translations(lang);
  if (!event) return t.repressionDocumented;
  const base = event.status === STATUS.CURRENT ? t.politicalPrisoner : event.status === STATUS.FORMER ? t.formerPrisoner : t.repressionDocumented;
  if (person.publication_state === 'PUBLIC_DISPUTED' || event.state === 'DISPUTED') return `${base} · ${t.disputed}`;
  if (event.designation === 'SOURCE_ATTRIBUTED') return `${base} · ${t.sourceAttributed}`;
  return `${base} · ${t.confirmed}`;
}

function initials(person, lang) {
  return personName(person, lang).split(/\s+/).filter(Boolean).slice(0,2).map(part => part[0]).join('').toLocaleUpperCase(lang);
}

function permittedPortrait(person) {
  const photo = person.photo;
  if (!photo || photo.rights_state !== 'PERMITTED' || typeof photo.local_asset !== 'string') return null;
  if (!photo.local_asset.startsWith('/assets/')) return null;
  return photo.local_asset;
}

function renderAvatar(person, lang, cls='avatar') {
  const src = permittedPortrait(person);
  if (src) return `<img class="${cls} portrait" src="${esc(src)}" alt="${esc(personName(person,lang))}" loading="lazy" decoding="async">`;
  return `<div class="${cls}" aria-hidden="true">${esc(initials(person,lang))}</div>`;
}

function eventSource(person, event) {
  if (!event) return null;
  return sourceAttribution(person,event) || (event.source_id ? sourceById(person,event.source_id) : null);
}

function sourceMini(source, lang) {
  if (!source) return '';
  const name = sourceName(source, lang) || source.source_id || '';
  const url = sourceUrl(source);
  return `<span class="source-mini">${esc(name)}${url ? ` · <a href="${esc(url)}" rel="external nofollow noopener">${esc(translations(lang).source)}</a>` : ''}</span>`;
}

function renderPersonCard(person, lang) {
  const t = translations(lang);
  const statusEvent = latestStatusEvent(person);
  const source = eventSource(person,statusEvent);
  const prison = latestCurrentPrisonPlacement(person);
  const profile = route(lang,profileRelativePath(person,lang));
  return `<article class="person-card" data-person-id="${esc(person.person_id)}">
    ${renderAvatar(person,lang)}
    <div class="person-card-main"><p class="status-pill">${esc(statusLabel(lang,statusEvent,person))}</p><h2><a href="${profile}">${esc(personName(person,lang))}</a></h2>
    ${prison ? `<p class="card-meta">${esc(t.currentPrison)}: ${esc(valueText(prison.prison_name || prison.name,lang) || prison.prison_id || t.unknown)}</p>` : ''}
    ${source ? sourceMini(source,lang) : ''}<p class="record-id">${esc(person.person_id)}</p></div>
  </article>`;
}

function renderTableRow(person, lang) {
  const t = translations(lang);
  const statusEvent = latestStatusEvent(person);
  const prison = latestCurrentPrisonPlacement(person);
  const profile = route(lang,profileRelativePath(person,lang));
  return `<tr><td><a href="${profile}">${esc(personName(person,lang))}</a><small>${esc(person.person_id)}</small></td><td>${esc(statusLabel(lang,statusEvent,person))}</td><td>${esc(formatPartialDate(person.birth_date,lang) || t.unknown)}</td><td>${esc(valueText(prison?.prison_name || prison?.name,lang) || t.unknown)}</td><td>${esc((extractArticles(person).join(', ') || t.unknown))}</td><td>${esc(latestVerifiedAt(person) || t.unknown)}</td></tr>`;
}

function uniqueOptions(values) {
  return [...new Set(values.filter(Boolean).map(String))].sort((a,b)=>a.localeCompare(b));
}

function optionTags(values, selectedLabel) {
  return `<option value="">${esc(selectedLabel)}</option>${values.map(value => `<option value="${esc(value)}">${esc(value)}</option>`).join('')}`;
}

function catalogBasePath(kind) {
  if (kind === 'prisoners') return '/prisoners/';
  if (kind === 'former-prisoners') return '/former-prisoners/';
  return '/repressed/';
}

function catalogTitle(kind, t) {
  if (kind === 'prisoners') return t.prisoners;
  if (kind === 'former-prisoners') return t.former;
  return t.repressed;
}

function catalogPeople(kind) {
  if (kind === 'prisoners') return people.filter(person => categoryFor(person) === 'prisoners');
  if (kind === 'former-prisoners') return people.filter(person => categoryFor(person) === 'former-prisoners');
  return people;
}

function paginationHtml(lang, basePath, page, totalPages, t) {
  if (totalPages <= 1) return '';
  const pagePath = number => number === 1 ? basePath : `${basePath}page/${number}/`;
  const links = [];
  if (page > 1) links.push(`<a href="${route(lang,pagePath(page-1))}" rel="prev">← ${esc(t.previous)}</a>`);
  links.push(`<span>${page} / ${totalPages}</span>`);
  if (page < totalPages) links.push(`<a href="${route(lang,pagePath(page+1))}" rel="next">${esc(t.next)} →</a>`);
  return `<nav id="catalog-pagination" class="pagination" aria-label="Pagination">${links.join('')}</nav>`;
}

function catalogBody(lang, kind, pageChunk, allForKind) {
  const t = translations(lang);
  const title = catalogTitle(kind,t);
  const prisonsList = uniqueOptions(allForKind.map(person => valueText(latestCurrentPrisonPlacement(person)?.prison_name || latestCurrentPrisonPlacement(person)?.name,lang)));
  const regions = uniqueOptions(allForKind.map(person => valueText(person.region,lang)));
  const articles = uniqueOptions(allForKind.flatMap(person => extractArticles(person)));
  const genders = uniqueOptions(allForKind.map(person => person.gender).filter(value => value && value !== 'UNKNOWN'));
  const cards = pageChunk.items.map(person => renderPersonCard(person,lang)).join('');
  const rows = pageChunk.items.map(person => renderTableRow(person,lang)).join('');
  const basePath = catalogBasePath(kind);
  return `<section class="container catalog" data-catalog-kind="${kind}" data-lang="${lang}" data-results-label="${esc(t.results)}" data-showing-label="${esc(t.showing)}" data-load-more-label="${esc(t.loadMore)}">
    <div class="catalog-head"><div><p class="eyebrow">DATABASE · ${esc(manifest.snapshot_id)}</p><h1>${esc(title)}</h1><p class="catalog-note">${esc(t.sourceNotice)}</p></div><button id="filters-btn" class="secondary-btn" type="button" aria-controls="catalog-filters" aria-expanded="false">${esc(t.filters)}</button></div>
    <div class="sticky-search"><label class="sr-only" for="catalog-search">${esc(t.searchPlaceholder)}</label><input id="catalog-search" type="search" placeholder="${esc(t.searchPlaceholder)}" autocomplete="off"></div>
    <div class="catalog-layout">
      <div id="filter-overlay" class="filter-overlay" hidden></div>
      <aside id="catalog-filters" class="filter-sheet" aria-label="${esc(t.filters)}" aria-hidden="true">
        <div class="filter-head"><strong>${esc(t.filters)}</strong><button id="filters-close" class="filter-close" type="button" aria-label="${esc(t.closeFilters)}">×</button></div>
        <label>${esc(t.gender)}<select id="filter-gender">${optionTags(genders,t.all)}</select></label>
        <label>${esc(t.prison)}<select id="filter-prison">${optionTags(prisonsList,t.all)}</select></label>
        <label>${esc(t.region)}<select id="filter-region">${optionTags(regions,t.all)}</select></label>
        <label>${esc(t.article)}<select id="filter-article">${optionTags(articles,t.all)}</select></label>
        <label>${esc(t.sort)}<select id="catalog-sort"><option value="name">${esc(t.byName)}</option><option value="updated">${esc(t.recentUpdated)}</option></select></label>
      </aside>
      <div class="catalog-content">
        <div class="catalog-toolbar"><div id="search-status" class="search-status" aria-live="polite">${esc(t.results)}: ${allForKind.length}</div><div class="view-switch" role="group" aria-label="View"><button type="button" data-view="cards" aria-pressed="true">${esc(t.cards)}</button><button type="button" data-view="table" aria-pressed="false">${esc(t.table)}</button></div></div>
        <div id="catalog-static">
          <div id="people-grid" class="people-grid">${cards || `<div class="empty-state"><p>${esc(t.empty)}</p></div>`}</div>
          <div id="people-table" class="table-wrap" hidden><table><thead><tr><th>${esc(t.profile)}</th><th>${esc(t.status)}</th><th>${esc(t.birth)}</th><th>${esc(t.prison)}</th><th>${esc(t.article)}</th><th>${esc(t.lastUpdate)}</th></tr></thead><tbody>${rows}</tbody></table></div>
          ${paginationHtml(lang,basePath,pageChunk.page,pageChunk.totalPages,t)}
        </div>
        <div id="catalog-dynamic" hidden><div id="dynamic-cards" class="people-grid"></div><div id="dynamic-table" class="table-wrap" hidden><table><thead><tr><th>${esc(t.profile)}</th><th>${esc(t.status)}</th><th>${esc(t.prison)}</th><th>${esc(t.article)}</th><th>${esc(t.lastUpdate)}</th></tr></thead><tbody id="dynamic-table-body"></tbody></table></div><button id="load-more" class="secondary-btn load-more" type="button" hidden>${esc(t.loadMore)}</button></div>
      </div>
    </div>
  </section>`;
}

function homeBody(lang) {
  const t = translations(lang);
  return `<section class="hero"><div class="container hero-inner"><p class="eyebrow">HUMAN RIGHTS CENTER</p><h1><span class="holo-text">CHUDZINOVICH</span><br>HUMAN RIGHTS CENTER</h1><p class="hero-copy">${esc(t.hero)}</p><a class="primary-btn" href="${route(lang,'/prisoners/')}">${esc(t.find)}</a></div></section>
  <section class="container stats" aria-label="Statistics"><article><strong>${statValue(manifest.counts.political_prisoners_current)}</strong><span>${esc(t.current)}</span></article><article><strong>${statValue(manifest.counts.people)}</strong><span>${esc(t.recognized)}</span></article><article><strong>${statValue(manifest.counts.repressed_total)}</strong><span>${esc(t.repressedTotal)}</span></article><article><strong>${statValue(manifest.counts.former_political_prisoners)}</strong><span>${esc(t.released)}</span></article></section>
  <section class="container search-panel"><h2>${esc(t.find)}</h2><form action="${route(lang,'/prisoners/')}" method="get"><label class="sr-only" for="home-search">${esc(t.searchPlaceholder)}</label><input id="home-search" name="q" type="search" autocomplete="off" placeholder="${esc(t.searchPlaceholder)}"><button type="submit">${esc(t.find)}</button></form></section>
  ${manifest.publication_state !== 'PUBLISHED' ? `<section class="container empty-state"><h2>Snapshot</h2><p>${esc(t.empty)}</p><code>${esc(manifest.snapshot_id)}</code></section>` : ''}`;
}

function factValue(person, key, fallback) {
  const fact = person.facts?.[key];
  if (fact && Object.hasOwn(fact,'value')) return fact.value;
  return fallback;
}

function factSource(person,key) {
  const fact = person.facts?.[key];
  return fact?.source_id ? sourceById(person,fact.source_id) : null;
}

function renderProfileField(label, value, source, lang) {
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) return '';
  const rendered = Array.isArray(value) ? value.join(', ') : String(value);
  return `<div class="profile-field"><dt>${esc(label)}</dt><dd>${esc(rendered)}${source ? sourceMini(source,lang) : ''}</dd></div>`;
}

function eventDate(event,lang) {
  return formatPartialDate(event?.effective_date || event?.date || event?.event_date || event?.detention_date || event?.verdict_date || event?.release_date || event?.started_at,lang);
}

function eventSummary(event, type, lang, person) {
  const t = translations(lang);
  if (event?.summary) return valueText(event.summary,lang);
  if (type === 'status') return statusLabel(lang,event,person);
  if (type === 'detention') return `${t.detention}${event.location ? ` · ${valueText(event.location,lang)}` : ''}`;
  if (type === 'judgment') return `${t.verdict}${event.verdict ? ` · ${valueText(event.verdict,lang)}` : ''}`;
  if (type === 'sentence') return `${t.sentence}${event.value || event.sentence ? ` · ${valueText(event.value || event.sentence,lang)}` : ''}`;
  if (type === 'prison') return `${t.currentPrison}${event.prison_name || event.name ? ` · ${valueText(event.prison_name || event.name,lang)}` : ''}`;
  if (type === 'release') return t.released;
  return type;
}

function timelineEvents(person,lang) {
  const groups = [['status',person.status_events],['detention',person.detentions],['judgment',person.judgments],['sentence',person.sentences],['prison',person.prison_placements],['release',person.release_events]];
  const items = [];
  for (const [type,events] of groups) for (const event of events || []) {
    if (!event || ['RETRACTED','SUPERSEDED'].includes(event.state)) continue;
    items.push({type,event,date:eventDate(event,lang),summary:eventSummary(event,type,lang,person)});
  }
  return items.sort((a,b)=>(b.date || '').localeCompare(a.date || ''));
}

function personProfileBody(person,lang) {
  const t = translations(lang);
  const statusEvent = latestStatusEvent(person);
  const statusSource = eventSource(person,statusEvent);
  const detention = latestOpen(person.detentions);
  const charge = latestOpen(person.charges);
  const judgment = latestOpen(person.judgments);
  const sentence = latestOpen(person.sentences);
  const prison = latestCurrentPrisonPlacement(person);
  const articles = extractArticles(person);
  const birth = factValue(person,'birth_date',person.birth_date);
  const sources = (person.sources || []).filter(source => source && (source.url || source.source_url));
  const timeline = timelineEvents(person,lang);
  const history = (person.change_history || []).filter(change => change && change.publication_state !== 'PRIVATE_REVIEW').slice().reverse();
  return `<section class="container profile-page">
    <div class="profile-hero">${renderAvatar(person,lang,'profile-avatar')}<div><p class="status-pill status-large">${esc(statusLabel(lang,statusEvent,person))}</p><h1>${esc(personName(person,lang))}</h1><p class="record-id">${esc(person.person_id)}</p>${statusSource ? `<p class="attribution-line">${esc(t.source)}: ${esc(sourceName(statusSource,lang))}</p>` : ''}</div></div>
    <div class="profile-layout"><div>
      <dl class="profile-fields">
        ${renderProfileField(t.birth,formatPartialDate(birth,lang),factSource(person,'birth_date'),lang)}
        ${renderProfileField(t.detention,eventDate(detention,lang),eventSource(person,detention),lang)}
        ${renderProfileField(t.charges,[valueText(charge?.summary,lang),...articles].filter(Boolean).join(' · '),eventSource(person,charge),lang)}
        ${renderProfileField(t.verdict,valueText(judgment?.verdict || judgment?.summary,lang) || eventDate(judgment,lang),eventSource(person,judgment),lang)}
        ${renderProfileField(t.sentence,valueText(sentence?.value || sentence?.sentence || sentence?.summary,lang),eventSource(person,sentence),lang)}
        ${renderProfileField(t.judge,valueText(judgment?.judge,lang),eventSource(person,judgment),lang)}
        ${renderProfileField(t.prosecutor,valueText(judgment?.prosecutor,lang),eventSource(person,judgment),lang)}
        ${renderProfileField(t.currentPrison,valueText(prison?.prison_name || prison?.name,lang),eventSource(person,prison),lang)}
        ${renderProfileField(t.lastVerified,latestVerifiedAt(person),null,lang)}
      </dl>
      <section class="profile-section"><h2>${esc(t.timeline)}</h2>${timeline.length ? `<ol class="timeline">${timeline.map(item => `<li><time>${esc(item.date || t.unknown)}</time><div><strong>${esc(item.summary || item.type)}</strong>${sourceMini(eventSource(person,item.event),lang)}</div></li>`).join('')}</ol>` : `<div class="empty-state"><p>${esc(t.noTimeline)}</p></div>`}</section>
      <section class="profile-section"><h2>${esc(t.changeHistory)}</h2>${history.length ? `<ol class="change-history">${history.map(change => `<li><time>${esc(change.changed_at || '')}</time><div><strong>${esc(valueText(change.summary,lang) || change.kind || '')}</strong>${(change.source_ids || []).map(id=>sourceMini(sourceById(person,id),lang)).join('')}</div></li>`).join('')}</ol>` : `<div class="empty-state"><p>${esc(t.noHistory)}</p></div>`}</section>
    </div><aside class="sources-panel"><h2>${esc(t.source)}</h2>${sources.length ? sources.map(source => `<article><strong>${esc(sourceName(source,lang))}</strong>${source.observed_at || source.human_verified_at ? `<p>${esc(source.observed_at || source.human_verified_at)}</p>` : ''}<a class="source-btn" href="${esc(sourceUrl(source))}" rel="external nofollow noopener">${esc(t.openSource)}</a></article>`).join('') : `<p>${esc(t.unknown)}</p>`}</aside></div>
  </section>`;
}

function prisonName(prison,lang) { return valueText(prison.name || prison.names,lang) || prison.prison_id; }
function prisonCurrentPeople(prison) {
  return people.filter(person => categoryFor(person) === 'prisoners' && latestCurrentPrisonPlacement(person)?.prison_id === prison.prison_id);
}

function prisonsBody(lang) {
  const t = translations(lang);
  const cards = prisons.map(prison => {
    const count = prisonCurrentPeople(prison).length;
    return `<article class="prison-card"><p class="eyebrow">${esc(prison.type || '')}</p><h2><a href="${route(lang,prisonRelativePath(prison,lang))}">${esc(prisonName(prison,lang))}</a></h2><p>${esc(valueText(prison.region,lang))}</p><strong>${count}</strong><span>${esc(t.peopleCount)}</span></article>`;
  }).join('');
  return `<section class="container page"><p class="eyebrow">DATABASE · ${esc(manifest.snapshot_id)}</p><h1>${esc(t.prisons)}</h1><div class="prisons-grid">${cards || `<div class="empty-state"><p>${esc(t.empty)}</p></div>`}</div></section>`;
}

function prisonDetailBody(prison,lang) {
  const t = translations(lang);
  const residents = prisonCurrentPeople(prison);
  const sources = prison.sources || [];
  return `<section class="container prison-page"><p class="eyebrow">${esc(prison.type || '')}</p><h1>${esc(prisonName(prison,lang))}</h1><dl class="profile-fields">${renderProfileField(t.address,valueText(prison.address,lang),null,lang)}${renderProfileField(t.region,valueText(prison.region,lang),null,lang)}</dl>${sources.length ? `<div class="institution-sources"><strong>${esc(t.source)}:</strong> ${sources.map(source => sourceMini(source,lang)).join('')}</div>` : ''}<section class="profile-section"><h2>${esc(t.knownPrisoners)} · ${residents.length}</h2><div class="people-grid">${residents.map(person=>renderPersonCard(person,lang)).join('') || `<div class="empty-state"><p>${esc(t.empty)}</p></div>`}</div></section></section>`;
}

for (const lang of langs) {
  const t = translations(lang);
  await emitPage(lang,'/',layout({lang,title:'CHUDZINOVICH HUMAN RIGHTS CENTER',description:t.hero,path:'/',body:homeBody(lang)}));

  for (const kind of ['prisoners','former-prisoners','repressed']) {
    const list = catalogPeople(kind);
    const chunks = paginate(list,PAGE_SIZE);
    for (const chunk of chunks) {
      const base = catalogBasePath(kind);
      const path = chunk.page === 1 ? base : `${base}page/${chunk.page}/`;
      await emitPage(lang,path,layout({lang,title:catalogTitle(kind,t),description:catalogTitle(kind,t),path,body:catalogBody(lang,kind,chunk,list),noIndex:chunk.page > 1 && manifest.publication_state !== 'PUBLISHED'}));
    }
  }

  await emitPage(lang,'/prisons/',layout({lang,title:t.prisons,description:t.prisons,path:'/prisons/',body:prisonsBody(lang)}));

  for (const [path,titles] of staticPages) {
    let detail = `<section class="container page"><p class="eyebrow">CHUDZINOVICH HUMAN RIGHTS CENTER</p><h1>${esc(titles[lang])}</h1><div class="empty-state"><p>${esc(t.empty)}</p></div></section>`;
    if (path === '/news/' && news.length) detail = `<section class="container page"><h1>${esc(titles[lang])}</h1></section>`;
    await emitPage(lang,path,layout({lang,title:titles[lang],description:titles[lang],path,body:detail}));
  }
}

for (const person of people) {
  const alternatePaths = Object.fromEntries(langs.map(lang => [lang,profileRelativePath(person,lang)]));
  for (const lang of langs) {
    const path = alternatePaths[lang];
    const noIndex = person.publication_state === 'PUBLIC_DISPUTED';
    await emitPage(lang,path,layout({lang,title:personName(person,lang),description:`${personName(person,lang)} — CHUDZINOVICH HUMAN RIGHTS CENTER`,path,body:personProfileBody(person,lang),pageType:'profile',noIndex,alternatePaths}));
  }
}

for (const prison of prisons) {
  const alternatePaths = Object.fromEntries(langs.map(lang => [lang,prisonRelativePath(prison,lang)]));
  for (const lang of langs) {
    const path = alternatePaths[lang];
    await emitPage(lang,path,layout({lang,title:prisonName(prison,lang),description:prisonName(prison,lang),path,body:prisonDetailBody(prison,lang),alternatePaths}));
  }
}

for (const lang of langs) {
  const index = people.map(person => {
    const record = buildSearchRecord(person,lang,route);
    const statusEvent = latestStatusEvent(person);
    return {
      ...record,
      initials: initials(person,lang),
      status_label: statusLabel(lang,statusEvent,person),
      attribution: sourceName(eventSource(person,statusEvent),lang) || null,
      portrait: permittedPortrait(person)
    };
  });
  await writeJson(join(out,'search-index',`${lang}.json`),index);
}

await writeText(join(out,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: https://chudzinovich.pp.ua/sitemap.xml\n`);
const urls = [];
for (const lang of langs) for (const path of generatedPaths.get(lang)) urls.push(`https://chudzinovich.pp.ua${route(lang,path)}`);
urls.sort();
await writeText(join(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url=>`<url><loc>${esc(url)}</loc></url>`).join('')}</urlset>\n`);

await writeJson(join(out,'build-manifest.json'),{
  snapshot_id:manifest.snapshot_id,
  publication_state:manifest.publication_state,
  generated_at:new Date().toISOString(),
  data_source:testMode ? 'SYNTHETIC_TEST_SNAPSHOT' : 'PUBLIC_CURRENT_SNAPSHOT',
  people_rendered:people.length,
  profile_pages:people.length * langs.length,
  third_party_runtime_requests:0,
  political_prisoner_autodesignation:false,
  high_risk_autopublish:false,
  sensitive_submission_form:false
});

console.log(`BUILD=PASS snapshot=${manifest.snapshot_id} people=${people.length} test_mode=${testMode}`);
