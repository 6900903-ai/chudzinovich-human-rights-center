import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeText } from './lib/fs.mjs';
import { loadTelegramRegistry } from './lib/telegram-registry.mjs';
import { loadMediaRegistry } from './lib/media-registry.mjs';
import { layout, esc } from './templates.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = join(root, '_site');
const langs = ['ru','be','en','pl'];
const telegramRegistry = await loadTelegramRegistry();
const mediaRegistry = await loadMediaRegistry();
const telegramChannels = telegramRegistry.channels.filter(channel => channel.publication_enabled === true);
const mediaEnabled = mediaRegistry.sources.filter(source => source.candidate_discovery_enabled === true);

const COPY = {
  ru: {
    title:'Источники', intro:'CHUDO использует явно зарегистрированные источники и всегда показывает происхождение материала. Публикация источника не означает, что CHUDO независимо подтвердил каждое утверждение.',
    viasna:'Правозащитный центр «Вясна»', viasnaText:'Основной структурированный публичный источник для сведений о политзаключённых и репрессиях. Квалификация «политзаключённый» от «Вясны» публикуется как атрибутированная правозащитная квалификация, если CHUDO отдельно не принял собственное редакционное решение.',
    media:'Белорусские и международные СМИ', mediaText:`В discovery-реестре ${mediaRegistry.sources.length} медиа-источников; ${mediaEnabled.length} из них допускаются к поиску кандидатов. Перепечатки одного первоисточника не считаются независимыми подтверждениями.`,
    telegram:'Telegram-каналы', telegramText:'Материалы выбранных Telegram-каналов публикуются автоматически без факт-чека CHUDO и без ручного редакционного подтверждения. На сайте всегда указываются канал и ссылка на исходный пост. Материал остаётся сообщением источника. Непубличные телефоны, домашние адреса, паспортные данные и явный доксинг автоматически не размножаются.',
    rule:'SOURCE ≠ FACT · TELEGRAM POST ≠ CHUDO VERIFIED FACT · MEDIA REPORT ≠ POLITICAL PRISONER DESIGNATION'
  },
  be: {
    title:'Крыніцы', intro:'CHUDO выкарыстоўвае выразна зарэгістраваныя крыніцы і заўсёды паказвае паходжанне матэрыялу. Публікацыя крыніцы не азначае, што CHUDO незалежна пацвердзіў кожнае сцвярджэнне.',
    viasna:'Праваабарончы цэнтр «Вясна»', viasnaText:'Асноўная структураваная публічная крыніца звестак пра палітвязняў і рэпрэсіі. Кваліфікацыя «палітвязень» ад «Вясны» паказваецца як атрыбутаваная праваабарончая кваліфікацыя, калі CHUDO асобна не прыняў уласнае рэдакцыйнае рашэнне.',
    media:'Беларускія і міжнародныя СМІ', mediaText:`У discovery-рэестры ${mediaRegistry.sources.length} медыя-крыніц; ${mediaEnabled.length} з іх дапускаюцца да пошуку кандыдатаў. Перадрукі адной першакрыніцы не лічацца незалежнымі пацверджаннямі.`,
    telegram:'Telegram-каналы', telegramText:'Матэрыялы выбраных Telegram-каналаў публікуюцца аўтаматычна без фактчэку CHUDO і без ручнога рэдакцыйнага пацверджання. На сайце заўсёды паказваюцца канал і спасылка на зыходны пост. Матэрыял застаецца паведамленнем крыніцы. Непублічныя тэлефоны, хатнія адрасы, пашпартныя даныя і відавочны доксінг аўтаматычна не распаўсюджваюцца.',
    rule:'SOURCE ≠ FACT · TELEGRAM POST ≠ CHUDO VERIFIED FACT · MEDIA REPORT ≠ POLITICAL PRISONER DESIGNATION'
  },
  en: {
    title:'Sources', intro:'CHUDO uses explicitly registered sources and always preserves provenance. Publishing a source item does not mean CHUDO independently verified every statement in it.',
    viasna:'Human Rights Center Viasna', viasnaText:'The main structured public source for political-prisoner and repression data. A Viasna political-prisoner designation is displayed as an attributed human-rights designation unless CHUDO separately makes its own approved editorial determination.',
    media:'Belarusian and international media', mediaText:`The discovery registry contains ${mediaRegistry.sources.length} media sources; ${mediaEnabled.length} are candidate-discovery eligible. Rewrites of one original claim do not count as independent confirmations.`,
    telegram:'Telegram channels', telegramText:'Selected Telegram channels are published automatically without CHUDO fact-checking or manual editorial approval. The site always identifies the channel and links to the original post. The material remains a source statement. Non-public phone numbers, home addresses, identity-document data and explicit doxxing are not automatically replicated.',
    rule:'SOURCE ≠ FACT · TELEGRAM POST ≠ CHUDO VERIFIED FACT · MEDIA REPORT ≠ POLITICAL PRISONER DESIGNATION'
  },
  pl: {
    title:'Źródła', intro:'CHUDO korzysta z jawnie zarejestrowanych źródeł i zawsze zachowuje informację o pochodzeniu. Publikacja materiału źródłowego nie oznacza, że CHUDO niezależnie potwierdziło każde zawarte w nim twierdzenie.',
    viasna:'Centrum Praw Człowieka „Wiasna”', viasnaText:'Główne uporządkowane publiczne źródło danych o więźniach politycznych i represjach. Kwalifikacja „więzień polityczny” pochodząca od Wiasny jest prezentowana jako przypisana kwalifikacja organizacji praw człowieka, chyba że CHUDO podejmie odrębną decyzję redakcyjną.',
    media:'Media białoruskie i międzynarodowe', mediaText:`Rejestr discovery obejmuje ${mediaRegistry.sources.length} źródeł medialnych; ${mediaEnabled.length} może służyć do wyszukiwania kandydatów. Przedruki jednego pierwotnego komunikatu nie są niezależnymi potwierdzeniami.`,
    telegram:'Kanały Telegram', telegramText:'Materiały z wybranych kanałów Telegram są publikowane automatycznie bez fact-checkingu CHUDO i bez ręcznej akceptacji redakcyjnej. Serwis zawsze wskazuje kanał i link do oryginalnego wpisu. Materiał pozostaje twierdzeniem źródła. Niepubliczne numery telefonów, adresy domowe, dane dokumentów tożsamości i jawny doxxing nie są automatycznie powielane.',
    rule:'SOURCE ≠ FACT · TELEGRAM POST ≠ CHUDO VERIFIED FACT · MEDIA REPORT ≠ POLITICAL PRISONER DESIGNATION'
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
