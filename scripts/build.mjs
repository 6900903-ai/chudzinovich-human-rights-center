import { join } from 'node:path';
import { readJson, writeJson, writeText, resetDir, copyDir } from './lib/fs.mjs';
import { layout, translations, route, esc } from './templates.mjs';

const root = new URL('../', import.meta.url).pathname;
const out = join(root, '_site');
const dataDir = join(root, 'data/public/current');
const manifest = await readJson(join(dataDir, 'manifest.json'));
const people = await readJson(join(dataDir, 'people.json'));
const prisons = await readJson(join(dataDir, 'prisons.json'));
const news = await readJson(join(dataDir, 'news.json'));

await resetDir(out);
await copyDir(join(root, 'src/assets'), join(out, 'assets'));

const langs = ['ru','be','en','pl'];
const pages = [
  ['/repressed/', {ru:'Все репрессированные',be:'Усе рэпрэсаваныя',en:'All repressed people',pl:'Wszystkie osoby represjonowane'}],
  ['/prisons/', {ru:'Тюрьмы и колонии',be:'Турмы і калоніі',en:'Prisons and penal colonies',pl:'Więzienia i kolonie karne'}],
  ['/news/', {ru:'Новости',be:'Навіны',en:'News',pl:'Aktualności'}],
  ['/monitoring/', {ru:'Мониторинг',be:'Маніторынг',en:'Monitoring',pl:'Monitoring'}],
  ['/reports/', {ru:'Доклады',be:'Даклады',en:'Reports',pl:'Raporty'}],
  ['/help/', {ru:'Как помочь',be:'Як дапамагчы',en:'How to help',pl:'Jak pomóc'}],
  ['/about/', {ru:'О центре',be:'Пра цэнтр',en:'About the center',pl:'O centrum'}]
];

function outputPath(lang, path) {
  const prefix = lang === 'ru' ? '' : lang;
  const clean = path.replace(/^\//,'').replace(/\/$/,'');
  return join(out, prefix, clean, 'index.html');
}

function statValue(value) { return manifest.publication_state === 'PUBLISHED' ? String(value) : '—'; }

function homeBody(lang) {
  const t = translations(lang);
  return `<section class="hero"><div class="container hero-inner"><p class="eyebrow">HUMAN RIGHTS CENTER</p><h1><span class="holo-text">CHUDZINOVICH</span><br>HUMAN RIGHTS CENTER</h1><p class="hero-copy">${esc(t.hero)}</p><a class="primary-btn" href="${route(lang,'/prisoners/')}">${esc(t.find)}</a></div></section>
  <section class="container stats" aria-label="Statistics">
    <article><strong>${statValue(manifest.counts.political_prisoners_current)}</strong><span>${esc(t.current)}</span></article>
    <article><strong>${statValue(manifest.counts.people)}</strong><span>${esc(t.recognized)}</span></article>
    <article><strong>${statValue(manifest.counts.repressed_total)}</strong><span>${esc(t.repressedTotal)}</span></article>
    <article><strong>${statValue(manifest.counts.former_political_prisoners)}</strong><span>${esc(t.released)}</span></article>
  </section>
  <section class="container search-panel"><h2>${esc(t.find)}</h2><form action="${route(lang,'/prisoners/')}" method="get"><label class="sr-only" for="home-search">${esc(t.searchPlaceholder)}</label><input id="home-search" name="q" type="search" autocomplete="off" placeholder="${esc(t.searchPlaceholder)}"><button type="submit">${esc(t.find)}</button></form></section>
  <section class="container empty-state"><h2>Snapshot</h2><p>${esc(t.empty)}</p><code>${esc(manifest.snapshot_id)}</code></section>`;
}

function prisonersBody(lang) {
  const t = translations(lang);
  const cards = people.map(p => `<article class="person-card"><div class="avatar" aria-hidden="true">${esc((p.canonical_name[lang]||p.canonical_name.ru).split(/\s+/).slice(0,2).map(x=>x[0]).join(''))}</div><h2>${esc(p.canonical_name[lang]||p.canonical_name.ru)}</h2><p>${esc(p.person_id)}</p></article>`).join('');
  return `<section class="container catalog"><div class="catalog-head"><div><p class="eyebrow">DATABASE</p><h1>${esc(t.prisoners)}</h1></div><button id="filters-btn" class="secondary-btn" type="button" aria-controls="filters">Filters</button></div>
  <div class="sticky-search"><label class="sr-only" for="catalog-search">${esc(t.searchPlaceholder)}</label><input id="catalog-search" type="search" placeholder="${esc(t.searchPlaceholder)}" autocomplete="off"></div>
  <div id="search-status" class="search-status" aria-live="polite"></div>
  <div id="people-grid" class="people-grid">${cards || `<div class="empty-state"><p>${esc(t.empty)}</p></div>`}</div></section>`;
}

for (const lang of langs) {
  const t = translations(lang);
  await writeText(outputPath(lang, '/'), layout({lang, title:'CHUDZINOVICH HUMAN RIGHTS CENTER', description:t.hero, path:'/', body:homeBody(lang)}));
  await writeText(outputPath(lang, '/prisoners/'), layout({lang, title:t.prisoners, description:t.find, path:'/prisoners/', body:prisonersBody(lang)}));
  for (const [path, titles] of pages) {
    let detail = `<section class="container page"><p class="eyebrow">CHUDZINOVICH HUMAN RIGHTS CENTER</p><h1>${esc(titles[lang])}</h1><div class="empty-state"><p>${esc(t.empty)}</p></div></section>`;
    if (path === '/prisons/' && prisons.length) detail = `<section class="container page"><h1>${esc(titles[lang])}</h1></section>`;
    if (path === '/news/' && news.length) detail = `<section class="container page"><h1>${esc(titles[lang])}</h1></section>`;
    await writeText(outputPath(lang, path), layout({lang, title:titles[lang], description:titles[lang], path, body:detail}));
  }
}

for (const lang of langs) {
  const index = people.map(p => ({
    id: p.person_id,
    name: p.canonical_name[lang] || p.canonical_name.ru,
    aliases: p.aliases,
    status: p.status_events?.at(-1)?.status || null,
    tokens: [p.canonical_name.ru, p.canonical_name.be, p.canonical_name.en, p.canonical_name.pl, ...(p.aliases||[])].filter(Boolean)
  }));
  await writeJson(join(out, 'search-index', `${lang}.json`), index);
}

await writeText(join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: https://chudzinovich.pp.ua/sitemap.xml\n`);
const urls = [];
for (const lang of langs) for (const path of ['/', '/prisoners/', ...pages.map(p=>p[0])]) urls.push(`https://chudzinovich.pp.ua${route(lang,path)}`);
await writeText(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${u}</loc></url>`).join('')}</urlset>\n`);

await writeJson(join(out, 'build-manifest.json'), {
  snapshot_id: manifest.snapshot_id,
  publication_state: manifest.publication_state,
  generated_at: new Date().toISOString(),
  third_party_runtime_requests: 0,
  political_prisoner_autodesignation: false,
  high_risk_autopublish: false,
  sensitive_submission_form: false
});

console.log(`BUILD=PASS snapshot=${manifest.snapshot_id}`);
