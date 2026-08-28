const SITE = 'https://chudzinovich.pp.ua';

const I18N = {
  ru: {
    langName: 'RU', home: 'ГЛАВНАЯ', prisoners: 'ПОЛИТЗАКЛЮЧЁННЫЕ', repressed: 'РЕПРЕССИИ', prisons: 'ТЮРЬМЫ',
    news: 'НОВОСТИ', monitoring: 'МОНИТОРИНГ', reports: 'ДОКЛАДЫ', help: 'КАК ПОМОЧЬ', about: 'О НАС',
    hero: 'Документируем репрессии. Помогаем людям. Сохраняем имена.', find: 'НАЙТИ ПОЛИТЗАКЛЮЧЁННОГО',
    searchPlaceholder: 'Имя или фамилия…', current: 'ПОЛИТЗАКЛЮЧЁННЫЕ СЕЙЧАС', recognized: 'ВСЕГО ПРИЗНАНО',
    repressedTotal: 'ПОЛИТИЧЕСКИ ПРЕСЛЕДОВАЛИСЬ', released: 'ОСВОБОЖДЕНО', empty: 'Публичная база ещё не опубликована.',
    buildNotice: 'Сайт находится в стадии разработки. Публикация реальных данных заблокирована до прохождения обязательных проверок.'
  },
  be: {
    langName: 'BE', home: 'ГАЛОЎНАЯ', prisoners: 'ПАЛІТВЯЗНІ', repressed: 'РЭПРЭСІІ', prisons: 'ТУРМЫ', news: 'НАВІНЫ',
    monitoring: 'МАНІТОРЫНГ', reports: 'ДАКЛАДЫ', help: 'ЯК ДАПАМАГЧЫ', about: 'ПРА НАС',
    hero: 'Дакументуем рэпрэсіі. Дапамагаем людзям. Захоўваем імёны.', find: 'ЗНАЙСЦІ ПАЛІТВЯЗНЯ', searchPlaceholder: 'Імя або прозвішча…',
    current: 'ПАЛІТВЯЗНІ ЦЯПЕР', recognized: 'УСЯГО ПРЫЗНАНА', repressedTotal: 'ПАЛІТЫЧНА ПЕРАСЛЕДАВАЛІСЯ', released: 'ВЫЗВАЛЕНА',
    empty: 'Публічная база яшчэ не апублікаваная.', buildNotice: 'Сайт знаходзіцца ў распрацоўцы. Публікацыя рэальных даных заблакаваная да абавязковых праверак.'
  },
  en: {
    langName: 'EN', home: 'HOME', prisoners: 'POLITICAL PRISONERS', repressed: 'REPRESSION', prisons: 'PRISONS', news: 'NEWS',
    monitoring: 'MONITORING', reports: 'REPORTS', help: 'HOW TO HELP', about: 'ABOUT',
    hero: 'Documenting repression. Helping people. Preserving names.', find: 'FIND A POLITICAL PRISONER', searchPlaceholder: 'Name or surname…',
    current: 'POLITICAL PRISONERS NOW', recognized: 'TOTAL RECOGNIZED', repressedTotal: 'POLITICALLY PERSECUTED', released: 'RELEASED',
    empty: 'The public database has not been published yet.', buildNotice: 'This site is under development. Publication of real records is blocked until mandatory gates pass.'
  },
  pl: {
    langName: 'PL', home: 'GŁÓWNA', prisoners: 'WIĘŹNIOWIE POLITYCZNI', repressed: 'REPRESJE', prisons: 'WIĘZIENIA', news: 'AKTUALNOŚCI',
    monitoring: 'MONITORING', reports: 'RAPORTY', help: 'JAK POMÓC', about: 'O NAS',
    hero: 'Dokumentujemy represje. Pomagamy ludziom. Zachowujemy nazwiska.', find: 'ZNAJDŹ WIĘŹNIA POLITYCZNEGO', searchPlaceholder: 'Imię lub nazwisko…',
    current: 'WIĘŹNIOWIE POLITYCZNI TERAZ', recognized: 'ŁĄCZNIE UZNANI', repressedTotal: 'PRZEŚLADOWANI POLITYCZNIE', released: 'ZWOLNIENI',
    empty: 'Publiczna baza nie została jeszcze opublikowana.', buildNotice: 'Strona jest w budowie. Publikacja rzeczywistych danych pozostaje zablokowana do zakończenia obowiązkowych kontroli.'
  }
};

export function prefix(lang) { return lang === 'ru' ? '' : `/${lang}`; }
export function route(lang, path='') { return `${prefix(lang)}${path || '/'}`.replace('//','/'); }

function esc(s='') { return String(s).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])); }

function nav(lang) {
  const t = I18N[lang];
  return [
    ['', t.home], ['/prisoners/', t.prisoners], ['/repressed/', t.repressed], ['/prisons/', t.prisons],
    ['/news/', t.news], ['/monitoring/', t.monitoring], ['/reports/', t.reports], ['/help/', t.help], ['/about/', t.about]
  ];
}

export function layout({ lang='ru', title, description, path='/', body, pageType='website' }) {
  const t = I18N[lang];
  const canonical = `${SITE}${route(lang, path)}`;
  const links = nav(lang).map(([p,label]) => `<a href="${route(lang,p)}">${esc(label)}</a>`).join('');
  const side = nav(lang).map(([p,label]) => `<a href="${route(lang,p)}">${esc(label)}</a>`).join('');
  const langs = ['ru','be','en','pl'].map(l => `<a href="${route(l,path)}"${l===lang?' aria-current="page"':''}>${I18N[l].langName}</a>`).join('');
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} | CHUDZINOVICH HUMAN RIGHTS CENTER</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="${pageType}">
<meta property="og:title" content="${esc(title)} | CHUDZINOVICH HUMAN RIGHTS CENTER">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary">
<link rel="stylesheet" href="/assets/css/main.css">
<script src="/assets/js/main.js" defer></script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="header-main">
    <button id="menu-open" class="icon-btn" type="button" aria-controls="side-menu" aria-expanded="false" aria-label="Menu"><span></span><span></span><span></span></button>
    <a class="brand holo-text" href="${route(lang,'/')}">CHUDZINOVICH</a>
    <a class="help-chip" href="${route(lang,'/help/')}">${esc(t.help)}</a>
  </div>
  <div class="nav-shell"><button class="nav-arrow" data-nav="left" aria-label="Previous">❮</button><nav id="top-nav" class="top-nav">${links}</nav><button class="nav-arrow" data-nav="right" aria-label="Next">❯</button></div>
</header>
<div id="side-overlay" class="side-overlay" hidden></div>
<aside id="side-menu" class="side-menu" aria-hidden="true" aria-label="Site menu">
  <div class="side-head"><span class="holo-text">CHUDZINOVICH</span><button id="menu-close" class="close-btn" aria-label="Close menu">×</button></div>
  <nav class="side-links">${side}</nav>
  <div class="language-links" aria-label="Languages">${langs}</div>
</aside>
<main id="main">${body}</main>
<footer class="site-footer"><strong>CHUDZINOVICH HUMAN RIGHTS CENTER</strong><span>${esc(t.buildNotice)}</span></footer>
</body></html>`;
}

export function translations(lang) { return I18N[lang]; }
export { esc };
