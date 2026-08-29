import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeText } from './lib/fs.mjs';
import { layout, route, esc } from './templates.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=join(root,'_site');
const langs=['ru','be','en','pl'];

const COPY={
 ru:{
  faqTitle:'Частые вопросы о политзаключённых и репрессиях в Беларуси',faqIntro:'Короткие ответы о том, как устроен Правозащитный центр CHUDO, откуда берутся данные и как пользоваться публичной базой.',
  faq:[
   ['Что такое Правозащитный центр CHUDO?','CHUDO — независимый публичный информационный и документирующий проект о политических репрессиях в Беларуси. Сайт объединяет карточки людей, места заключения, новости, источники, мониторинг и историю исправлений.'],
   ['Кого CHUDO показывает как политзаключённого?','CHUDO не присваивает этот статус автоматически по новости или сообщению Telegram. Если статус поступил от правозащитного источника, на странице сохраняется происхождение этой квалификации.'],
   ['Откуда берутся данные?','Основной структурированный правозащитный источник — Правозащитный центр «Вясна». Также используются зарегистрированные СМИ, публичные Telegram-каналы и официальные сообщения с указанием происхождения.'],
   ['Материал Telegram считается подтверждённым фактом CHUDO?','Нет. Материал зарегистрированного Telegram-канала может публиковаться автоматически как материал указанного источника со ссылкой на оригинал, но это не превращает его в самостоятельный подтверждённый вывод CHUDO.'],
   ['Почему цифры на разных сайтах могут отличаться?','Источники обновляются в разное время и могут использовать разные категории. CHUDO рассчитывает публичные показатели из одного опубликованного snapshot, чтобы собственные страницы не расходились между собой.'],
   ['Как найти человека?','Используйте общий поиск CHUDO или каталог политзаключённых и репрессированных. Поиск работает в вашем браузере и не отправляет запросы сторонним поисковым сервисам.'],
   ['Что делать, если я нашёл ошибку?','Откройте раздел «Исправления» и сообщите URL страницы, спорный факт и проверяемый первоисточник. История существенных исправлений сохраняется.'],
   ['Можно ли СМИ и исследователям ссылаться на CHUDO?','Да. Используйте конкретный URL записи или публикации и указывайте дату либо snapshot для статистических данных. В разделе «Для СМИ» есть рекомендуемый формат ссылки.']
  ],
  writeTitle:'Как написать политзаключённому в Беларуси',writeIntro:'Перед отправкой письма важно проверить последнее опубликованное место заключения: переводы между СИЗО, тюрьмами и колониями могут происходить быстрее, чем обновляются старые публикации.',
  steps:[
   ['1. Найдите актуальную карточку человека','Используйте поиск CHUDO. На карточке смотрите последнее опубликованное место заключения и дату подтверждения данных.'],
   ['2. Откройте карточку учреждения','Если адрес учреждения опубликован и подтверждён в текущем snapshot, используйте именно его. Не копируйте адрес из старого сообщения, если в карточке уже указано другое место.'],
   ['3. Укажите получателя точно','Используйте опубликованное полное имя. Дополнительные данные указывайте только если они публично нужны для идентификации адресата и не добавляют ненужную чувствительную информацию.'],
   ['4. Учитывайте правила конкретного учреждения','Разрешённые вложения, язык, формат конверта и другие почтовые требования могут меняться. Перед отправкой сверяйте актуальные официальные правила почтовой связи и учреждения.'],
   ['5. Не публикуйте лишние персональные данные','Не размещайте публично домашние адреса родственников, частные телефоны, документы и другие сведения, которые могут создать дополнительный риск.']
  ],
  note:'CHUDO показывает публичную справочную информацию и не может гарантировать доставку конкретного письма. Если место заключения изменилось, ориентируйтесь на самое свежее подтверждённое обновление.',find:'НАЙТИ ЧЕЛОВЕКА',prisons:'МЕСТА ЗАКЛЮЧЕНИЯ',corrections:'СООБЩИТЬ ОБ ОШИБКЕ',faqLink:'ЧАСТЫЕ ВОПРОСЫ'
 },
 be:{
  faqTitle:'Частыя пытанні пра палітвязняў і рэпрэсіі ў Беларусі',faqIntro:'Кароткія адказы пра тое, як працуе Праваабарончы цэнтр CHUDO, адкуль бяруцца даныя і як карыстацца публічнай базай.',
  faq:[
   ['Што такое Праваабарончы цэнтр CHUDO?','CHUDO — незалежны публічны інфармацыйны і дакументальны праект пра палітычныя рэпрэсіі ў Беларусі.'],
   ['Каго CHUDO паказвае як палітвязня?','CHUDO не прысвойвае статус аўтаматычна паводле навіны або Telegram. Паходжанне праваабарончай кваліфікацыі захоўваецца на старонцы.'],
   ['Адкуль бяруцца даныя?','Асноўная структураваная праваабарончая крыніца — Праваабарончы цэнтр «Вясна». Таксама выкарыстоўваюцца зарэгістраваныя СМІ, публічныя Telegram-каналы і афіцыйныя паведамленні.'],
   ['Ці з’яўляецца Telegram-матэрыял пацверджаным фактам CHUDO?','Не. Ён можа публікавацца як матэрыял названай крыніцы са спасылкай на арыгінал, але не становіцца самастойнай высновай CHUDO.'],
   ['Чаму лічбы на розных сайтах адрозніваюцца?','Крыніцы абнаўляюцца ў розны час і выкарыстоўваюць розныя катэгорыі. CHUDO будуе свае паказчыкі з аднаго апублікаванага snapshot.'],
   ['Як знайсці чалавека?','Выкарыстоўвайце агульны пошук CHUDO або каталог палітвязняў і рэпрэсаваных. Пошук працуе ў вашым браўзеры.'],
   ['Што рабіць, калі я знайшоў памылку?','Паведаміце URL старонкі, спрэчны факт і правяральную першакрыніцу праз раздзел выпраўленняў.'],
   ['Ці можна СМІ і даследчыкам спасылацца на CHUDO?','Так. Спасылайцеся на канкрэтную старонку і пазначайце дату або snapshot для статыстыкі.']
  ],
  writeTitle:'Як напісаць палітвязню ў Беларусі',writeIntro:'Перад адпраўкай ліста праверце апошняе апублікаванае месца зняволення: пераводы могуць адбывацца хутчэй, чым абнаўляюцца старыя паведамленні.',
  steps:[['1. Знайдзіце актуальную картку чалавека','Выкарыстоўвайце пошук CHUDO і праверце апошняе месца зняволення і дату пацверджання.'],['2. Адкрыйце картку ўстановы','Калі адрас пацверджаны ў бягучым snapshot, выкарыстоўвайце яго.'],['3. Дакладна пакажыце атрымальніка','Выкарыстоўвайце апублікаванае поўнае імя і не дадавайце непатрэбныя адчувальныя даныя.'],['4. Праверце правілы ўстановы','Патрабаванні да пошты і ўкладанняў могуць змяняцца; звярайце актуальныя афіцыйныя правілы.'],['5. Не публікуйце лішнія персанальныя даныя','Не публікуйце хатнія адрасы сваякоў, прыватныя тэлефоны або дакументы.']],
  note:'CHUDO дае публічную даведачную інфармацыю і не можа гарантаваць дастаўку канкрэтнага ліста.',find:'ЗНАЙСЦІ ЧАЛАВЕКА',prisons:'МЕСЦЫ ЗНЯВОЛЕННЯ',corrections:'ПАВЕДАМІЦЬ ПРА ПАМЫЛКУ',faqLink:'ЧАСТЫЯ ПЫТАННІ'
 },
 en:{
  faqTitle:'Frequently asked questions about political prisoners and repression in Belarus',faqIntro:'Short answers on how CHUDO Human Rights Center works, where its data comes from and how to use the public database.',
  faq:[
   ['What is CHUDO Human Rights Center?','CHUDO is an independent public information and documentation project on political repression in Belarus.'],
   ['Who is shown as a political prisoner?','CHUDO does not automatically assign that status from a news or Telegram report. When a designation comes from a human-rights source, its provenance remains visible.'],
   ['Where does the data come from?','The main structured human-rights source is Human Rights Center Viasna. Registered media, public Telegram channels and official statements are also used with attribution.'],
   ['Is a Telegram post a verified CHUDO fact?','No. Registered Telegram material may appear as material of the named source with an original link, but it does not become an independent CHUDO conclusion.'],
   ['Why can counts differ between websites?','Sources update at different times and may use different categories. CHUDO calculates its public figures from one published snapshot.'],
   ['How do I find a person?','Use CHUDO global search or the political-prisoner/repression catalogs. Search queries are processed in your browser.'],
   ['What if I find an error?','Use the Corrections section and provide the page URL, disputed fact and a verifiable primary source.'],
   ['May media and researchers cite CHUDO?','Yes. Link to the exact record or publication and include the relevant date or snapshot for statistics.']
  ],
  writeTitle:'How to write to a political prisoner in Belarus',writeIntro:'Before sending a letter, check the latest published place of detention. Transfers between detention centers, prisons and penal colonies may make old addresses obsolete.',
  steps:[['1. Find the current person profile','Use CHUDO search and check the latest published detention location and verification date.'],['2. Open the facility page','If the facility address is published and confirmed in the current snapshot, use that address rather than an older report.'],['3. Identify the recipient accurately','Use the published full name and add only information genuinely needed to identify the recipient.'],['4. Check current facility rules','Rules on permitted enclosures, envelopes and correspondence can change; verify current official postal and facility requirements.'],['5. Avoid unnecessary personal data','Do not publicly share relatives’ home addresses, private phone numbers, identity documents or other sensitive details.']],
  note:'CHUDO provides public reference information and cannot guarantee delivery of a particular letter.',find:'FIND A PERSON',prisons:'DETENTION FACILITIES',corrections:'REPORT AN ERROR',faqLink:'FREQUENTLY ASKED QUESTIONS'
 },
 pl:{
  faqTitle:'Najczęstsze pytania o więźniów politycznych i represje na Białorusi',faqIntro:'Krótkie odpowiedzi o tym, jak działa Centrum Praw Człowieka CHUDO, skąd pochodzą dane i jak korzystać z publicznej bazy.',
  faq:[
   ['Czym jest Centrum Praw Człowieka CHUDO?','CHUDO to niezależny publiczny projekt informacyjny i dokumentacyjny dotyczący represji politycznych na Białorusi.'],
   ['Kogo CHUDO pokazuje jako więźnia politycznego?','CHUDO nie nadaje tego statusu automatycznie na podstawie wiadomości lub Telegramu. Pochodzenie kwalifikacji organizacji praw człowieka pozostaje widoczne.'],
   ['Skąd pochodzą dane?','Głównym uporządkowanym źródłem jest Centrum Praw Człowieka „Wiasna”. Wykorzystywane są też zarejestrowane media, publiczne kanały Telegram i oficjalne komunikaty.'],
   ['Czy wpis Telegram jest zweryfikowanym faktem CHUDO?','Nie. Może być publikowany jako materiał wskazanego źródła z linkiem do oryginału, ale nie staje się niezależnym wnioskiem CHUDO.'],
   ['Dlaczego liczby na stronach mogą się różnić?','Źródła aktualizują dane w różnym czasie i stosują różne kategorie. CHUDO liczy własne wskaźniki z jednego opublikowanego snapshotu.'],
   ['Jak znaleźć osobę?','Skorzystaj z wyszukiwarki CHUDO albo katalogu więźniów politycznych i osób represjonowanych.'],
   ['Co zrobić, gdy znajdę błąd?','W sekcji Korekty podaj URL strony, sporny fakt oraz możliwe do zweryfikowania źródło pierwotne.'],
   ['Czy media i badacze mogą cytować CHUDO?','Tak. Linkuj do konkretnego wpisu i podawaj datę lub snapshot dla danych statystycznych.']
  ],
  writeTitle:'Jak napisać do więźnia politycznego na Białorusi',writeIntro:'Przed wysłaniem listu sprawdź ostatnie opublikowane miejsce osadzenia, ponieważ przeniesienia mogą szybko dezaktualizować stare adresy.',
  steps:[['1. Znajdź aktualny profil osoby','Użyj wyszukiwarki CHUDO i sprawdź ostatnie miejsce osadzenia oraz datę potwierdzenia.'],['2. Otwórz stronę placówki','Jeśli adres jest opublikowany i potwierdzony w bieżącym snapshocie, użyj właśnie tego adresu.'],['3. Dokładnie wskaż odbiorcę','Użyj opublikowanego pełnego imienia i nie dodawaj zbędnych danych wrażliwych.'],['4. Sprawdź aktualne zasady placówki','Wymogi dotyczące korespondencji mogą się zmieniać; sprawdzaj aktualne oficjalne zasady.'],['5. Nie publikuj zbędnych danych osobowych','Nie publikuj adresów domowych krewnych, prywatnych telefonów ani dokumentów.']],
  note:'CHUDO udostępnia publiczne informacje referencyjne i nie może zagwarantować doręczenia konkretnego listu.',find:'ZNAJDŹ OSOBĘ',prisons:'MIEJSCA OSADZENIA',corrections:'ZGŁOŚ BŁĄD',faqLink:'NAJCZĘSTSZE PYTANIA'
 }
};

function outputPath(lang,path){const prefix=lang==='ru'?'':lang;const clean=String(path).replace(/^\//,'').replace(/\/$/,'');return join(out,prefix,clean,'index.html');}
function faqBody(lang){const c=COPY[lang];return `<article class="container page"><p class="eyebrow">CHUDO HUMAN RIGHTS CENTER</p><h1>${esc(c.faqTitle)}</h1><p class="catalog-note">${esc(c.faqIntro)}</p>${c.faq.map(([q,a])=>`<section class="profile-section"><h2>${esc(q)}</h2><p>${esc(a)}</p></section>`).join('')}<p><a class="secondary-btn" href="${route(lang,'/write-letter/')}">${esc(c.writeTitle)}</a></p></article>`;}
function writeBody(lang){const c=COPY[lang];return `<article class="container page"><p class="eyebrow">CHUDO HUMAN RIGHTS CENTER</p><h1>${esc(c.writeTitle)}</h1><p class="catalog-note">${esc(c.writeIntro)}</p>${c.steps.map(([h,p])=>`<section class="profile-section"><h2>${esc(h)}</h2><p>${esc(p)}</p></section>`).join('')}<div class="empty-state"><p>${esc(c.note)}</p></div><p><a class="primary-btn" href="${route(lang,'/search/')}">${esc(c.find)}</a> <a class="secondary-btn" href="${route(lang,'/prisons/')}">${esc(c.prisons)}</a> <a class="secondary-btn" href="${route(lang,'/corrections/')}">${esc(c.corrections)}</a></p><p><a href="${route(lang,'/faq/')}">${esc(c.faqLink)}</a></p></article>`;}
function faqJsonLd(items){return `<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'FAQPage',mainEntity:items.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))}).replace(/</g,'\\u003c')}</script>`;}

for(const lang of langs){const c=COPY[lang];let faq=layout({lang,title:c.faqTitle,description:c.faqIntro,path:'/faq/',body:faqBody(lang)});faq=faq.replace('</head>',`${faqJsonLd(c.faq)}\n</head>`);await writeText(outputPath(lang,'/faq/'),faq);await writeText(outputPath(lang,'/write-letter/'),layout({lang,title:c.writeTitle,description:c.writeIntro,path:'/write-letter/',body:writeBody(lang)}));const helpFile=outputPath(lang,'/help/');try{let help=await readFile(helpFile,'utf8');if(!help.includes('/write-letter/'))help=help.replace('</main>',`<section class="container profile-section"><h2>${esc(c.writeTitle)}</h2><p>${esc(c.writeIntro)}</p><p><a class="primary-btn" href="${route(lang,'/write-letter/')}">${esc(c.writeTitle)}</a> <a class="secondary-btn" href="${route(lang,'/faq/')}">${esc(c.faqLink)}</a></p></section></main>`);await writeText(helpFile,help);}catch{}}
console.log('HELP_CENTER_BUILD=PASS faq_pages=4 letter_pages=4 faq_questions=8');
