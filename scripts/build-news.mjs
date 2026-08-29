import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { readJson, writeText } from './lib/fs.mjs';
import { resolvePublicDataDir } from './lib/public-data.mjs';
import { publicNewsItems, localizedNewsValue, newsRelativePath } from './lib/news.mjs';
import { layout, translations, route, esc } from './templates.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = join(root, '_site');
const dataDir = resolvePublicDataDir(root);
const items = publicNewsItems(await readJson(join(dataDir,'news.json')));
const langs = ['ru','be','en','pl'];

function outputPath(lang, path) {
  const prefix = lang === 'ru' ? '' : lang;
  const clean = String(path).replace(/^\//,'').replace(/\/$/,'');
  return join(out,prefix,clean,'index.html');
}

function sourceLabel(lang) {
  return ({ru:'Источник',be:'Крыніца',en:'Source',pl:'Źródło'})[lang];
}
function sourceClaimLabel(lang) {
  return ({ru:'По данным источника',be:'Паводле крыніцы',en:'According to the source',pl:'Według źródła'})[lang];
}
function openSourceLabel(lang) {
  return ({ru:'Открыть первоисточник',be:'Адкрыць першакрыніцу',en:'Open primary source',pl:'Otwórz źródło pierwotne'})[lang];
}
function noNewsLabel(lang) {
  return ({ru:'Опубликованных материалов пока нет.',be:'Апублікаваных матэрыялаў пакуль няма.',en:'No published materials yet.',pl:'Brak opublikowanych materiałów.'})[lang];
}

function formatDate(value, lang) {
  try { return new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)); }
  catch { return value || ''; }
}

function card(item, lang) {
  const title = localizedNewsValue(item.title,lang);
  const summary = localizedNewsValue(item.summary,lang);
  const path = route(lang,newsRelativePath(item));
  return `<article class="tech-news-card"><div class="tech-news-meta"><span class="tech-news-tag">${esc(item.category || item.source_kind)}</span><time class="tech-news-date" datetime="${esc(item.published_at)}">${esc(formatDate(item.published_at,lang))}</time></div><h2 class="tech-news-title"><a href="${path}">${esc(title)}</a></h2><p class="tech-news-summary">${esc(summary)}</p><p class="source-mini">${esc(sourceClaimLabel(lang))}: ${esc(item.source_name)}</p></article>`;
}

function indexBody(lang) {
  const t = translations(lang);
  return `<section class="container page news-feed-section"><p class="eyebrow">CHUDO HUMAN RIGHTS CENTER</p><h1>${esc(t.news)}</h1><p class="catalog-note">${esc(sourceClaimLabel(lang))}. CHUDO публикует собственный краткий пересказ и атрибуцию, а не автоматически копирует полный текст третьей стороны.</p>${items.length ? `<div class="news-grid">${items.map(item=>card(item,lang)).join('')}</div>` : `<div class="empty-state"><p>${esc(noNewsLabel(lang))}</p></div>`}</section>`;
}

function itemBody(item, lang) {
  const title = localizedNewsValue(item.title,lang);
  const summary = localizedNewsValue(item.summary,lang);
  return `<article class="container page"><p class="eyebrow">${esc(item.category || item.source_kind)}</p><h1>${esc(title)}</h1><p class="tech-news-date"><time datetime="${esc(item.published_at)}">${esc(formatDate(item.published_at,lang))}</time></p><div class="profile-section"><p>${esc(summary)}</p></div><section class="profile-section"><h2>${esc(sourceLabel(lang))}</h2><p><strong>${esc(item.source_name)}</strong></p><p>${esc(sourceClaimLabel(lang))}</p><a class="secondary-btn" href="${esc(item.source_url)}" rel="external nofollow noopener">${esc(openSourceLabel(lang))}</a></section></article>`;
}

for (const lang of langs) {
  const t = translations(lang);
  await writeText(outputPath(lang,'/news/'),layout({lang,title:t.news,description:`${t.news} — CHUDO HUMAN RIGHTS CENTER`,path:'/news/',body:indexBody(lang)}));
  for (const item of items) {
    const path = newsRelativePath(item);
    const noIndex = item.publication_state === 'PUBLIC_DISPUTED';
    await writeText(outputPath(lang,path),layout({lang,title:localizedNewsValue(item.title,lang),description:localizedNewsValue(item.summary,lang),path,body:itemBody(item,lang),pageType:'article',noIndex}));
  }
}

if (items.length) {
  const sitemapPath = join(out,'sitemap.xml');
  let sitemap = await readFile(sitemapPath,'utf8');
  const urls = [];
  for (const lang of langs) for (const item of items) urls.push(`https://chudzinovich.pp.ua${route(lang,newsRelativePath(item))}`);
  const addition = urls.map(url=>`<url><loc>${url}</loc></url>`).join('');
  sitemap = sitemap.replace('</urlset>',`${addition}</urlset>`);
  await writeText(sitemapPath,sitemap);
}

console.log(`NEWS_BUILD=PASS items=${items.length}`);
