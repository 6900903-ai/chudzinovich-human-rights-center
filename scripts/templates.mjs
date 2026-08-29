const SITE = 'https://chudzinovich.pp.ua';
export const BRAND = Object.freeze({
  short: 'CHUDO',
  long: 'CHUDO HUMAN RIGHTS CENTER',
  ru: 'ПРАВОЗАЩИТНЫЙ ЦЕНТР CHUDO'
});

function brandText(value = '') {
  return String(value).replaceAll('CHUDZINOVICH HUMAN RIGHTS CENTER', BRAND.long);
}

function brandBody(value = '') {
  return brandText(value).replaceAll(
    '<span class="holo-text">CHUDZINOVICH</span><br>HUMAN RIGHTS CENTER',
    '<span class="holo-text">CHUDO</span><br>HUMAN RIGHTS CENTER'
  );
}

const I18N = {
  ru: {
    langName:'RU', home:'ГЛАВНАЯ', prisoners:'ПОЛИТЗАКЛЮЧЁННЫЕ', former:'БЫВШИЕ ПОЛИТЗАКЛЮЧЁННЫЕ', repressed:'РЕПРЕССИИ', prisons:'ТЮРЬМЫ', news:'НОВОСТИ', monitoring:'МОНИТОРИНГ', reports:'ДОКЛАДЫ', help:'КАК ПОМОЧЬ', about:'О НАС',
    hero:'Документируем репрессии. Помогаем людям. Сохраняем имена.', find:'НАЙТИ ПОЛИТЗАКЛЮЧЁННОГО', searchPlaceholder:'Имя или фамилия…', current:'ПОЛИТЗАКЛЮЧЁННЫЕ СЕЙЧАС', recognized:'ВСЕГО ПРИЗНАНО', repressedTotal:'ПОЛИТИЧЕСКИ ПРЕСЛЕДОВАЛИСЬ', released:'ОСВОБОЖДЕНО', empty:'Публичная база ещё не опубликована.', buildNotice:'Сайт находится в стадии разработки. Публикация реальных данных заблокирована до прохождения обязательных проверок.',
    cards:'КАРТОЧКИ', table:'ТАБЛИЦА', filters:'ФИЛЬТРЫ', closeFilters:'ЗАКРЫТЬ ФИЛЬТРЫ', all:'Все', gender:'Пол', prison:'Место заключения', region:'Регион', article:'Статья УК', sort:'Сортировка', byName:'По имени', recentUpdated:'Недавно обновлённые', results:'Найдено', showing:'Показано', loadMore:'ПОКАЗАТЬ ЕЩЁ', previous:'Назад', next:'Далее', status:'Статус', lastUpdate:'Последнее обновление', profile:'Открыть карточку', unknown:'Не указано',
    politicalPrisoner:'ПОЛИТЗАКЛЮЧЁННЫЙ', formerPrisoner:'БЫВШИЙ ПОЛИТЗАКЛЮЧЁННЫЙ', repressionDocumented:'ПОЛИТИЧЕСКОЕ ПРЕСЛЕДОВАНИЕ', sourceAttributed:'ПО ДАННЫМ ИСТОЧНИКА', confirmed:'ПОДТВЕРЖДЕНО', disputed:'ДАННЫЕ РАСХОДЯТСЯ', checking:'ПРОВЕРЯЕТСЯ',
    birth:'Дата рождения', detention:'Дата задержания', charges:'Обвинение / статьи УК', verdict:'Приговор', sentence:'Срок / наказание', judge:'Судья', prosecutor:'Прокурор', currentPrison:'Текущее место заключения', lastVerified:'Последнее подтверждение данных', source:'Источник', openSource:'ОТКРЫТЬ ПЕРВОИСТОЧНИК', timeline:'ХРОНОЛОГИЯ', changeHistory:'ИСТОРИЯ ИЗМЕНЕНИЙ', noHistory:'Опубликованных изменений пока нет.', noTimeline:'Опубликованных событий пока нет.', address:'Адрес учреждения', knownPrisoners:'Известные политзаключённые по последним подтверждённым данным', peopleCount:'Человек', sourceNotice:'Статус и факты показываются только с явной атрибуцией происхождения данных.', skip:'Перейти к основному содержанию'
  },
  be: {
    langName:'BE', home:'ГАЛОЎНАЯ', prisoners:'ПАЛІТВЯЗНІ', former:'БЫЛЫЯ ПАЛІТВЯЗНІ', repressed:'РЭПРЭСІІ', prisons:'ТУРМЫ', news:'НАВІНЫ', monitoring:'МАНІТОРЫНГ', reports:'ДАКЛАДЫ', help:'ЯК ДАПАМАГЧЫ', about:'ПРА НАС',
    hero:'Дакументуем рэпрэсіі. Дапамагаем людзям. Захоўваем імёны.', find:'ЗНАЙСЦІ ПАЛІТВЯЗНЯ', searchPlaceholder:'Імя або прозвішча…', current:'ПАЛІТВЯЗНІ ЦЯПЕР', recognized:'УСЯГО ПРЫЗНАНА', repressedTotal:'ПАЛІТЫЧНА ПЕРАСЛЕДАВАЛІСЯ', released:'ВЫЗВАЛЕНА', empty:'Публічная база яшчэ не апублікаваная.', buildNotice:'Сайт знаходзіцца ў распрацоўцы. Публікацыя рэальных даных заблакаваная да абавязковых праверак.',
    cards:'КАРТКІ', table:'ТАБЛІЦА', filters:'ФІЛЬТРЫ', closeFilters:'ЗАКРЫЦЬ ФІЛЬТРЫ', all:'Усе', gender:'Пол', prison:'Месца зняволення', region:'Рэгіён', article:'Артыкул КК', sort:'Сартаванне', byName:'Па імені', recentUpdated:'Нядаўна абноўленыя', results:'Знойдзена', showing:'Паказана', loadMore:'ПАКАЗАЦЬ ЯШЧЭ', previous:'Назад', next:'Далей', status:'Статус', lastUpdate:'Апошняе абнаўленне', profile:'Адкрыць картку', unknown:'Не пазначана',
    politicalPrisoner:'ПАЛІТВЯЗЕНЬ', formerPrisoner:'БЫЛЫ ПАЛІТВЯЗЕНЬ', repressionDocumented:'ПАЛІТЫЧНЫ ПЕРАСЛЕД', sourceAttributed:'ПА ДАНЫХ КРЫНІЦЫ', confirmed:'ПАЦВЕРДЖАНА', disputed:'ДАНЫЯ РАЗЫХОДЗЯЦЦА', checking:'ПРАВЯРАЕЦЦА',
    birth:'Дата нараджэння', detention:'Дата затрымання', charges:'Абвінавачанне / артыкулы КК', verdict:'Прысуд', sentence:'Тэрмін / пакаранне', judge:'Суддзя', prosecutor:'Пракурор', currentPrison:'Цяперашняе месца зняволення', lastVerified:'Апошняе пацвярджэнне даных', source:'Крыніца', openSource:'АДКРЫЦЬ ПЕРШАКРЫНІЦУ', timeline:'ХРАНАЛОГІЯ', changeHistory:'ГІСТОРЫЯ ЗМЕН', noHistory:'Апублікаваных змен пакуль няма.', noTimeline:'Апублікаваных падзей пакуль няма.', address:'Адрас установы', knownPrisoners:'Вядомыя палітвязні паводле апошніх пацверджаных даных', peopleCount:'Чалавек', sourceNotice:'Статус і факты паказваюцца толькі з відавочнай атрыбуцыяй паходжання даных.', skip:'Перайсці да асноўнага зместу'
  },
  en: {
    langName:'EN', home:'HOME', prisoners:'POLITICAL PRISONERS', former:'FORMER POLITICAL PRISONERS', repressed:'REPRESSION', prisons:'PRISONS', news:'NEWS', monitoring:'MONITORING', reports:'REPORTS', help:'HOW TO HELP', about:'ABOUT',
    hero:'Documenting repression. Helping people. Preserving names.', find:'FIND A POLITICAL PRISONER', searchPlaceholder:'Name or surname…', current:'POLITICAL PRISONERS NOW', recognized:'TOTAL RECOGNIZED', repressedTotal:'POLITICALLY PERSECUTED', released:'RELEASED', empty:'The public database has not been published yet.', buildNotice:'This site is under development. Publication of real records is blocked until mandatory gates pass.',
    cards:'CARDS', table:'TABLE', filters:'FILTERS', closeFilters:'CLOSE FILTERS', all:'All', gender:'Gender', prison:'Place of detention', region:'Region', article:'Criminal Code article', sort:'Sort', byName:'By name', recentUpdated:'Recently updated', results:'Found', showing:'Showing', loadMore:'SHOW MORE', previous:'Previous', next:'Next', status:'Status', lastUpdate:'Last update', profile:'Open profile', unknown:'Not specified',
    politicalPrisoner:'POLITICAL PRISONER', formerPrisoner:'FORMER POLITICAL PRISONER', repressionDocumented:'POLITICAL PERSECUTION', sourceAttributed:'ACCORDING TO SOURCE', confirmed:'CONFIRMED', disputed:'DATA CONFLICT', checking:'UNDER REVIEW',
    birth:'Date of birth', detention:'Date of detention', charges:'Charge / Criminal Code articles', verdict:'Verdict', sentence:'Sentence / penalty', judge:'Judge', prosecutor:'Prosecutor', currentPrison:'Current place of detention', lastVerified:'Last data verification', source:'Source', openSource:'OPEN PRIMARY SOURCE', timeline:'TIMELINE', changeHistory:'CHANGE HISTORY', noHistory:'No published changes yet.', noTimeline:'No published events yet.', address:'Institution address', knownPrisoners:'Known political prisoners according to the latest confirmed data', peopleCount:'People', sourceNotice:'Statuses and facts are displayed only with explicit data provenance.', skip:'Skip to main content'
  },
  pl: {
    langName:'PL', home:'GŁÓWNA', prisoners:'WIĘŹNIOWIE POLITYCZNI', former:'BYLI WIĘŹNIOWIE POLITYCZNI', repressed:'REPRESJE', prisons:'WIĘZIENIA', news:'AKTUALNOŚCI', monitoring:'MONITORING', reports:'RAPORTY', help:'JAK POMÓC', about:'O NAS',
    hero:'Dokumentujemy represje. Pomagamy ludziom. Zachowujemy nazwiska.', find:'ZNAJDŹ WIĘŹNIA POLITYCZNEGO', searchPlaceholder:'Imię lub nazwisko…', current:'WIĘŹNIOWIE POLITYCZNI TERAZ', recognized:'ŁĄCZNIE UZNANI', repressedTotal:'PRZEŚLADOWANI POLITYCZNIE', released:'ZWOLNIENI', empty:'Publiczna baza nie została jeszcze opublikowana.', buildNotice:'Strona jest w budowie. Publikacja rzeczywistych danych pozostaje zablokowana do zakończenia obowiązkowych kontroli.',
    cards:'KARTY', table:'TABELA', filters:'FILTRY', closeFilters:'ZAMKNIJ FILTRY', all:'Wszyscy', gender:'Płeć', prison:'Miejsce osadzenia', region:'Region', article:'Artykuł kodeksu karnego', sort:'Sortowanie', byName:'Według nazwiska', recentUpdated:'Ostatnio zaktualizowane', results:'Znaleziono', showing:'Pokazano', loadMore:'POKAŻ WIĘCEJ', previous:'Wstecz', next:'Dalej', status:'Status', lastUpdate:'Ostatnia aktualizacja', profile:'Otwórz profil', unknown:'Brak danych',
    politicalPrisoner:'WIĘZIEŃ POLITYCZNY', formerPrisoner:'BYŁY WIĘZIEŃ POLITYCZNY', repressionDocumented:'PRZEŚLADOWANIE POLITYCZNE', sourceAttributed:'WEDŁUG ŹRÓDŁA', confirmed:'POTWIERDZONE', disputed:'DANE ROZBIEŻNE', checking:'W TRAKCIE WERYFIKACJI',
    birth:'Data urodzenia', detention:'Data zatrzymania', charges:'Zarzuty / artykuły kodeksu', verdict:'Wyrok', sentence:'Kara / wymiar kary', judge:'Sędzia', prosecutor:'Prokurator', currentPrison:'Aktualne miejsce osadzenia', lastVerified:'Ostatnia weryfikacja danych', source:'Źródło', openSource:'OTWÓRZ ŹRÓDŁO PIERWOTNE', timeline:'CHRONOLOGIA', changeHistory:'HISTORIA ZMIAN', noHistory:'Brak opublikowanych zmian.', noTimeline:'Brak opublikowanych wydarzeń.', address:'Adres placówki', knownPrisoners:'Znani więźniowie polityczni według ostatnich potwierdzonych danych', peopleCount:'Osoby', sourceNotice:'Statusy i fakty są wyświetlane wyłącznie z jawnym wskazaniem pochodzenia danych.', skip:'Przejdź do głównej treści'
  }
};

export function prefix(lang) { return lang === 'ru' ? '' : `/${lang}`; }
export function route(lang, path = '/') {
  const clean = String(path || '/').startsWith('/') ? String(path || '/') : `/${path}`;
  return `${prefix(lang)}${clean}` || '/';
}

export function esc(s = '') {
  return String(s).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
}

function topNav(lang) {
  const t = I18N[lang];
  return [['/',t.home],['/prisoners/',t.prisoners],['/repressed/',t.repressed],['/prisons/',t.prisons],['/news/',t.news],['/monitoring/',t.monitoring],['/reports/',t.reports],['/help/',t.help],['/about/',t.about]];
}

function sideNav(lang) {
  const t = I18N[lang];
  return [['/',t.home],['/prisoners/',t.prisoners],['/repressed/',t.repressed],['/former-prisoners/',t.former],['/prisons/',t.prisons],['/news/',t.news],['/monitoring/',t.monitoring],['/reports/',t.reports],['/help/',t.help],['/about/',t.about]];
}

function navLinks(items, lang, currentPath) {
  return items.map(([p,label]) => `<a href="${route(lang,p)}"${currentPath === p ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('');
}

export function layout({ lang='ru', title, description, path='/', body, pageType='website', noIndex=false, alternatePaths=null }) {
  const t = I18N[lang];
  const normalizedTitle = brandText(title);
  const normalizedDescription = brandText(description);
  const normalizedBody = brandBody(body);
  const canonical = `${SITE}${route(lang, path)}`;
  const links = navLinks(topNav(lang), lang, path);
  const side = navLinks(sideNav(lang), lang, path);
  const hreflangs = ['ru','be','en','pl'].map(l => {
    const alternatePath = alternatePaths?.[l] || path;
    return `<link rel="alternate" hreflang="${l}" href="${SITE}${route(l, alternatePath)}">`;
  }).join('\n');
  const xDefaultPath = alternatePaths?.ru || path;
  const langs = ['ru','be','en','pl'].map(l => {
    const alternatePath = alternatePaths?.[l] || path;
    return `<a href="${route(l, alternatePath)}"${l===lang?' aria-current="page"':''}>${I18N[l].langName}</a>`;
  }).join('');
  const footerBrand = lang === 'ru' ? BRAND.ru : BRAND.long;
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(normalizedTitle)} | ${BRAND.long}</title>
<meta name="description" content="${esc(normalizedDescription)}">
<link rel="canonical" href="${canonical}">
${hreflangs}
<link rel="alternate" hreflang="x-default" href="${SITE}${route('ru', xDefaultPath)}">
${noIndex ? '<meta name="robots" content="noindex,follow">' : ''}
<meta property="og:type" content="${pageType}">
<meta property="og:title" content="${esc(normalizedTitle)} | ${BRAND.long}">
<meta property="og:description" content="${esc(normalizedDescription)}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary">
<link rel="stylesheet" href="/assets/css/main.css">
<script src="/assets/js/main.js" defer></script>
</head>
<body>
<a class="skip-link" href="#main">${esc(t.skip)}</a>
<header class="site-header">
  <div class="header-main">
    <button id="menu-open" class="icon-btn" type="button" aria-controls="side-menu" aria-expanded="false" aria-label="Menu"><span></span><span></span><span></span></button>
    <a class="brand holo-text" href="${route(lang,'/')}">${BRAND.short}</a>
    <a class="help-chip" href="${route(lang,'/help/')}">${esc(t.help)}</a>
  </div>
  <div class="nav-shell"><button class="nav-arrow" data-nav="left" aria-label="Previous">❮</button><nav id="top-nav" class="top-nav">${links}</nav><button class="nav-arrow" data-nav="right" aria-label="Next">❯</button></div>
</header>
<div id="side-overlay" class="side-overlay" hidden></div>
<aside id="side-menu" class="side-menu" aria-hidden="true" aria-label="Site menu">
  <div class="side-head"><span class="holo-text">${BRAND.short}</span><button id="menu-close" class="close-btn" aria-label="Close menu">×</button></div>
  <nav class="side-links">${side}</nav>
  <div class="language-links" aria-label="Languages">${langs}</div>
</aside>
<main id="main">${normalizedBody}</main>
<footer class="site-footer"><strong>${footerBrand}</strong><span>${esc(t.buildNotice)}</span></footer>
</body></html>`;
}

export function translations(lang) { return I18N[lang]; }
