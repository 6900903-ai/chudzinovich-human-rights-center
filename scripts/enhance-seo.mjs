import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeText } from './lib/fs.mjs';
import { resolvePublicDataDir } from './lib/public-data.mjs';
import { publicNewsItems, localizedNewsValue, newsRelativePath } from './lib/news.mjs';
import { route } from './templates.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = join(root, '_site');
const dataDir = resolvePublicDataDir(root);
const SITE = 'https://chudzinovich.pp.ua';
const BRAND = 'CHUDO HUMAN RIGHTS CENTER';
const MARKER = '<!-- CHUDO_SEO_V1 -->';
const news = publicNewsItems(await readJson(join(dataDir, 'news.json')));

const SEO = {
  ru: {
    '/': ['Правозащитный центр CHUDO — политзаключённые и репрессии в Беларуси','Правозащитный центр CHUDO: база политзаключённых, репрессий, мест заключения, новости, мониторинг и публичные источники по Беларуси.'],
    '/prisoners/': ['Политзаключённые Беларуси — актуальная база CHUDO','Политзаключённые Беларуси: публичные карточки, даты задержаний, приговоры, места заключения, источники и история изменений данных.'],
    '/former-prisoners/': ['Бывшие политзаключённые Беларуси — база CHUDO','Бывшие политзаключённые Беларуси: освобождения, история преследования, судебные решения, источники и обновления публичной базы CHUDO.'],
    '/repressed/': ['Политические репрессии в Беларуси — база CHUDO','Документированная база политических репрессий в Беларуси: люди, задержания, уголовные дела, приговоры, места заключения и источники.'],
    '/prisons/': ['Тюрьмы и колонии Беларуси — места заключения политзаключённых','Справочник мест заключения Беларуси: СИЗО, тюрьмы, колонии и учреждения, связанные с политическими репрессиями и политзаключёнными.'],
    '/news/': ['Новости Беларуси о репрессиях и правах человека — CHUDO','Новости о политических репрессиях, политзаключённых, судах, задержаниях и правах человека в Беларуси с указанием первоисточников.'],
    '/monitoring/': ['Мониторинг политических репрессий в Беларуси — CHUDO','Мониторинг задержаний, уголовных дел, судов, переводов, освобождений и других событий политических репрессий в Беларуси.'],
    '/reports/': ['Доклады о политических репрессиях в Беларуси — CHUDO','Доклады и статистические обзоры CHUDO о политзаключённых, репрессиях, местах заключения и динамике правозащитных событий в Беларуси.'],
    '/sources/': ['Источники CHUDO — Вясна, СМИ и Telegram','Публичные источники Правозащитного центра CHUDO: Правозащитный центр «Вясна», белорусские СМИ, Telegram-каналы и правила атрибуции.'],
    '/media/': ['Белорусские СМИ — каталог источников CHUDO','Каталог белорусских СМИ и медиапроектов, используемых CHUDO для мониторинга новостей, репрессий и правозащитных событий.'],
    '/channels/': ['Telegram-каналы Беларуси — источники CHUDO','Каталог Telegram-каналов, материалы которых публикуются и архивируются Правозащитным центром CHUDO с ссылками на оригиналы.']
  },
  be: {
    '/': ['Праваабарончы цэнтр CHUDO — палітвязні і рэпрэсіі ў Беларусі','Праваабарончы цэнтр CHUDO: база палітвязняў, рэпрэсій, месцаў зняволення, навіны, маніторынг і публічныя крыніцы па Беларусі.'],
    '/prisoners/': ['Палітвязні Беларусі — актуальная база CHUDO','Палітвязні Беларусі: публічныя карткі, даты затрыманняў, прысуды, месцы зняволення, крыніцы і гісторыя змен даных.'],
    '/repressed/': ['Палітычныя рэпрэсіі ў Беларусі — база CHUDO','Дакументаваная база палітычных рэпрэсій у Беларусі: людзі, затрыманні, крымінальныя справы, прысуды і крыніцы.'],
    '/news/': ['Навіны пра рэпрэсіі і правы чалавека ў Беларусі — CHUDO','Навіны пра палітычныя рэпрэсіі, палітвязняў, суды і затрыманні ў Беларусі з указаннем першакрыніц.']
  },
  en: {
    '/': ['CHUDO Human Rights Center — political prisoners and repression in Belarus','CHUDO Human Rights Center: public database of political prisoners, repression, detention facilities, news, monitoring and sources on Belarus.'],
    '/prisoners/': ['Political prisoners in Belarus — CHUDO database','Political prisoners in Belarus: public profiles, detention dates, sentences, places of detention, sources and data-change history.'],
    '/repressed/': ['Political repression in Belarus — CHUDO database','Documented political repression in Belarus: people, detentions, criminal cases, sentences, detention facilities and public sources.'],
    '/news/': ['Belarus human rights and repression news — CHUDO','News on political repression, political prisoners, trials and detentions in Belarus with source attribution and original links.']
  },
  pl: {
    '/': ['Centrum Praw Człowieka CHUDO — więźniowie polityczni na Białorusi','CHUDO: publiczna baza więźniów politycznych, represji, miejsc osadzenia, aktualności, monitoring i źródła dotyczące Białorusi.'],
    '/prisoners/': ['Więźniowie polityczni na Białorusi — baza CHUDO','Więźniowie polityczni na Białorusi: profile, daty zatrzymań, wyroki, miejsca osadzenia, źródła i historia zmian danych.'],
    '/repressed/': ['Represje polityczne na Białorusi — baza CHUDO','Udokumentowane represje polityczne na Białorusi: osoby, zatrzymania, sprawy karne, wyroki i źródła publiczne.'],
    '/news/': ['Białoruś: prawa człowieka i represje — aktualności CHUDO','Aktualności o represjach politycznych, więźniach politycznych, procesach i zatrzymaniach na Białorusi ze wskazaniem źródeł.']
  }
};

function escHtml(value='') { return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function xmlEsc(value='') { return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;'); }
function langAndPath(file) {
  const rel = relative(out, file).split(sep).join('/');
  const parts = rel.split('/');
  const lang = ['be','en','pl'].includes(parts[0]) ? parts.shift() : 'ru';
  const rest = parts.join('/');
  const path = rest === 'index.html' ? '/' : rest.endsWith('/index.html') ? `/${rest.slice(0,-'index.html'.length)}` : `/${rest}`;
  return {lang,path};
}
async function htmlFiles(dir) { const entries = await readdir(dir,{withFileTypes:true}); const outFiles=[]; for (const entry of entries) { const p=join(dir,entry.name); if(entry.isDirectory()) outFiles.push(...await htmlFiles(p)); else if(entry.isFile()&&entry.name.endsWith('.html')) outFiles.push(p); } return outFiles; }
function absolute(lang,path) { return `${SITE}${route(lang,path)}`; }
function jsonLd(data) { return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g,'\\u003c')}</script>`; }

const organization = {
  '@context':'https://schema.org', '@type':'Organization', '@id':`${SITE}/#organization`,
  name:'CHUDO Human Rights Center', alternateName:'Правозащитный центр CHUDO', url:`${SITE}/`,
  sameAs:['https://t.me/Z690002'], areaServed:{'@type':'Country',name:'Belarus'},
  knowsAbout:['human rights','political prisoners','political repression','Belarus']
};
const website = {
  '@context':'https://schema.org','@type':'WebSite','@id':`${SITE}/#website`,url:`${SITE}/`,name:'CHUDO Human Rights Center',
  publisher:{'@id':`${SITE}/#organization`},inLanguage:['ru','be','en','pl'],
  potentialAction:{'@type':'SearchAction',target:`${SITE}/search/?q={search_term_string}`,'query-input':'required name=search_term_string'}
};

let changed = 0;
for (const file of await htmlFiles(out)) {
  if (file.endsWith('/404.html')) continue;
  let html = await readFile(file,'utf8');
  if (html.includes(MARKER)) continue;
  const {lang,path} = langAndPath(file);
  const seo = SEO[lang]?.[path];
  if (seo) {
    const [title,description] = seo;
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escHtml(title)}</title>`);
    html = html.replace(/<meta name="description" content="[^"]*">/i, `<meta name="description" content="${escHtml(description)}">`);
    html = html.replace(/<meta property="og:title" content="[^"]*">/i, `<meta property="og:title" content="${escHtml(title)}">`);
    html = html.replace(/<meta property="og:description" content="[^"]*">/i, `<meta property="og:description" content="${escHtml(description)}">`);
  }
  const canonical = absolute(lang,path);
  const locale = ({ru:'ru_RU',be:'be_BY',en:'en_US',pl:'pl_PL'})[lang];
  const headExtras = [
    `<meta property="og:site_name" content="${BRAND}">`,
    `<meta property="og:locale" content="${locale}">`,
    `<meta name="theme-color" content="#0A2540">`,
    `<link rel="alternate" type="application/rss+xml" title="CHUDO — ${lang.toUpperCase()}" href="${route(lang,'/feed.xml')}">`,
    path==='/' ? jsonLd(organization) : '',
    path==='/' ? jsonLd(website) : ''
  ].filter(Boolean).join('\n');

  if (/^\/news\/[^/]+\/$/.test(path)) {
    const title = html.match(/<h1>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g,'').trim() || BRAND;
    const description = html.match(/<meta name="description" content="([^"]*)">/i)?.[1] || '';
    const published = html.match(/<time[^>]+datetime="([^"]+)"/i)?.[1] || null;
    const article = {
      '@context':'https://schema.org','@type':'NewsArticle',headline:title,description,url:canonical,mainEntityOfPage:canonical,
      publisher:{'@id':`${SITE}/#organization`},inLanguage:lang
    };
    if (published) article.datePublished = published;
    html = html.replace('</head>', `${published ? `<meta property="article:published_time" content="${escHtml(published)}">\n` : ''}${jsonLd(article)}\n</head>`);
  }

  const crumbs = path.split('/').filter(Boolean);
  if (crumbs.length) {
    const items = [{'@type':'ListItem',position:1,name:'CHUDO',item:absolute(lang,'/')}];
    let current='';
    crumbs.forEach((segment,index)=>{ current += `/${segment}`; const url=current+'/'; items.push({'@type':'ListItem',position:index+2,name:segment.replaceAll('-',' '),item:absolute(lang,url)}); });
    html = html.replace('</head>', `${jsonLd({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:items})}\n</head>`);
  }
  html = html.replace('</head>', `${headExtras}\n${MARKER}\n</head>`);
  await writeText(file,html); changed++;
}

function feedFor(lang) {
  const title = ({ru:'Правозащитный центр CHUDO — новости',be:'Праваабарончы цэнтр CHUDO — навіны',en:'CHUDO Human Rights Center — News',pl:'Centrum Praw Człowieka CHUDO — Aktualności'})[lang];
  const description = ({ru:'Новости и материалы Правозащитного центра CHUDO о Беларуси.',be:'Навіны і матэрыялы Праваабарончага цэнтра CHUDO пра Беларусь.',en:'News and source materials from CHUDO Human Rights Center on Belarus.',pl:'Aktualności i materiały Centrum Praw Człowieka CHUDO dotyczące Białorusi.'})[lang];
  const entries = news.slice(0,50).map(item => {
    const itemTitle = localizedNewsValue(item.title,lang);
    const summary = localizedNewsValue(item.summary,lang);
    const link = absolute(lang,newsRelativePath(item));
    return `<item><title>${xmlEsc(itemTitle)}</title><link>${xmlEsc(link)}</link><guid isPermaLink="true">${xmlEsc(link)}</guid><description>${xmlEsc(summary)}</description><pubDate>${new Date(item.published_at).toUTCString()}</pubDate></item>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${xmlEsc(title)}</title><link>${xmlEsc(absolute(lang,'/news/'))}</link><description>${xmlEsc(description)}</description><language>${lang}</language>${entries}</channel></rss>\n`;
}
for (const lang of ['ru','be','en','pl']) {
  const prefix = lang==='ru' ? '' : lang;
  await writeText(join(out,prefix,'feed.xml'),feedFor(lang));
}
console.log(`SEO_ENHANCE=PASS html=${changed} feeds=4 news=${news.length}`);
