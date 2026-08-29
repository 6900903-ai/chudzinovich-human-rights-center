import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeText } from './lib/fs.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = join(root, '_site');
const SITE = 'https://chudzinovich.pp.ua';
const MARKER = '<!-- CHUDO_TRUST_SIGNALS_V1 -->';
const PUBLISHED = '2026-08-29T00:00:00+02:00';
const AUTHORITY_PATHS = new Set([
  '/human-rights-belarus/',
  '/political-prisoners-belarus/',
  '/political-repression-belarus/',
  '/research-and-citation-guide/'
]);

const META = {
  ru: {
    locale: 'ru_RU',
    hubTitle: 'Основные правозащитные материалы',
    hubText: 'Проверяемые объяснения о правах человека, статусе политзаключённых, документировании репрессий и корректном цитировании данных.',
    links: [
      ['/human-rights-belarus/','Права человека в Беларуси'],
      ['/political-prisoners-belarus/','Политзаключённые Беларуси'],
      ['/political-repression-belarus/','Политические репрессии'],
      ['/research-and-citation-guide/','Руководство для исследователей']
    ],
    pages: {
      '/': ['Правозащитный центр CHUDO — права человека и репрессии в Беларуси','CHUDO документирует политические репрессии и нарушения прав человека в Беларуси, публикует проверяемые источники, исправления и исследовательские материалы.'],
      '/about/': ['О Правозащитном центре CHUDO — миссия и ответственность','Миссия, принципы независимости, публичная ответственность и границы работы Правозащитного центра CHUDO.'],
      '/methodology/': ['Методология CHUDO — проверка правозащитных данных','Как CHUDO проверяет личности, даты, статусы, источники и противоречия перед публикацией правозащитных записей.'],
      '/sources/': ['Источники CHUDO — происхождение правозащитных данных','Реестр публичных источников CHUDO, правила атрибуции, ограничения повторной публикации и различие между сообщением источника и подтверждённым фактом.'],
      '/corrections/': ['Исправления данных CHUDO — прозрачная история изменений','Как сообщить об ошибке, как CHUDO проверяет исправления и почему существенные изменения сохраняются в публичной истории.'],
      '/monitoring/': ['Мониторинг прав человека в Беларуси — CHUDO','Методический мониторинг политических репрессий в Беларуси: события, источники, даты наблюдения и пределы подтверждённого.'],
      '/reports/': ['Доклады о правах человека и репрессиях в Беларуси — CHUDO','Исследовательские материалы и будущие проверяемые доклады CHUDO о политических репрессиях и правах человека в Беларуси.'],
      '/help/': ['Как помочь политзаключённым и правозащитной работе — CHUDO','Проверяемые способы поддержки, безопасная работа с адресами заключения и правила передачи исправлений в базу CHUDO.']
    }
  },
  be: {
    locale: 'be_BY',
    hubTitle: 'Асноўныя праваабарончыя матэрыялы',
    hubText: 'Правяральныя тлумачэнні пра правы чалавека, статус палітвязняў, дакументаванне рэпрэсій і карэктнае цытаванне даных.',
    links: [
      ['/human-rights-belarus/','Правы чалавека ў Беларусі'],
      ['/political-prisoners-belarus/','Палітвязні Беларусі'],
      ['/political-repression-belarus/','Палітычныя рэпрэсіі'],
      ['/research-and-citation-guide/','Гід для даследчыкаў']
    ],
    pages: {
      '/': ['Праваабарончы цэнтр CHUDO — правы чалавека ў Беларусі','CHUDO дакументуе палітычныя рэпрэсіі і парушэнні правоў чалавека ў Беларусі, публікуе правяральныя крыніцы, выпраўленні і даследаванні.'],
      '/about/': ['Пра Праваабарончы цэнтр CHUDO — місія і адказнасць','Місія, прынцыпы незалежнасці, публічная адказнасць і межы працы Праваабарончага цэнтра CHUDO.'],
      '/methodology/': ['Метадалогія CHUDO — праверка праваабарончых даных','Як CHUDO правярае асобы, даты, статусы, крыніцы і супярэчнасці перад публікацыяй запісаў.'],
      '/sources/': ['Крыніцы CHUDO — паходжанне праваабарончых даных','Рэестр публічных крыніц, правілы атрыбуцыі і розніца паміж паведамленнем крыніцы і пацверджаным фактам.'],
      '/corrections/': ['Выпраўленні даных CHUDO — празрыстая гісторыя змен','Як паведаміць пра памылку, як правяраюцца выпраўленні і чаму істотныя змены захоўваюцца ў гісторыі.'],
      '/monitoring/': ['Маніторынг правоў чалавека ў Беларусі — CHUDO','Маніторынг палітычных рэпрэсій у Беларусі: падзеі, крыніцы, даты назірання і межы пацверджанага.'],
      '/reports/': ['Даклады пра правы чалавека ў Беларусі — CHUDO','Даследчыя матэрыялы і правяральныя даклады CHUDO пра палітычныя рэпрэсіі і правы чалавека.'],
      '/help/': ['Як дапамагчы палітвязням і праваабарончай працы — CHUDO','Бяспечныя спосабы падтрымкі, праверка адрасоў зняволення і перадача выпраўленняў у базу CHUDO.']
    }
  },
  en: {
    locale: 'en_US',
    hubTitle: 'Core human-rights guides',
    hubText: 'Verifiable explanations of human rights, political-prisoner status, repression documentation and responsible data citation.',
    links: [
      ['/human-rights-belarus/','Human rights in Belarus'],
      ['/political-prisoners-belarus/','Political prisoners in Belarus'],
      ['/political-repression-belarus/','Political repression'],
      ['/research-and-citation-guide/','Research and citation guide']
    ],
    pages: {
      '/': ['CHUDO Human Rights Center — Belarus human-rights documentation','CHUDO documents political repression and human-rights violations in Belarus through verifiable sources, transparent corrections and research-oriented public records.'],
      '/about/': ['About CHUDO Human Rights Center — mission and accountability','The mission, independence principles, public accountability and operational boundaries of CHUDO Human Rights Center.'],
      '/methodology/': ['CHUDO methodology — verifying human-rights records','How CHUDO verifies identities, dates, status designations, sources and conflicts before publishing human-rights records.'],
      '/sources/': ['CHUDO sources — provenance of human-rights data','The public source registry, attribution rules, reuse limits and the distinction between a source report and a verified fact.'],
      '/corrections/': ['CHUDO data corrections — transparent change history','How to report an error, how corrections are verified and why material changes remain visible in public history.'],
      '/monitoring/': ['Belarus human-rights monitoring — CHUDO','Methodical monitoring of political repression in Belarus through events, sources, observation dates and explicit evidentiary limits.'],
      '/reports/': ['Belarus human-rights and repression reports — CHUDO','Research materials and future verifiable CHUDO reports on political repression and human rights in Belarus.'],
      '/help/': ['How to support political prisoners and human-rights work — CHUDO','Safer support guidance, current detention-address checks and responsible correction submissions to CHUDO.']
    }
  },
  pl: {
    locale: 'pl_PL',
    hubTitle: 'Najważniejsze materiały o prawach człowieka',
    hubText: 'Weryfikowalne wyjaśnienia dotyczące praw człowieka, statusu więźniów politycznych, dokumentowania represji i odpowiedzialnego cytowania danych.',
    links: [
      ['/human-rights-belarus/','Prawa człowieka na Białorusi'],
      ['/political-prisoners-belarus/','Więźniowie polityczni'],
      ['/political-repression-belarus/','Represje polityczne'],
      ['/research-and-citation-guide/','Przewodnik dla badaczy']
    ],
    pages: {
      '/': ['Centrum Praw Człowieka CHUDO — dokumentacja Białorusi','CHUDO dokumentuje represje polityczne i naruszenia praw człowieka na Białorusi poprzez weryfikowalne źródła, jawne korekty i materiały badawcze.'],
      '/about/': ['O Centrum Praw Człowieka CHUDO — misja i odpowiedzialność','Misja, zasady niezależności, odpowiedzialność publiczna i granice działania Centrum Praw Człowieka CHUDO.'],
      '/methodology/': ['Metodologia CHUDO — weryfikacja danych praw człowieka','Jak CHUDO sprawdza tożsamość, daty, statusy, źródła i sprzeczności przed publikacją rekordów.'],
      '/sources/': ['Źródła CHUDO — pochodzenie danych praw człowieka','Publiczny rejestr źródeł, zasady atrybucji, ograniczenia ponownej publikacji i różnica między relacją a potwierdzonym faktem.'],
      '/corrections/': ['Korekty danych CHUDO — przejrzysta historia zmian','Jak zgłosić błąd, jak weryfikowane są korekty i dlaczego istotne zmiany pozostają widoczne.'],
      '/monitoring/': ['Monitoring praw człowieka na Białorusi — CHUDO','Metodyczny monitoring represji politycznych poprzez zdarzenia, źródła, daty obserwacji i jawne granice dowodowe.'],
      '/reports/': ['Raporty o prawach człowieka na Białorusi — CHUDO','Materiały badawcze i przyszłe weryfikowalne raporty CHUDO o represjach politycznych i prawach człowieka.'],
      '/help/': ['Jak pomagać więźniom politycznym i obrońcom praw — CHUDO','Bezpieczniejsze formy wsparcia, kontrola aktualnych adresów osadzenia i odpowiedzialne zgłaszanie korekt.']
    }
  }
};

async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(path);
  }
  return files;
}

function publicPath(file) {
  const rel = relative(out, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
}

function languageAndLogicalPath(path) {
  const match = path.match(/^\/(be|en|pl)(\/.*)$/);
  if (match) return { lang: match[1], logical: match[2] || '/' };
  return { lang: 'ru', logical: path };
}

function replaceTitle(html, title) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
}

function replaceDescription(html, description) {
  const tag = `<meta name="description" content="${escapeHtml(description)}">`;
  if (/<meta\s+name=["']description["']/i.test(html)) {
    return html.replace(/<meta\s+name=["']description["']\s+content=["'][^"']*["']\s*\/?>/i, tag);
  }
  return html.replace('</title>', `</title>\n${tag}`);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
}

function jsonLd(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

function organization() {
  return {
    '@type': 'NGO',
    '@id': `${SITE}/#organization`,
    name: 'CHUDO Human Rights Center',
    alternateName: ['Правозащитный центр CHUDO', 'Праваабарончы цэнтр CHUDO', 'Centrum Praw Człowieka CHUDO'],
    url: `${SITE}/`,
    description: 'Independent human-rights documentation and political-repression monitoring focused on Belarus.',
    logo: {
      '@type': 'ImageObject',
      url: `${SITE}/assets/brand/chudo-mark.svg`,
      width: 512,
      height: 512
    },
    founder: {
      '@type': 'Person',
      name: 'Юрий Чудинович',
      url: 'https://chudzinovich.de/'
    },
    sameAs: [
      'https://t.me/Z690002',
      'https://www.youtube.com/channel/UCTXAwovvaec4w9ztbggWMEQ',
      'https://github.com/6900903-ai'
    ],
    knowsLanguage: ['ru', 'be', 'en', 'pl']
  };
}

function website() {
  return {
    '@type': 'WebSite',
    '@id': `${SITE}/#website`,
    url: `${SITE}/`,
    name: 'CHUDO Human Rights Center',
    publisher: { '@id': `${SITE}/#organization` },
    inLanguage: ['ru', 'be', 'en', 'pl']
  };
}

function articleSchema({ path, lang, title, description }) {
  return {
    '@type': 'Article',
    '@id': `${SITE}${path}#article`,
    headline: title,
    description,
    datePublished: PUBLISHED,
    dateModified: PUBLISHED,
    inLanguage: lang,
    mainEntityOfPage: `${SITE}${path}`,
    author: { '@id': `${SITE}/#organization` },
    publisher: { '@id': `${SITE}/#organization` },
    isPartOf: { '@id': `${SITE}/#website` }
  };
}

function trustSchema({ path, logical, lang, title, description }) {
  const graph = [];
  if (logical === '/' || ['/about/','/methodology/','/contacts/'].includes(logical) || AUTHORITY_PATHS.has(logical)) {
    graph.push(organization());
  }
  if (logical === '/' || AUTHORITY_PATHS.has(logical)) graph.push(website());
  if (AUTHORITY_PATHS.has(logical)) graph.push(articleSchema({ path, lang, title, description }));
  return graph.length ? { '@context': 'https://schema.org', '@graph': graph } : null;
}

function headSignals(lang, copy, schema) {
  const alternates = Object.values(META).filter(item => item.locale !== copy.locale)
    .map(item => `<meta property="og:locale:alternate" content="${item.locale}">`).join('\n');
  return `${MARKER}\n<meta name="author" content="CHUDO Human Rights Center">\n<meta name="theme-color" content="#0A2540">\n<meta property="og:site_name" content="CHUDO Human Rights Center">\n<meta property="og:locale" content="${copy.locale}">\n${alternates}\n<link rel="icon" href="/assets/brand/chudo-mark.svg" type="image/svg+xml">\n<link rel="manifest" href="/site.webmanifest">\n<link rel="alternate" type="application/rss+xml" title="CHUDO Human Rights Center" href="/feed.xml">${schema ? `\n<script type="application/ld+json" data-chudo-trust-schema>${jsonLd(schema)}</script>` : ''}`;
}

function authorityHub(lang, copy) {
  return `<section class="container search-panel authority-hub" aria-labelledby="authority-hub-title"><h2 id="authority-hub-title">${escapeHtml(copy.hubTitle)}</h2><p>${escapeHtml(copy.hubText)}</p><div>${copy.links.map(([path,label]) => `<a class="secondary-btn" href="${lang === 'ru' ? path : `/${lang}${path}`}">${escapeHtml(label)}</a>`).join(' ')}</div></section>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="CHUDO"><defs><linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#10B981"/><stop offset=".55" stop-color="#0575E6"/><stop offset="1" stop-color="#F200CB"/></linearGradient></defs><rect width="512" height="512" rx="112" fill="#0A2540"/><circle cx="256" cy="256" r="184" fill="none" stroke="url(#ring)" stroke-width="28"/><path d="M256 112 376 160v88c0 78-45 128-120 158-75-30-120-80-120-158v-88l120-48Z" fill="#10B981"/><path d="M256 157v191M185 226h142M205 226l-39 69h78l-39-69Zm102 0-39 69h78l-39-69Z" fill="none" stroke="#fff" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/></svg>\n`;
await writeText(join(out, 'assets', 'brand', 'chudo-mark.svg'), svg);
await writeText(join(out, 'site.webmanifest'), JSON.stringify({
  name: 'CHUDO Human Rights Center',
  short_name: 'CHUDO',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#F8FAFC',
  theme_color: '#0A2540',
  icons: [{ src: '/assets/brand/chudo-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
}, null, 2) + '\n');

let changed = 0;
let schemas = 0;
for (const file of await htmlFiles(out)) {
  let html = await readFile(file, 'utf8');
  if (html.includes(MARKER)) continue;
  const path = publicPath(file);
  const { lang, logical } = languageAndLogicalPath(path);
  const copy = META[lang] || META.ru;
  const override = copy.pages[logical];
  if (override) {
    html = replaceTitle(html, override[0]);
    html = replaceDescription(html, override[1]);
  }
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g,'') || 'CHUDO Human Rights Center';
  const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1] || '';
  const schema = trustSchema({ path, logical, lang, title, description });
  if (schema) schemas++;
  html = html.replace('</head>', `${headSignals(lang, copy, schema)}\n</head>`);
  if (logical === '/' && !html.includes('class="container search-panel authority-hub"')) {
    html = html.replace('</main>', `${authorityHub(lang,copy)}\n</main>`);
  }
  await writeText(file, html);
  changed++;
}

console.log(`TRUST_SIGNALS_ENHANCE=PASS html=${changed} schemas=${schemas} authority_pages=${AUTHORITY_PATHS.size * 4} identity_assets=2`);
