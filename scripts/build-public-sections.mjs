import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeText } from './lib/fs.mjs';
import { resolvePublicDataDir } from './lib/public-data.mjs';
import { publicNewsItems, localizedNewsValue, newsRelativePath } from './lib/news.mjs';
import { layout, translations, route, esc } from './templates.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = join(root, '_site');
const dataDir = resolvePublicDataDir(root);
const manifest = await readJson(join(dataDir, 'manifest.json'));
const news = publicNewsItems(await readJson(join(dataDir, 'news.json'))).slice(0, 6);
const langs = ['ru','be','en','pl'];

const COPY = {
  ru: {
    homeTitle:'Правозащитный центр CHUDO',
    hero:'Документируем политические репрессии в Беларуси, сохраняем имена и публикуем материалы из зарегистрированных источников.',
    find:'НАЙТИ ЧЕЛОВЕКА', latest:'Последние материалы', allNews:'ВСЕ НОВОСТИ', sourceHub:'ИСТОЧНИКИ', methodology:'МЕТОДОЛОГИЯ', monitoring:'МОНИТОРИНГ', help:'КАК ПОМОЧЬ',
    emptyNews:'Материалы появятся здесь после первого опубликованного source-feed snapshot.',
    sourceTitle:'Как устроен CHUDO', sourceText:'База людей, новости и мониторинг разделены. Telegram и СМИ публикуются как материалы названного источника; изменение канонической карточки человека идёт отдельным контуром.',
    current:'ПОЛИТЗАКЛЮЧЁННЫЕ СЕЙЧАС', recognized:'ЗАПИСЕЙ В ПУБЛИЧНОЙ БАЗЕ', repressed:'ЗАДОКУМЕНТИРОВАНО РЕПРЕССИЙ', released:'БЫВШИЕ ПОЛИТЗАКЛЮЧЁННЫЕ',
    aboutTitle:'О центре', aboutLead:'Правозащитный центр CHUDO — независимый информационный и документирующий проект о политических репрессиях в Беларуси.',
    aboutBody:'Цель проекта — собрать в одном месте проверяемую хронологию репрессий, карточки людей и мест заключения, публичные источники, новости и исправления данных. Сайт работает без обязательной регистрации и строится как статический публичный архив с прозрачным происхождением сведений.',
    principles:'Принципы', principleItems:['Сохранять источник каждого существенного факта.','Не смешивать сообщения источников с независимым выводом CHUDO.','Хранить историю существенных исправлений.','Не размещать закрытые редакционные данные в публичном репозитории.'],
    helpTitle:'Как помочь', helpLead:'Помощь начинается с безопасных и проверяемых действий.',
    helpItems:['Распространяйте ссылки на публичные карточки и первоисточники, а не непроверенные пересказы.','Поддерживайте семьи репрессированных через проверенные инициативы и личные контакты, которым доверяете.','Пишите политзаключённым, когда публично подтверждён актуальный адрес учреждения.','Если заметили ошибку на сайте, сообщите страницу, спорный факт и ссылку на первоисточник.'],
    monitoringTitle:'Мониторинг', monitoringLead:'CHUDO отслеживает изменения в репрессиях и источниках как отдельные события, а не просто переписывает текущую карточку.',
    monitoringItems:['Новые задержания и уголовные дела.','Приговоры, апелляции и изменения наказания.','Переводы между СИЗО, тюрьмами и колониями.','Освобождения и повторные задержания.','Сообщения о пытках, здоровье, исчезновениях и других событиях повышенного риска.','Исправления, опровержения и конфликты между источниками.'],
    reportsTitle:'Доклады', reportsLead:'Доклады CHUDO формируются только из одного согласованного публичного snapshot, чтобы цифры на разных страницах не расходились.',
    reportsBody:'До появления первого утверждённого непустого snapshot раздел не будет публиковать искусственные числа. После запуска здесь появятся периодические обзоры по политзаключённым, репрессиям, местам заключения и динамике событий со ссылками на исходные записи.'
  },
  be: {
    homeTitle:'Праваабарончы цэнтр CHUDO', hero:'Дакументуем палітычныя рэпрэсіі ў Беларусі, захоўваем імёны і публікуем матэрыялы з зарэгістраваных крыніц.', find:'ЗНАЙСЦІ ЧАЛАВЕКА', latest:'Апошнія матэрыялы', allNews:'УСЕ НАВІНЫ', sourceHub:'КРЫНІЦЫ', methodology:'МЕТАДАЛОГІЯ', monitoring:'МАНІТОРЫНГ', help:'ЯК ДАПАМАГЧЫ', emptyNews:'Матэрыялы з’явяцца пасля першага апублікаванага source-feed snapshot.', sourceTitle:'Як уладкаваны CHUDO', sourceText:'База людзей, навіны і маніторынг падзеленыя. Telegram і СМІ публікуюцца як матэрыялы названай крыніцы; змена кананічнай карткі чалавека ідзе асобным контурам.', current:'ПАЛІТВЯЗНІ ЦЯПЕР', recognized:'ЗАПІСАЎ У ПУБЛІЧНАЙ БАЗЕ', repressed:'ЗАДАКУМЕНТАВАНА РЭПРЭСІЙ', released:'БЫЛЫЯ ПАЛІТВЯЗНІ', aboutTitle:'Пра цэнтр', aboutLead:'Праваабарончы цэнтр CHUDO — незалежны інфармацыйны і дакументальны праект пра палітычныя рэпрэсіі ў Беларусі.', aboutBody:'Мэта праекта — сабраць у адным месцы правяральную храналогію рэпрэсій, карткі людзей і месцаў зняволення, публічныя крыніцы, навіны і выпраўленні даных. Сайт працуе без абавязковай рэгістрацыі і будуецца як статычны публічны архіў з празрыстым паходжаннем звестак.', principles:'Прынцыпы', principleItems:['Захоўваць крыніцу кожнага істотнага факта.','Не змешваць паведамленні крыніц з незалежнай высновай CHUDO.','Захоўваць гісторыю істотных выпраўленняў.','Не размяшчаць закрытыя рэдакцыйныя даныя ў публічным рэпазіторыі.'], helpTitle:'Як дапамагчы', helpLead:'Дапамога пачынаецца з бяспечных і правяральных дзеянняў.', helpItems:['Пашырайце спасылкі на публічныя карткі і першакрыніцы.','Падтрымлівайце сем’і рэпрэсаваных праз правераныя ініцыятывы.','Пішыце палітвязням, калі актуальны адрас установы публічна пацверджаны.','Калі знайшлі памылку, паведаміце старонку, спрэчны факт і першакрыніцу.'], monitoringTitle:'Маніторынг', monitoringLead:'CHUDO адсочвае змены як асобныя падзеі, а не проста перапісвае бягучую картку.', monitoringItems:['Новыя затрыманні і крымінальныя справы.','Прысуды, апеляцыі і змены пакарання.','Пераводы паміж СІЗА, турмамі і калоніямі.','Вызваленні і паўторныя затрыманні.','Паведамленні пра катаванні, здароўе і знікненні.','Выпраўленні, абвяржэнні і канфлікты крыніц.'], reportsTitle:'Даклады', reportsLead:'Даклады CHUDO фарміруюцца толькі з аднаго ўзгодненага публічнага snapshot.', reportsBody:'Да першага зацверджанага непустога snapshot штучныя лічбы не публікуюцца. Пасля запуску тут будуць перыядычныя агляды са спасылкамі на зыходныя запісы.'
  },
  en: {
    homeTitle:'CHUDO Human Rights Center', hero:'Documenting political repression in Belarus, preserving names and publishing material from registered sources.', find:'FIND A PERSON', latest:'Latest materials', allNews:'ALL NEWS', sourceHub:'SOURCES', methodology:'METHODOLOGY', monitoring:'MONITORING', help:'HOW TO HELP', emptyNews:'Materials will appear after the first published source-feed snapshot.', sourceTitle:'How CHUDO is structured', sourceText:'The people database, news and monitoring are separate. Telegram and media items are published as material from the named source; canonical person records change through a separate pipeline.', current:'POLITICAL PRISONERS NOW', recognized:'PUBLIC DATABASE RECORDS', repressed:'DOCUMENTED REPRESSION', released:'FORMER POLITICAL PRISONERS', aboutTitle:'About the center', aboutLead:'CHUDO Human Rights Center is an independent information and documentation project on political repression in Belarus.', aboutBody:'The project brings together a verifiable chronology of repression, person and prison profiles, public sources, news and correction history. The site requires no registration and is built as a static public archive with explicit provenance.', principles:'Principles', principleItems:['Preserve the source of every material fact.','Keep source reports separate from independent CHUDO conclusions.','Preserve material correction history.','Keep private editorial data out of the public repository.'], helpTitle:'How to help', helpLead:'Useful support starts with safe and verifiable actions.', helpItems:['Share public profiles and primary-source links instead of unverified retellings.','Support families through initiatives and contacts you trust.','Write to political prisoners when a current institution address is publicly confirmed.','To report an error, provide the page, disputed fact and a primary source.'], monitoringTitle:'Monitoring', monitoringLead:'CHUDO records changes as events instead of silently overwriting the current record.', monitoringItems:['New detentions and criminal cases.','Verdicts, appeals and sentence changes.','Transfers between detention facilities and prisons.','Releases and re-arrests.','Reports of torture, health issues and disappearances.','Corrections, retractions and source conflicts.'], reportsTitle:'Reports', reportsLead:'CHUDO reports are generated from one consistent public snapshot so figures do not diverge across pages.', reportsBody:'No synthetic figures are published before the first approved non-empty snapshot. After launch, this section will contain periodic reports with links back to the underlying records.'
  },
  pl: {
    homeTitle:'Centrum Praw Człowieka CHUDO', hero:'Dokumentujemy represje polityczne na Białorusi, zachowujemy nazwiska i publikujemy materiały z zarejestrowanych źródeł.', find:'ZNAJDŹ OSOBĘ', latest:'Najnowsze materiały', allNews:'WSZYSTKIE AKTUALNOŚCI', sourceHub:'ŹRÓDŁA', methodology:'METODOLOGIA', monitoring:'MONITORING', help:'JAK POMÓC', emptyNews:'Materiały pojawią się po opublikowaniu pierwszego snapshotu źródeł.', sourceTitle:'Jak działa CHUDO', sourceText:'Baza osób, aktualności i monitoring są rozdzielone. Telegram i media są publikowane jako materiały wskazanego źródła; kanoniczna karta osoby zmienia się w osobnym procesie.', current:'WIĘŹNIOWIE POLITYCZNI TERAZ', recognized:'REKORDY W PUBLICZNEJ BAZIE', repressed:'UDOKUMENTOWANE REPRESJE', released:'BYLI WIĘŹNIOWIE POLITYCZNI', aboutTitle:'O centrum', aboutLead:'Centrum Praw Człowieka CHUDO to niezależny projekt informacyjny i dokumentacyjny dotyczący represji politycznych na Białorusi.', aboutBody:'Projekt łączy w jednym miejscu weryfikowalną chronologię represji, profile osób i miejsc osadzenia, źródła publiczne, aktualności i historię korekt. Serwis nie wymaga rejestracji i działa jako statyczne publiczne archiwum z jawnym pochodzeniem danych.', principles:'Zasady', principleItems:['Zachowywać źródło każdego istotnego faktu.','Oddzielać relacje źródeł od niezależnych wniosków CHUDO.','Zachowywać historię istotnych korekt.','Nie umieszczać prywatnych danych redakcyjnych w publicznym repozytorium.'], helpTitle:'Jak pomóc', helpLead:'Pomoc zaczyna się od bezpiecznych i sprawdzalnych działań.', helpItems:['Udostępniaj publiczne profile i linki do źródeł pierwotnych.','Wspieraj rodziny poprzez inicjatywy i kontakty, którym ufasz.','Pisz do więźniów politycznych, gdy aktualny adres jest publicznie potwierdzony.','Zgłaszając błąd, podaj stronę, kwestionowany fakt i źródło pierwotne.'], monitoringTitle:'Monitoring', monitoringLead:'CHUDO zapisuje zmiany jako oddzielne wydarzenia zamiast po cichu nadpisywać rekord.', monitoringItems:['Nowe zatrzymania i sprawy karne.','Wyroki, apelacje i zmiany kar.','Przeniesienia między aresztami i zakładami karnymi.','Zwolnienia i ponowne zatrzymania.','Doniesienia o torturach, zdrowiu i zaginięciach.','Korekty, sprostowania i konflikty źródeł.'], reportsTitle:'Raporty', reportsLead:'Raporty CHUDO powstają z jednego spójnego publicznego snapshotu.', reportsBody:'Przed pierwszym zatwierdzonym niepustym snapshotem nie publikujemy sztucznych liczb. Po uruchomieniu pojawią się tutaj okresowe raporty z odnośnikami do rekordów źródłowych.'
  }
};

function outputPath(lang, path) {
  const prefix = lang === 'ru' ? '' : lang;
  const clean = String(path).replace(/^\//,'').replace(/\/$/,'');
  return join(out, prefix, clean, 'index.html');
}

function stat(value) {
  return manifest.publication_state === 'PUBLISHED' ? String(value ?? 0) : '—';
}

function newsCards(lang) {
  if (!news.length) return `<div class="empty-state"><p>${esc(COPY[lang].emptyNews)}</p></div>`;
  return `<div class="news-grid">${news.map(item => {
    const title = localizedNewsValue(item.title, lang);
    const summary = localizedNewsValue(item.summary, lang);
    return `<article class="tech-news-card"><p class="eyebrow">${esc(item.source_name)}</p><h3><a href="${route(lang, newsRelativePath(item))}">${esc(title)}</a></h3><p>${esc(summary)}</p></article>`;
  }).join('')}</div>`;
}

function homeBody(lang) {
  const c = COPY[lang];
  const t = translations(lang);
  return `<section class="hero"><div class="container hero-inner"><p class="eyebrow">HUMAN RIGHTS CENTER</p><h1><span class="holo-text">CHUDO</span><br>HUMAN RIGHTS CENTER</h1><p class="hero-copy">${esc(c.hero)}</p><a class="primary-btn" href="${route(lang,'/repressed/')}">${esc(c.find)}</a></div></section>
  <section class="container stats" aria-label="Statistics"><article><strong>${stat(manifest.counts?.political_prisoners_current)}</strong><span>${esc(c.current)}</span></article><article><strong>${stat(manifest.counts?.people)}</strong><span>${esc(c.recognized)}</span></article><article><strong>${stat(manifest.counts?.repressed_total)}</strong><span>${esc(c.repressed)}</span></article><article><strong>${stat(manifest.counts?.former_political_prisoners)}</strong><span>${esc(c.released)}</span></article></section>
  <section class="container search-panel"><h2>${esc(t.searchPlaceholder)}</h2><form action="${route(lang,'/repressed/')}" method="get"><label class="sr-only" for="home-search">${esc(t.searchPlaceholder)}</label><input id="home-search" name="q" type="search" autocomplete="off" placeholder="${esc(t.searchPlaceholder)}"><button type="submit">${esc(c.find)}</button></form></section>
  <section class="container page"><div class="catalog-head"><div><p class="eyebrow">CHUDO</p><h2>${esc(c.latest)}</h2></div><a class="secondary-btn" href="${route(lang,'/news/')}">${esc(c.allNews)}</a></div>${newsCards(lang)}</section>
  <section class="container page"><h2>${esc(c.sourceTitle)}</h2><p class="catalog-note">${esc(c.sourceText)}</p><div class="people-grid"><article class="person-card"><div class="person-card-main"><h3><a href="${route(lang,'/sources/')}">${esc(c.sourceHub)}</a></h3><p>${esc(c.sourceText)}</p></div></article><article class="person-card"><div class="person-card-main"><h3><a href="${route(lang,'/methodology/')}">${esc(c.methodology)}</a></h3><p>${esc(t.sourceNotice)}</p></div></article><article class="person-card"><div class="person-card-main"><h3><a href="${route(lang,'/monitoring/')}">${esc(c.monitoring)}</a></h3><p>${esc(COPY[lang].monitoringLead)}</p></div></article><article class="person-card"><div class="person-card-main"><h3><a href="${route(lang,'/help/')}">${esc(c.help)}</a></h3><p>${esc(COPY[lang].helpLead)}</p></div></article></div></section>`;
}

function list(items) { return `<ul class="timeline">${items.map(item => `<li><span>•</span><div>${esc(item)}</div></li>`).join('')}</ul>`; }

function aboutBody(lang) {
  const c = COPY[lang];
  return `<article class="container page"><p class="eyebrow">CHUDO HUMAN RIGHTS CENTER</p><h1>${esc(c.aboutTitle)}</h1><div class="profile-section"><p><strong>${esc(c.aboutLead)}</strong></p><p>${esc(c.aboutBody)}</p></div><section class="profile-section"><h2>${esc(c.principles)}</h2>${list(c.principleItems)}</section></article>`;
}

function helpBody(lang) {
  const c = COPY[lang];
  return `<article class="container page"><p class="eyebrow">CHUDO HUMAN RIGHTS CENTER</p><h1>${esc(c.helpTitle)}</h1><p class="catalog-note">${esc(c.helpLead)}</p><section class="profile-section">${list(c.helpItems)}</section><p><a class="secondary-btn" href="${route(lang,'/contacts/')}">${esc(translations(lang).about)}</a></p></article>`;
}

function monitoringBody(lang) {
  const c = COPY[lang];
  return `<article class="container page"><p class="eyebrow">CHUDO HUMAN RIGHTS CENTER</p><h1>${esc(c.monitoringTitle)}</h1><p class="catalog-note">${esc(c.monitoringLead)}</p><section class="profile-section">${list(c.monitoringItems)}</section><p><a class="secondary-btn" href="${route(lang,'/sources/')}">${esc(c.sourceHub)}</a></p></article>`;
}

function reportsBody(lang) {
  const c = COPY[lang];
  return `<article class="container page"><p class="eyebrow">CHUDO HUMAN RIGHTS CENTER</p><h1>${esc(c.reportsTitle)}</h1><div class="profile-section"><p><strong>${esc(c.reportsLead)}</strong></p><p>${esc(c.reportsBody)}</p></div><div class="empty-state"><code>${esc(manifest.snapshot_id || 'NO_SNAPSHOT')}</code></div></article>`;
}

for (const lang of langs) {
  const c = COPY[lang];
  await writeText(outputPath(lang,'/'), layout({lang,title:c.homeTitle,description:c.hero,path:'/',body:homeBody(lang)}));
  await writeText(outputPath(lang,'/about/'), layout({lang,title:c.aboutTitle,description:c.aboutLead,path:'/about/',body:aboutBody(lang)}));
  await writeText(outputPath(lang,'/help/'), layout({lang,title:c.helpTitle,description:c.helpLead,path:'/help/',body:helpBody(lang)}));
  await writeText(outputPath(lang,'/monitoring/'), layout({lang,title:c.monitoringTitle,description:c.monitoringLead,path:'/monitoring/',body:monitoringBody(lang)}));
  await writeText(outputPath(lang,'/reports/'), layout({lang,title:c.reportsTitle,description:c.reportsLead,path:'/reports/',body:reportsBody(lang)}));
}

console.log(`PUBLIC_SECTIONS_BUILD=PASS news=${news.length} snapshot=${manifest.snapshot_id}`);
