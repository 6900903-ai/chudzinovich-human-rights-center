import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeText } from './lib/fs.mjs';
import { loadTelegramRegistry } from './lib/telegram-registry.mjs';
import { loadMediaRegistry } from './lib/media-registry.mjs';
import { layout, route, esc } from './templates.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = join(root, '_site');
const langs = ['ru','be','en','pl'];
const telegramRegistry = await loadTelegramRegistry();
const mediaRegistry = await loadMediaRegistry();
const telegramChannels = telegramRegistry.channels.filter(channel => channel.publication_enabled === true);
const mediaEnabled = mediaRegistry.sources.filter(source => source.candidate_discovery_enabled === true);

const COPY = {
  ru: {
    title:'Источники', intro:'CHUDO использует только явно зарегистрированные источники. Источник не равен подтверждённому факту: сообщения сохраняются с атрибуцией и проходят отдельные проверки перед изменением публичной базы.',
    viasna:'Правозащитный центр «Вясна»', viasnaText:'Основной структурированный публичный источник для сведений о политзаключённых и репрессиях. Квалификация «политзаключённый» от «Вясны» публикуется как атрибутированная правозащитная квалификация, если CHUDO отдельно не принял собственное редакционное решение.',
    media:'Белорусские и международные СМИ', mediaText:`В discovery-реестре ${mediaRegistry.sources.length} медиа-источников; ${mediaEnabled.length} из них допускаются к поиску кандидатов. Перепечатки одного первоисточника не считаются независимыми подтверждениями.`,
    telegram:'Утверждённые Telegram-каналы', telegramText:'Материалы Telegram по умолчанию публикуются как краткий пересказ CHUDO с указанием канала и ссылкой на исходный пост. Обвинения, персональные данные и высокорисковые сообщения требуют отдельной проверки.',
    rule:'SOURCE ≠ FACT · TELEGRAM POST ≠ VERIFIED FACT · MEDIA REPORT ≠ POLITICAL PRISONER DESIGNATION'
  },
  be: {
    title:'Крыніцы', intro:'CHUDO выкарыстоўвае толькі выразна зарэгістраваныя крыніцы. Крыніца не роўная пацверджанаму факту: паведамленні захоўваюцца з атрыбуцыяй і праходзяць асобную праверку перад змяненнем публічнай базы.',
    viasna:'Праваабарончы цэнтр «Вясна»', viasnaText:'Асноўная структураваная публічная крыніца звестак пра палітвязняў і рэпрэсіі. Кваліфікацыя «палітвязень» ад «Вясны» паказваецца як атрыбутаваная праваабарончая кваліфікацыя, калі CHUDO асобна не прыняў уласнае рэдакцыйнае рашэнне.',
    media:'Беларускія і міжнародныя СМІ', mediaText:`У discovery-рэестры ${mediaRegistry.sources.length} медыя-крыніц; ${mediaEnabled.length} з іх дапускаюцца да пошуку кандыдатаў. Перадрукі адной першакрыніцы не лічацца незалежнымі пацверджаннямі.`,
    telegram:'Зацверджаныя Telegram-каналы', telegramText:'Матэрыялы Telegram па змаўчанні публікуюцца як кароткі пераказ CHUDO з указаннем канала і спасылкай на зыходны пост. Абвінавачанні, персанальныя даныя і высокарызыкоўныя паведамленні патрабуюць асобнай праверкі.',
    rule:'SOURCE ≠ FACT · TELEGRAM POST ≠ VERIFIED FACT · MEDIA REPORT ≠ POLITICAL PRISONER DESIGNATION'
  },
  en: {
    title:'Sources', intro:'CHUDO uses only explicitly registered sources. A source is not the same as a verified fact: reports retain attribution and pass separate checks before the public database can change.',
    viasna:'Human Rights Center Viasna', viasnaText:'The main structured public source for political-prisoner and repression data. A Viasna political-prisoner designation is displayed as an attributed human-rights designation unless CHUDO separately makes its own approved editorial determination.',
    media:'Belarusian and international media', mediaText:`The discovery registry contains ${mediaRegistry.sources.length} media sources; ${mediaEnabled.length} are candidate-discovery eligible. Rewrites of one original claim do not count as independent confirmations.`,
    telegram:'Approved Telegram channels', telegramText:'Telegram material is published by default as a CHUDO summary with the channel and original-post link. Allegations, personal data and high-risk reports require separate review.',
    rule:'SOURCE ≠ FACT · TELEGRAM POST ≠ VERIFIED FACT · MEDIA REPORT ≠ POLITICAL PRISONER DESIGNATION'
  },
  pl: {
    title:'Źródła', intro:'CHUDO korzysta wyłącznie z jawnie zarejestrowanych źródeł. Źródło nie jest równoznaczne ze zweryfikowanym faktem: informacje zachowują atrybucję i przechodzą odrębne kontrole przed zmianą publicznej bazy.',
    viasna:'Centrum Praw Człowieka „Wiasna”', viasnaText:'Główne uporządkowane publiczne źródło danych o więźniach politycznych i represjach. Kwalifikacja „więzień polityczny” pochodząca od Wiasny jest prezentowana jako przypisana kwalifikacja organizacji praw człowieka, chyba że CHUDO podejmie odrębną decyzję redakcyjną.',
    media:'Media białoruskie i międzynarodowe', mediaText:`Rejestr discovery obejmuje ${mediaRegistry.sources.length} źródeł medialnych; ${mediaEnabled.length} może służyć do wyszukiwania kandydatów. Przedruki jednego pierwotnego komunikatu nie są niezależnymi potwierdzeniami.`,
    telegram:'Zatwierdzone kanały Telegram', telegramText:'Materiały z Telegramu są domyślnie publikowane jako streszczenie CHUDO z nazwą kanału i linkiem do oryginalnego wpisu. Zarzuty, dane osobowe i informacje wysokiego ryzyka wymagają osobnej weryfikacji.',
    rule:'SOURCE ≠ FACT · TELEGRAM POST ≠ VERIFIED FACT · MEDIA REPORT ≠ POLITICAL PRISONER DESIGNATION'
  }
};

function outputPath(lang) {
  const prefix = lang === 'ru' ? '' : lang;
  return join(out, prefix, 'sources', 'index.html');
}

function channelList() {
  return `<ul class="source-list">${telegramChannels.map(channel => `<li><a href="${esc(channel.canonical_url)}" rel="external nofollow noopener">@${esc(channel.handle)}</a><span> — ${esc(channel.display_name)}</span></li>`).join('')}</ul>`;
}

function bodyFor(lang) {
  const c = COPY[lang];
  return `<article class="container page policy-page">
    <p class="eyebrow">CHUDO HUMAN RIGHTS CENTER</p>
    <h1>${esc(c.title)}</h1>
    <div class="profile-section"><p>${esc(c.intro)}</p><p><strong>${esc(c.rule)}</strong></p></div>
    <section class="profile-section"><h2>${esc(c.viasna)}</h2><p>${esc(c.viasnaText)}</p><p><a class="secondary-btn" href="https://prisoners.spring96.org" rel="external nofollow noopener">prisoners.spring96.org</a></p></section>
    <section class="profile-section"><h2>${esc(c.media)}</h2><p>${esc(c.mediaText)}</p></section>
    <section class="profile-section"><h2>${esc(c.telegram)} · ${telegramChannels.length}</h2><p>${esc(c.telegramText)}</p>${channelList()}</section>
  </article>`;
}

for (const lang of langs) {
  const c = COPY[lang];
  await writeText(outputPath(lang), layout({ lang, title:c.title, description:c.intro, path:'/sources/', body:bodyFor(lang) }));
}

console.log(`SOURCES_PAGE_BUILD=PASS telegram=${telegramChannels.length} media_total=${mediaRegistry.sources.length} media_enabled=${mediaEnabled.length}`);
