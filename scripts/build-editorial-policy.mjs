import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeText } from './lib/fs.mjs';
import { layout, route, esc } from './templates.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=join(root,'_site');
const SITE='https://chudzinovich.pp.ua';
const UPDATED='2026-08-29';

const COPY={
  ru:{
    title:'Редакционная политика и стандарты проверки',
    description:'Как Правозащитный центр CHUDO проверяет источники, отделяет сообщения СМИ от установленных фактов, исправляет ошибки и защищает персональные данные.',
    eyebrow:'РЕДАКЦИОННЫЕ СТАНДАРТЫ',
    intro:'Эта политика объясняет, как CHUDO собирает, проверяет, публикует и исправляет сведения о политических репрессиях в Беларуси. Наша цель — сохранять имена и факты, не превращая неподтверждённые сообщения в установленные выводы.',
    updated:'Обновлено',
    sections:[
      ['1. Что мы публикуем','CHUDO публикует собственные справочные материалы, проверенные записи публичной базы, документы, хронологии, ссылки на первоисточники и явно обозначенные материалы внешних источников. Каждая категория имеет собственный уровень проверки и не должна выдаваться за другую.'],
      ['2. Источник не равен установленному факту','Сообщение СМИ, публикация Telegram-канала или заявление участника событий является утверждением конкретного источника. Оно не становится подтверждённым фактом CHUDO только потому, что появилось на сайте. На страницах указываются источник, дата, ссылка и состояние проверки.'],
      ['3. Статус политзаключённого','Медиа-сообщение не является основанием для автоматического присвоения статуса политзаключённого. Статус показывается только как явно атрибутированное решение правозащитного источника либо как подтверждённая редакционная запись, прошедшая установленную процедуру.'],
      ['4. Проверка личности и событий','При совпадении имён, неполных датах, разночтениях или конфликте источников запись не объединяется автоматически. Неопределённость сохраняется явно, спорные сведения изолируются, а даты не дополняются вымышленными днём или месяцем.'],
      ['5. Сведения повышенного риска','Сообщения о смерти, пытках, здоровье, несовершеннолетних, сексуализированном насилии, домашнем адресе, документах личности и серьёзных персональных обвинениях требуют повышенной осторожности. Публичный интерес сопоставляется с риском причинения вреда, а непубличные персональные данные не должны публиковаться.'],
      ['6. Автоматизация','Автоматические системы могут получать публичные RSS-ленты, метаданные видео и материалы зарегистрированных каналов. Автоматизация не имеет права незаметно менять каноническую базу людей, создавать статус политзаключённого или представлять утверждение внешнего источника как собственный вывод CHUDO.'],
      ['7. Исправления и обновления','Мы исправляем фактические ошибки, обновляем изменившиеся сведения и сохраняем происхождение правок. Существенные исправления должны быть видимыми, а удаление или изменение первоисточника учитывается при следующей проверке записи.'],
      ['8. Авторство и ответственность','Издателем сайта является CHUDO Human Rights Center. На собственных материалах должны быть понятны издатель, дата публикации или обновления и используемые источники. Оплата, партнёрство или личные отношения не могут быть основанием для изменения статуса человека или сокрытия существенного конфликта данных.'],
      ['9. Как сообщить об ошибке','Сообщение об ошибке можно направить через страницу контактов. Для быстрой проверки полезно указать адрес страницы, конкретный спорный фрагмент и ссылку на подтверждающий документ или первоисточник.']
    ],
    links:[['/methodology/','Методология'],['/sources/','Источники'],['/corrections/','Исправления'],['/privacy/','Конфиденциальность'],['/contacts/','Контакты']]
  },
  be:{
    title:'Рэдакцыйная палітыка і стандарты праверкі',
    description:'Як Праваабарончы цэнтр CHUDO правярае крыніцы, аддзяляе паведамленні СМІ ад устаноўленых фактаў, выпраўляе памылкі і абараняе персанальныя даныя.',
    eyebrow:'РЭДАКЦЫЙНЫЯ СТАНДАРТЫ',
    intro:'Гэтая палітыка тлумачыць, як CHUDO збірае, правярае, публікуе і выпраўляе звесткі пра палітычныя рэпрэсіі ў Беларусі. Наша мэта — захоўваць імёны і факты, не ператвараючы непацверджаныя паведамленні ва ўстаноўленыя высновы.',
    updated:'Абноўлена',
    sections:[
      ['1. Што мы публікуем','CHUDO публікуе ўласныя даведачныя матэрыялы, правераныя запісы публічнай базы, дакументы, храналогіі, спасылкі на першакрыніцы і выразна пазначаныя матэрыялы знешніх крыніц. Кожная катэгорыя мае свой узровень праверкі.'],
      ['2. Крыніца не роўная ўстаноўленаму факту','Паведамленне СМІ, публікацыя Telegram-канала або заява ўдзельніка падзей з’яўляецца сцвярджэннем канкрэтнай крыніцы. Яно не становіцца пацверджаным фактам CHUDO толькі праз размяшчэнне на сайце.'],
      ['3. Статус палітвязня','Медыяпаведамленне не з’яўляецца падставай для аўтаматычнага прысваення статусу палітвязня. Статус паказваецца толькі з выразнай атрыбуцыяй праваабарончай крыніцы або пасля ўстаноўленай рэдакцыйнай працэдуры.'],
      ['4. Праверка асобы і падзей','Пры супадзенні імёнаў, няпоўных датах, разыходжаннях або канфлікце крыніц запісы не аб’ядноўваюцца аўтаматычна. Нявызначанасць захоўваецца адкрыта, а даты не дапаўняюцца выдуманымі значэннямі.'],
      ['5. Звесткі павышанай рызыкі','Паведамленні пра смерць, катаванні, здароўе, непаўналетніх, сексуалізаваны гвалт, хатнія адрасы, дакументы асобы і сур’ёзныя персанальныя абвінавачанні патрабуюць асаблівай асцярожнасці.'],
      ['6. Аўтаматызацыя','Аўтаматычныя сістэмы могуць атрымліваць публічныя RSS-стужкі, метаданыя відэа і матэрыялы зарэгістраваных каналаў. Яны не могуць непрыкметна змяняць кананічную базу людзей або ствараць статус палітвязня.'],
      ['7. Выпраўленні і абнаўленні','Мы выпраўляем фактычныя памылкі, абнаўляем змененыя звесткі і захоўваем паходжанне правак. Істотныя выпраўленні павінны быць бачнымі.'],
      ['8. Аўтарства і адказнасць','Выдаўцом сайта з’яўляецца CHUDO Human Rights Center. Для ўласных матэрыялаў павінны быць зразумелыя выдавец, дата і выкарыстаныя крыніцы. Аплата або асабістыя адносіны не могуць вызначаць статус чалавека.'],
      ['9. Як паведаміць пра памылку','Паведамленне можна накіраваць праз старонку кантактаў, указаўшы адрас старонкі, спрэчны фрагмент і спасылку на дакумент або першакрыніцу.']
    ],
    links:[['/methodology/','Метадалогія'],['/sources/','Крыніцы'],['/corrections/','Выпраўленні'],['/privacy/','Прыватнасць'],['/contacts/','Кантакты']]
  },
  en:{
    title:'Editorial policy and verification standards',
    description:'How CHUDO Human Rights Center verifies sources, separates media reports from established facts, corrects errors and protects personal data.',
    eyebrow:'EDITORIAL STANDARDS',
    intro:'This policy explains how CHUDO collects, verifies, publishes and corrects information about political repression in Belarus. Our aim is to preserve names and facts without turning unverified reports into established conclusions.',
    updated:'Updated',
    sections:[
      ['1. What we publish','CHUDO publishes original reference material, reviewed public-database records, documents, timelines, links to primary sources and clearly labelled material from external sources. Each category has a distinct verification level and must not be presented as another category.'],
      ['2. A source is not an established fact','A media report, Telegram post or participant statement is a claim made by a particular source. It does not become a CHUDO-confirmed fact merely because it appears on this website. Pages identify the source, date, link and verification state.'],
      ['3. Political-prisoner status','A media report cannot automatically designate a person as a political prisoner. The status is displayed only as an explicitly attributed decision of a human-rights source or as a reviewed editorial record produced under the established procedure.'],
      ['4. Identity and event verification','Matching names, partial dates, transliteration differences or conflicting sources are not merged automatically. Uncertainty remains explicit, disputed information is isolated, and missing dates are not completed with invented values.'],
      ['5. High-risk information','Claims involving death, torture, health, minors, sexual violence, home addresses, identity documents or serious personal allegations require heightened care. Public interest is weighed against foreseeable harm, and non-public personal data must not be published.'],
      ['6. Automation','Automated systems may collect public RSS feeds, video metadata and posts from registered channels. Automation may not silently modify the canonical people database, create political-prisoner status or present an external claim as CHUDO’s own conclusion.'],
      ['7. Corrections and updates','We correct factual errors, update changed information and preserve the provenance of revisions. Material corrections should be visible, and source deletions or amendments are considered during the next review.'],
      ['8. Authorship and accountability','The publisher is CHUDO Human Rights Center. Original material should identify the publisher, publication or update date and the sources used. Payment, partnership or personal relationships may not determine a person’s status or conceal a material conflict in the evidence.'],
      ['9. Reporting an error','Errors can be reported through the contacts page. Please include the page address, the exact disputed passage and a supporting document or primary-source link whenever possible.']
    ],
    links:[['/methodology/','Methodology'],['/sources/','Sources'],['/corrections/','Corrections'],['/privacy/','Privacy'],['/contacts/','Contacts']]
  },
  pl:{
    title:'Polityka redakcyjna i standardy weryfikacji',
    description:'Jak Centrum Praw Człowieka CHUDO weryfikuje źródła, oddziela doniesienia medialne od ustalonych faktów, koryguje błędy i chroni dane osobowe.',
    eyebrow:'STANDARDY REDAKCYJNE',
    intro:'Niniejsza polityka wyjaśnia, jak CHUDO gromadzi, weryfikuje, publikuje i koryguje informacje o represjach politycznych na Białorusi. Celem jest zachowanie nazwisk i faktów bez przedstawiania niepotwierdzonych doniesień jako ustalonych wniosków.',
    updated:'Aktualizacja',
    sections:[
      ['1. Co publikujemy','CHUDO publikuje własne materiały informacyjne, zweryfikowane wpisy publicznej bazy, dokumenty, chronologie, linki do źródeł pierwotnych oraz wyraźnie oznaczone materiały źródeł zewnętrznych. Każda kategoria ma odrębny poziom weryfikacji.'],
      ['2. Źródło nie jest ustalonym faktem','Doniesienie medialne, wpis Telegramu lub oświadczenie uczestnika wydarzeń jest twierdzeniem konkretnego źródła. Samo pojawienie się na stronie nie czyni go faktem potwierdzonym przez CHUDO.'],
      ['3. Status więźnia politycznego','Doniesienie medialne nie może automatycznie nadawać statusu więźnia politycznego. Status jest pokazywany jako wyraźnie przypisana decyzja źródła praw człowieka albo jako zweryfikowany wpis redakcyjny.'],
      ['4. Weryfikacja osoby i wydarzeń','Zbieżne nazwiska, niepełne daty, różnice transliteracji lub sprzeczne źródła nie są automatycznie łączone. Niepewność pozostaje jawna, a brakujące daty nie są uzupełniane wymyślonymi wartościami.'],
      ['5. Informacje wysokiego ryzyka','Twierdzenia dotyczące śmierci, tortur, zdrowia, małoletnich, przemocy seksualnej, adresów domowych, dokumentów tożsamości lub poważnych zarzutów osobistych wymagają szczególnej ostrożności.'],
      ['6. Automatyzacja','Systemy automatyczne mogą pobierać publiczne kanały RSS, metadane filmów i wpisy z zarejestrowanych kanałów. Nie mogą po cichu zmieniać kanonicznej bazy osób ani nadawać statusu więźnia politycznego.'],
      ['7. Korekty i aktualizacje','Korygujemy błędy faktyczne, aktualizujemy zmienione informacje i zachowujemy pochodzenie poprawek. Istotne korekty powinny być widoczne.'],
      ['8. Autorstwo i odpowiedzialność','Wydawcą serwisu jest CHUDO Human Rights Center. Własne materiały powinny wskazywać wydawcę, datę oraz wykorzystane źródła. Płatność lub relacje osobiste nie mogą określać statusu osoby.'],
      ['9. Jak zgłosić błąd','Błąd można zgłosić przez stronę kontaktową, podając adres strony, dokładny sporny fragment oraz dokument lub link do źródła pierwotnego.']
    ],
    links:[['/methodology/','Metodologia'],['/sources/','Źródła'],['/corrections/','Korekty'],['/privacy/','Prywatność'],['/contacts/','Kontakt']]
  }
};

function outputPath(lang){return join(out,lang==='ru'?'':lang,'editorial-policy','index.html');}
function page(lang){
  const c=COPY[lang];
  const sections=c.sections.map(([heading,text])=>`<section class="profile-section"><h2>${esc(heading)}</h2><p>${esc(text)}</p></section>`).join('');
  const links=c.links.map(([path,label])=>`<a class="secondary-btn" href="${route(lang,path)}">${esc(label)}</a>`).join(' ');
  const body=`<article class="container page editorial-policy-page"><p class="eyebrow">${esc(c.eyebrow)}</p><h1>${esc(c.title)}</h1><p class="catalog-note">${esc(c.intro)}</p><p class="record-id">${esc(c.updated)}: <time datetime="${UPDATED}">${UPDATED}</time></p>${sections}<nav class="policy-related-links" aria-label="Related policies">${links}</nav></article>`;
  let html=layout({lang,title:c.title,description:c.description,path:'/editorial-policy/',body,pageType:'article'});
  const jsonLd={
    '@context':'https://schema.org','@type':'Article',headline:c.title,description:c.description,
    datePublished:UPDATED,dateModified:UPDATED,inLanguage:lang,
    mainEntityOfPage:`${SITE}${route(lang,'/editorial-policy/')}`,
    author:{'@type':'Organization','@id':`${SITE}/#organization`,name:'CHUDO Human Rights Center'},
    publisher:{'@type':'Organization','@id':`${SITE}/#organization`,name:'CHUDO Human Rights Center',url:SITE}
  };
  html=html.replace('</head>',`<meta property="article:published_time" content="${UPDATED}T00:00:00Z">\n<meta property="article:modified_time" content="${UPDATED}T00:00:00Z">\n<script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll('<','\\u003c')}</script>\n</head>`);
  return html;
}

for(const lang of Object.keys(COPY))await writeText(outputPath(lang),page(lang));
console.log('EDITORIAL_POLICY_BUILD=PASS locales=4 standards=9');
