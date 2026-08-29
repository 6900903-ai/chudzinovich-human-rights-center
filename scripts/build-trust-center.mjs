import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeText } from './lib/fs.mjs';
import { resolvePublicDataDir } from './lib/public-data.mjs';
import { loadMediaRegistry } from './lib/media-registry.mjs';
import { loadMediaFeed, loadCombinedPublicNewsWithMedia } from './lib/media-feed.mjs';
import { loadTelegramRegistry, } from './lib/telegram-registry.mjs';
import { loadTelegramFeed } from './lib/telegram-feed.mjs';
import { layout, route, esc } from './templates.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=join(root,'_site');
const dataDir=resolvePublicDataDir(root);
const langs=['ru','be','en','pl'];

const manifest=await readJson(join(dataDir,'manifest.json'));
const telegramRegistry=await loadTelegramRegistry();
const mediaRegistry=await loadMediaRegistry();
const telegramFeed=await loadTelegramFeed(root,telegramRegistry);
const mediaFeed=await loadMediaFeed(root,mediaRegistry);
const news=await loadCombinedPublicNewsWithMedia(root,dataDir,telegramRegistry,mediaRegistry);
const youtube=await readJson(join(root,'data','public','youtube.json'));
const channels=telegramRegistry.channels.filter(x=>x.publication_enabled===true);
const mediaSources=mediaRegistry.sources||[];
const mediaEnabled=mediaSources.filter(x=>x.candidate_discovery_enabled===true);
const videos=Array.isArray(youtube.videos)?youtube.videos:[];

const COPY={
 ru:{
  transparencyTitle:'Прозрачность данных',
  transparencyIntro:'Что именно сейчас опубликовано на CHUDO, откуда берутся материалы и где проходит граница между сообщением источника и канонической правозащитной записью.',
  stats:{media:'СМИ В РЕЕСТРЕ',active:'ИСТОЧНИКОВ ДЛЯ DISCOVERY',telegram:'TELEGRAM-КАНАЛОВ',materials:'ПУБЛИЧНЫХ МАТЕРИАЛОВ',videos:'ВИДЕО'},
  coverageTitle:'Что означают эти числа',coverageText:'Это показатели покрытия источников и публичных материалов CHUDO. Они не являются статистикой репрессий, политзаключённых или задержаний. Правозащитные числа публикуются только из утверждённого непустого snapshot базы людей.',
  dbTitle:'Состояние канонической базы',dbState:'Состояние публикации',snapshot:'Snapshot',dbReady:'Каноническая база опубликована и может использоваться для публичной статистики.',dbBlocked:'Каноническая база людей ещё не опубликована. CHUDO намеренно не подставляет искусственные числа и не индексирует пустые каталоги как полноценную базу.',
  freshnessTitle:'Свежесть публичных источников',telegramSync:'Последний Telegram snapshot',mediaSync:'Последний snapshot RSS СМИ',youtubeSync:'Последний snapshot YouTube',unknown:'нет опубликованной даты',
  boundaryTitle:'Публикационные границы',boundary:[
   'Материал Telegram или СМИ остаётся публикацией указанного источника и не превращается автоматически в подтверждённый вывод CHUDO.',
   'Статус политзаключённого не назначается автоматически по новости, ключевому слову или сообщению Telegram.',
   'Смерть, освобождение, повторное задержание, здоровье, пытки, несовершеннолетние и конфликты личности относятся к изменениям повышенного риска и требуют отдельного контура проверки.',
   'Частные телефоны, домашние адреса родственников, документы личности и закрытые редакционные данные не должны попадать в публичный репозиторий.'
  ],
  editorialTitle:'Редакционная политика',editorialIntro:'Правила, по которым CHUDO отделяет публикацию источника, проверяемый факт и собственный редакционный вывод.',
  editorialSections:[
   ['Источник не равен факту','Ссылка на СМИ, Telegram или официальный материал показывает происхождение сообщения. CHUDO не скрывает автора исходного утверждения и не считает перепечатки независимыми подтверждениями.'],
   ['Автоматическая публикация ограничена','Зарегистрированные Telegram-каналы и подтверждённые RSS-ленты могут автоматически появляться как материалы источника. Такой режим не даёт им права автоматически менять карточку человека или присваивать правозащитный статус.'],
   ['Высокорисковые изменения — отдельно','Факты, способные повлиять на безопасность, статус или идентичность человека, проходят отдельную проверку. При конфликте источников спор не маскируется под уверенный ответ.'],
   ['Исправления сохраняются','Существенная ошибка не должна исчезать бесследно. Опубликованный факт может быть исправлен, отозван, заменён или помечен как спорный с сохранением истории изменения.'],
   ['Минимизация персональных данных','Публичная ценность факта должна перевешивать риск от его публикации. Закрытые контакты, документы и лишние чувствительные данные исключаются из публичного контура.'],
   ['Независимость и атрибуция','Регистрация источника не означает редакционного одобрения всех его материалов. CHUDO показывает происхождение сообщения и сохраняет право не превращать его в канонический факт без достаточных оснований.']
  ],
  links:{methodology:'МЕТОДОЛОГИЯ',sources:'ИСТОЧНИКИ',corrections:'ИСПРАВЛЕНИЯ',privacy:'КОНФИДЕНЦИАЛЬНОСТЬ',transparency:'ПРОЗРАЧНОСТЬ',editorial:'РЕДАКЦИОННАЯ ПОЛИТИКА'}
 },
 be:{
  transparencyTitle:'Празрыстасць даных',transparencyIntro:'Што цяпер апублікавана ў CHUDO, адкуль бяруцца матэрыялы і дзе праходзіць мяжа паміж паведамленнем крыніцы і кананічным праваабарончым запісам.',
  stats:{media:'СМІ Ў РЭЕСТРЫ',active:'КРЫНІЦ ДЛЯ DISCOVERY',telegram:'TELEGRAM-КАНАЛАЎ',materials:'ПУБЛІЧНЫХ МАТЭРЫЯЛАЎ',videos:'ВІДЭА'},
  coverageTitle:'Што азначаюць гэтыя лічбы',coverageText:'Гэта паказчыкі ахопу крыніц і публічных матэрыялаў CHUDO, а не статыстыка рэпрэсій. Праваабарончыя лічбы публікуюцца толькі з зацверджанага непустога snapshot базы людзей.',
  dbTitle:'Стан кананічнай базы',dbState:'Стан публікацыі',snapshot:'Snapshot',dbReady:'Кананічная база апублікаваная і можа выкарыстоўвацца для публічнай статыстыкі.',dbBlocked:'Кананічная база людзей яшчэ не апублікаваная. CHUDO не падстаўляе штучныя лічбы і не выдае пустыя каталогі за паўнавартасную базу.',
  freshnessTitle:'Свежасць публічных крыніц',telegramSync:'Апошні Telegram snapshot',mediaSync:'Апошні snapshot RSS СМІ',youtubeSync:'Апошні snapshot YouTube',unknown:'няма апублікаванай даты',
  boundaryTitle:'Публікацыйныя межы',boundary:['Матэрыял Telegram або СМІ застаецца публікацыяй названай крыніцы і не становіцца аўтаматычна высновай CHUDO.','Статус палітвязня не прызначаецца аўтаматычна паводле навіны або ключавога слова.','Смерць, вызваленне, паўторнае затрыманне, здароўе, катаванні, непаўналетнія і канфлікты асобы патрабуюць асобнай праверкі.','Прыватныя тэлефоны, хатнія адрасы сваякоў, дакументы і закрытыя рэдакцыйныя даныя не трапляюць у публічны рэпазіторый.'],
  editorialTitle:'Рэдакцыйная палітыка',editorialIntro:'Правілы, паводле якіх CHUDO аддзяляе публікацыю крыніцы, правяральны факт і ўласную рэдакцыйную выснову.',
  editorialSections:[['Крыніца не роўная факту','Спасылка паказвае паходжанне паведамлення. Перадрукі аднаго сцвярджэння не лічацца незалежнымі пацверджаннямі.'],['Аўтаматычная публікацыя абмежаваная','Зарэгістраваныя Telegram-каналы і пацверджаныя RSS могуць аўтаматычна з’яўляцца як матэрыялы крыніцы, але не змяняюць кананічную картку чалавека.'],['Высокарызыкоўныя змены — асобна','Факты, якія могуць уплываць на бяспеку, статус або ідэнтычнасць чалавека, патрабуюць асобнай праверкі.'],['Выпраўленні захоўваюцца','Істотная памылка можа быць выпраўленая, адкліканая, замененая або пазначаная як спрэчная з гісторыяй змен.'],['Мінімізацыя персанальных даных','Закрытыя кантакты, дакументы і лішнія адчувальныя даныя выключаюцца з публічнага контуру.'],['Незалежнасць і атрыбуцыя','Рэгістрацыя крыніцы не азначае рэдакцыйнага адабрэння ўсіх яе матэрыялаў.']],
  links:{methodology:'МЕТАДАЛОГІЯ',sources:'КРЫНІЦЫ',corrections:'ВЫПРАЎЛЕННІ',privacy:'ПРЫВАТНАСЦЬ',transparency:'ПРАЗРЫСТАСЦЬ',editorial:'РЭДАКЦЫЙНАЯ ПАЛІТЫКА'}
 },
 en:{
  transparencyTitle:'Data transparency',transparencyIntro:'What CHUDO currently publishes, where the material comes from, and where the boundary sits between a source report and a canonical human-rights record.',
  stats:{media:'MEDIA IN REGISTRY',active:'DISCOVERY SOURCES',telegram:'TELEGRAM CHANNELS',materials:'PUBLIC MATERIALS',videos:'VIDEOS'},
  coverageTitle:'What these numbers mean',coverageText:'These are coverage metrics for registered sources and public CHUDO materials. They are not counts of repression, political prisoners or detentions. Human-rights statistics are published only from an approved non-empty person-database snapshot.',
  dbTitle:'Canonical database state',dbState:'Publication state',snapshot:'Snapshot',dbReady:'The canonical database is published and may be used for public statistics.',dbBlocked:'The canonical person database is not published yet. CHUDO deliberately does not substitute synthetic figures or present empty catalogs as a complete database.',
  freshnessTitle:'Public-source freshness',telegramSync:'Latest Telegram snapshot',mediaSync:'Latest media RSS snapshot',youtubeSync:'Latest YouTube snapshot',unknown:'no published date',
  boundaryTitle:'Publication boundaries',boundary:['A Telegram or media item remains material from the named source and does not automatically become a verified CHUDO conclusion.','Political-prisoner status is not assigned automatically from a headline, keyword or Telegram post.','Death, release, re-arrest, health, torture, minors and identity conflicts are high-risk changes that require a separate review path.','Private phone numbers, relatives’ home addresses, identity documents and private editorial data must not enter the public repository.'],
  editorialTitle:'Editorial policy',editorialIntro:'Rules CHUDO uses to separate source publication, verifiable facts and its own editorial conclusions.',
  editorialSections:[['A source is not the same as a fact','A source link identifies where a claim came from. Rewrites of one original claim do not count as independent confirmations.'],['Automation is bounded','Registered Telegram channels and verified RSS feeds may appear automatically as source material, but automation cannot change a canonical person record or assign a human-rights designation.'],['High-risk changes are separate','Facts that may affect a person’s safety, status or identity require a separate review path. Conflicting sources are not flattened into false certainty.'],['Corrections remain visible','A material error may be corrected, retracted, superseded or marked disputed while preserving material change history.'],['Personal data is minimized','Private contacts, identity documents and unnecessary sensitive data are excluded from the public publication path.'],['Independence and attribution','Registering a source does not mean editorial endorsement of all of its content. CHUDO preserves attribution and may decline to promote a source claim into a canonical fact.']],
  links:{methodology:'METHODOLOGY',sources:'SOURCES',corrections:'CORRECTIONS',privacy:'PRIVACY',transparency:'TRANSPARENCY',editorial:'EDITORIAL POLICY'}
 },
 pl:{
  transparencyTitle:'Przejrzystość danych',transparencyIntro:'Co CHUDO obecnie publikuje, skąd pochodzą materiały i gdzie przebiega granica między relacją źródła a kanonicznym zapisem praw człowieka.',
  stats:{media:'MEDIA W REJESTRZE',active:'ŹRÓDŁA DISCOVERY',telegram:'KANAŁY TELEGRAM',materials:'PUBLICZNE MATERIAŁY',videos:'WIDEO'},
  coverageTitle:'Co oznaczają te liczby',coverageText:'To wskaźniki pokrycia źródeł i publicznych materiałów CHUDO, a nie statystyka represji. Dane o represjach i więźniach politycznych są publikowane wyłącznie z zatwierdzonego, niepustego snapshotu bazy osób.',
  dbTitle:'Stan bazy kanonicznej',dbState:'Stan publikacji',snapshot:'Snapshot',dbReady:'Baza kanoniczna jest opublikowana i może służyć do publicznych statystyk.',dbBlocked:'Kanoniczna baza osób nie jest jeszcze opublikowana. CHUDO nie zastępuje brakujących danych sztucznymi liczbami i nie przedstawia pustych katalogów jako kompletnej bazy.',
  freshnessTitle:'Aktualność źródeł publicznych',telegramSync:'Ostatni snapshot Telegram',mediaSync:'Ostatni snapshot RSS mediów',youtubeSync:'Ostatni snapshot YouTube',unknown:'brak opublikowanej daty',
  boundaryTitle:'Granice publikacji',boundary:['Materiał Telegram lub mediów pozostaje materiałem wskazanego źródła i nie staje się automatycznie zweryfikowanym wnioskiem CHUDO.','Status więźnia politycznego nie jest nadawany automatycznie na podstawie nagłówka, słowa kluczowego lub wpisu Telegram.','Śmierć, zwolnienie, ponowne zatrzymanie, zdrowie, tortury, osoby niepełnoletnie i konflikty tożsamości wymagają osobnej ścieżki weryfikacji.','Prywatne telefony, adresy domowe krewnych, dokumenty tożsamości i prywatne dane redakcyjne nie trafiają do publicznego repozytorium.'],
  editorialTitle:'Polityka redakcyjna',editorialIntro:'Zasady oddzielania publikacji źródłowej, weryfikowalnego faktu i własnego wniosku redakcyjnego CHUDO.',
  editorialSections:[['Źródło nie jest tym samym co fakt','Link wskazuje pochodzenie twierdzenia. Przedruki jednego komunikatu nie są liczone jako niezależne potwierdzenia.'],['Automatyzacja ma granice','Zarejestrowane kanały Telegram i zweryfikowane RSS mogą pojawiać się automatycznie jako materiały źródłowe, ale nie mogą automatycznie zmieniać kanonicznego profilu osoby.'],['Zmiany wysokiego ryzyka są oddzielone','Fakty wpływające na bezpieczeństwo, status lub tożsamość wymagają odrębnej weryfikacji.'],['Korekty pozostają widoczne','Istotny błąd może zostać poprawiony, wycofany, zastąpiony lub oznaczony jako sporny z zachowaniem historii zmian.'],['Minimalizacja danych osobowych','Prywatne kontakty, dokumenty i zbędne dane wrażliwe są wyłączone z publicznego procesu.'],['Niezależność i atrybucja','Rejestracja źródła nie oznacza redakcyjnej akceptacji całej jego zawartości.']],
  links:{methodology:'METODOLOGIA',sources:'ŹRÓDŁA',corrections:'KOREKTY',privacy:'PRYWATNOŚĆ',transparency:'PRZEJRZYSTOŚĆ',editorial:'POLITYKA REDAKCYJNA'}
 }
};

function outputPath(lang,path){const prefix=lang==='ru'?'':lang;const clean=String(path).replace(/^\//,'').replace(/\/$/,'');return join(out,prefix,clean,'index.html');}
function formatDate(value,lang,fallback){if(!value)return fallback;try{return new Intl.DateTimeFormat(lang,{dateStyle:'long',timeStyle:'short',timeZone:'UTC'}).format(new Date(value))+' UTC';}catch{return value;}}
function links(lang,c){return `<div class="quick-links"><a class="secondary-btn" href="${route(lang,'/methodology/')}">${esc(c.links.methodology)}</a><a class="secondary-btn" href="${route(lang,'/sources/')}">${esc(c.links.sources)}</a><a class="secondary-btn" href="${route(lang,'/corrections/')}">${esc(c.links.corrections)}</a><a class="secondary-btn" href="${route(lang,'/privacy/')}">${esc(c.links.privacy)}</a></div>`;}
function transparencyBody(lang){const c=COPY[lang];const published=manifest.publication_state==='PUBLISHED';return `<article class="container page trust-page"><p class="eyebrow">CHUDO HUMAN RIGHTS CENTER · TRUST</p><h1>${esc(c.transparencyTitle)}</h1><p class="catalog-note">${esc(c.transparencyIntro)}</p><section class="stats trust-stats"><article><strong>${mediaSources.length}</strong><span>${esc(c.stats.media)}</span></article><article><strong>${mediaEnabled.length}</strong><span>${esc(c.stats.active)}</span></article><article><strong>${channels.length}</strong><span>${esc(c.stats.telegram)}</span></article><article><strong>${news.length}</strong><span>${esc(c.stats.materials)}</span></article><article><strong>${videos.length}</strong><span>${esc(c.stats.videos)}</span></article></section><section class="profile-section"><h2>${esc(c.coverageTitle)}</h2><p>${esc(c.coverageText)}</p></section><section class="profile-section"><h2>${esc(c.dbTitle)}</h2><dl class="profile-fields"><div class="profile-field"><dt>${esc(c.dbState)}</dt><dd>${esc(manifest.publication_state)}</dd></div><div class="profile-field"><dt>${esc(c.snapshot)}</dt><dd>${esc(manifest.snapshot_id||'—')}</dd></div></dl><p>${esc(published?c.dbReady:c.dbBlocked)}</p></section><section class="profile-section"><h2>${esc(c.freshnessTitle)}</h2><dl class="profile-fields"><div class="profile-field"><dt>${esc(c.telegramSync)}</dt><dd>${esc(formatDate(telegramFeed.fetched_at,lang,c.unknown))}</dd></div><div class="profile-field"><dt>${esc(c.mediaSync)}</dt><dd>${esc(formatDate(mediaFeed.fetched_at,lang,c.unknown))}</dd></div><div class="profile-field"><dt>${esc(c.youtubeSync)}</dt><dd>${esc(formatDate(youtube.fetched_at,lang,c.unknown))}</dd></div></dl></section><section class="profile-section"><h2>${esc(c.boundaryTitle)}</h2><ul>${c.boundary.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>${links(lang,c)}</article>`;}
function editorialBody(lang){const c=COPY[lang];return `<article class="container page trust-page"><p class="eyebrow">CHUDO HUMAN RIGHTS CENTER · TRUST</p><h1>${esc(c.editorialTitle)}</h1><p class="catalog-note">${esc(c.editorialIntro)}</p><div class="news-grid editorial-policy-grid">${c.editorialSections.map(([title,text])=>`<section class="tech-news-card"><h2>${esc(title)}</h2><p>${esc(text)}</p></section>`).join('')}</div><section class="profile-section"><h2>${esc(c.boundaryTitle)}</h2><ul>${c.boundary.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>${links(lang,c)}</article>`;}

for(const lang of langs){const c=COPY[lang];await writeText(outputPath(lang,'/transparency/'),layout({lang,title:c.transparencyTitle,description:c.transparencyIntro,path:'/transparency/',body:transparencyBody(lang)}));await writeText(outputPath(lang,'/editorial-policy/'),layout({lang,title:c.editorialTitle,description:c.editorialIntro,path:'/editorial-policy/',body:editorialBody(lang)}));}
console.log(`TRUST_CENTER_BUILD=PASS locales=4 media=${mediaSources.length} active_media=${mediaEnabled.length} telegram=${channels.length} news=${news.length} videos=${videos.length} publication_state=${manifest.publication_state}`);
