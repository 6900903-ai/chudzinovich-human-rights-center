import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { writeText } from './lib/fs.mjs';
import { layout, route, esc } from './templates.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = join(root, '_site');
const langs = ['ru','be','en','pl'];

const PAGES = {
  '/methodology/': {
    ru: ['Методология','CHUDO отделяет источник от факта. Сообщение СМИ или Telegram не присваивает статус политзаключённого. Такой статус публикуется только как явно атрибутированная правозащитная квалификация либо после отдельного редакционного решения CHUDO по утверждённой методологии. Противоречия источников не скрываются. Высокорисковые изменения — смерть, освобождение, повторное задержание, пытки, здоровье, несовершеннолетние и конфликт личности — требуют отдельной проверки.'],
    be: ['Метадалогія','CHUDO аддзяляе крыніцу ад факта. Паведамленне СМІ або Telegram не прысвойвае статус палітвязня. Такі статус публікуецца толькі як выразна атрыбутаваная праваабарончая кваліфікацыя або пасля асобнага рэдакцыйнага рашэння CHUDO паводле зацверджанай метадалогіі. Супярэчнасці крыніц не хаваюцца. Высокарызыкоўныя змены патрабуюць асобнай праверкі.'],
    en: ['Methodology','CHUDO separates sources from facts. A media or Telegram report cannot designate a person as a political prisoner. Such status is published only as an explicitly attributed human-rights designation or after a separate CHUDO editorial determination under an approved methodology. Source conflicts remain visible. High-risk changes require additional review.'],
    pl: ['Metodologia','CHUDO oddziela źródło od faktu. Publikacja medialna lub Telegram nie nadaje statusu więźnia politycznego. Taki status jest publikowany wyłącznie jako wyraźnie przypisana kwalifikacja organizacji praw człowieka albo po odrębnej decyzji redakcyjnej CHUDO zgodnej z przyjętą metodologią. Rozbieżności źródeł pozostają widoczne. Zmiany wysokiego ryzyka wymagają dodatkowej weryfikacji.']
  },
  '/sources/': {
    ru: ['Источники','Основной структурированный публичный источник базы — Правозащитный центр «Вясна». Дополнительно CHUDO использует проверяемые белорусские и международные СМИ, официальные публичные сообщения и утверждённые Telegram-каналы. Каждый опубликованный существенный факт сохраняет ссылку на происхождение. Количество перепечаток не считается количеством независимых подтверждений.'],
    be: ['Крыніцы','Асноўная структураваная публічная крыніца базы — Праваабарончы цэнтр «Вясна». Дадаткова CHUDO выкарыстоўвае правяральныя беларускія і міжнародныя СМІ, афіцыйныя публічныя паведамленні і зацверджаныя Telegram-каналы. Кожны істотны апублікаваны факт захоўвае спасылку на паходжанне. Колькасць перадрукаў не лічыцца колькасцю незалежных пацверджанняў.'],
    en: ['Sources','The main structured public database source is Human Rights Center Viasna. CHUDO additionally uses verifiable Belarusian and international media, official public statements and approved Telegram channels. Every material published fact keeps provenance. Multiple rewrites of one original claim do not count as independent confirmations.'],
    pl: ['Źródła','Głównym uporządkowanym publicznym źródłem bazy jest Centrum Praw Człowieka „Wiasna”. CHUDO korzysta również ze sprawdzalnych mediów białoruskich i międzynarodowych, oficjalnych komunikatów publicznych oraz zatwierdzonych kanałów Telegram. Każdy istotny opublikowany fakt zachowuje wskazanie pochodzenia. Wiele przedruków jednego komunikatu nie jest traktowane jako niezależne potwierdzenia.']
  },
  '/corrections/': {
    ru: ['Исправления данных','CHUDO не удаляет историю существенных исправлений. Опубликованный факт может получить состояние: исправлен, отозван, заменён или оспаривается. Если вы обнаружили ошибку, укажите страницу, спорный факт и проверяемый первоисточник. Не отправляйте через публичные каналы чувствительные персональные данные.'],
    be: ['Выпраўленні даных','CHUDO не выдаляе гісторыю істотных выпраўленняў. Апублікаваны факт можа атрымаць стан: выпраўлены, адкліканы, заменены або аспрэчваецца. Калі вы знайшлі памылку, пакажыце старонку, спрэчны факт і правяральную першакрыніцу. Не дасылайце праз публічныя каналы адчувальныя персанальныя даныя.'],
    en: ['Data corrections','CHUDO preserves the history of material corrections. A published fact may be marked corrected, retracted, superseded or disputed. To report an error, identify the page, disputed fact and a verifiable primary source. Do not send sensitive personal data through public channels.'],
    pl: ['Korekty danych','CHUDO zachowuje historię istotnych korekt. Opublikowany fakt może zostać oznaczony jako poprawiony, wycofany, zastąpiony lub sporny. Zgłaszając błąd, wskaż stronę, kwestionowany fakt i możliwe do zweryfikowania źródło pierwotne. Nie przesyłaj wrażliwych danych osobowych kanałami publicznymi.']
  },
  '/privacy/': {
    ru: ['Конфиденциальность','Сайт рассчитан на чтение без регистрации. По умолчанию CHUDO не использует рекламные трекеры, стороннюю аналитику, внешние шрифты или сторонний поиск. Поиск по людям выполняется в браузере посетителя. Публичная база содержит только сведения, прошедшие публикационный контур; внутренняя очередь проверки хранится отдельно от публичного репозитория. Чувствительная форма передачи информации отключена до отдельного аудита безопасности.'],
    be: ['Прыватнасць','Сайт разлічаны на чытанне без рэгістрацыі. Па змаўчанні CHUDO не выкарыстоўвае рэкламныя трэкеры, староннюю аналітыку, знешнія шрыфты або старонні пошук. Пошук па людзях выконваецца ў браўзеры наведвальніка. Публічная база змяшчае толькі звесткі, што прайшлі публікацыйны кантур; унутраная чарга праверкі захоўваецца асобна ад публічнага рэпазіторыя.'],
    en: ['Privacy','The site is designed for reading without registration. By default CHUDO uses no advertising trackers, third-party analytics, external fonts or third-party search. Person search runs in the visitor browser. The public database contains only records that passed the publication boundary; internal review data is stored separately from the public repository. Sensitive submissions remain disabled pending a separate security review.'],
    pl: ['Prywatność','Serwis jest przeznaczony do korzystania bez rejestracji. Domyślnie CHUDO nie używa trackerów reklamowych, zewnętrznej analityki, zewnętrznych fontów ani wyszukiwania stron trzecich. Wyszukiwanie osób działa w przeglądarce użytkownika. Publiczna baza zawiera wyłącznie dane, które przeszły proces publikacyjny; wewnętrzna kolejka weryfikacji jest oddzielona od publicznego repozytorium.']
  },
  '/security/': {
    ru: ['Безопасность','CHUDO минимизирует внешние зависимости браузера и использует fail-closed правила для импорта данных. Не публикуются частные телефоны, домашние адреса родственников, документы личности, закрытые контакты и иные сведения, которые могут создать дополнительный риск. Если вы нашли техническую уязвимость, не публикуйте эксплуатационные детали публично; используйте официальный контакт проекта, когда защищённый канал будет активирован.'],
    be: ['Бяспека','CHUDO мінімізуе знешнія залежнасці браўзера і выкарыстоўвае fail-closed правілы для імпарту даных. Не публікуюцца прыватныя тэлефоны, хатнія адрасы сваякоў, дакументы асобы, закрытыя кантакты і іншыя звесткі, якія могуць стварыць дадатковую рызыку.'],
    en: ['Security','CHUDO minimizes browser-side external dependencies and uses fail-closed data ingestion rules. Private phone numbers, relatives’ home addresses, identity documents, non-public contacts and other information that could create additional risk are not published. If you discover a technical vulnerability, do not disclose exploitation details publicly.'],
    pl: ['Bezpieczeństwo','CHUDO minimalizuje zewnętrzne zależności przeglądarki i stosuje zasadę fail-closed przy imporcie danych. Nie publikujemy prywatnych numerów telefonów, adresów domowych krewnych, dokumentów tożsamości, niepublicznych kontaktów ani innych informacji mogących zwiększyć ryzyko.']
  },
  '/terms/': {
    ru: ['Условия использования','Материалы CHUDO предназначены для правозащитного информирования и документирования. Ссылки на внешние источники не означают, что CHUDO подтверждает каждое утверждение источника. Сведения могут меняться по мере появления новых подтверждений. Пользователь должен проверять актуальность данных перед принятием решений, затрагивающих безопасность человека.'],
    be: ['Умовы выкарыстання','Матэрыялы CHUDO прызначаныя для праваабарончага інфармавання і дакументавання. Спасылкі на знешнія крыніцы не азначаюць, што CHUDO пацвярджае кожнае сцвярджэнне крыніцы. Звесткі могуць змяняцца пры з’яўленні новых пацверджанняў.'],
    en: ['Terms of use','CHUDO materials are intended for human-rights information and documentation. Linking to an external source does not mean CHUDO independently confirms every claim made by that source. Information may change as new evidence becomes available. Users should verify current information before making decisions that affect a person’s safety.'],
    pl: ['Warunki korzystania','Materiały CHUDO służą informowaniu i dokumentowaniu praw człowieka. Odnośnik do zewnętrznego źródła nie oznacza, że CHUDO niezależnie potwierdza każde twierdzenie tego źródła. Informacje mogą się zmieniać wraz z pojawieniem się nowych dowodów.']
  },
  '/contacts/': {
    ru: ['Контакты','Публичный канал проекта: @Z690002. Не отправляйте туда чувствительные персональные данные. Защищённая форма сообщения о репрессии пока отключена.'],
    be: ['Кантакты','Публічны канал праекта: @Z690002. Не дасылайце туды адчувальныя персанальныя даныя. Абароненая форма паведамлення пра рэпрэсіі пакуль адключаная.'],
    en: ['Contacts','Public project channel: @Z690002. Do not send sensitive personal data there. The secure repression-reporting form remains disabled.'],
    pl: ['Kontakt','Publiczny kanał projektu: @Z690002. Nie przesyłaj tam wrażliwych danych osobowych. Bezpieczny formularz zgłaszania represji pozostaje wyłączony.']
  }
};

function outputPath(lang, path) {
  const prefix = lang === 'ru' ? '' : lang;
  const clean = path.replace(/^\//,'').replace(/\/$/,'');
  return join(out, prefix, clean, 'index.html');
}

function bodyFor(lang, path, title, text) {
  const contact = path === '/contacts/' ? `<p><a class="secondary-btn" href="https://t.me/Z690002" rel="external nofollow noopener">@Z690002</a></p>` : '';
  return `<article class="container page policy-page"><p class="eyebrow">CHUDO HUMAN RIGHTS CENTER</p><h1>${esc(title)}</h1><div class="profile-section"><p>${esc(text)}</p>${contact}</div></article>`;
}

const urls = [];
for (const [path, localized] of Object.entries(PAGES)) {
  for (const lang of langs) {
    const [title, text] = localized[lang];
    await writeText(outputPath(lang,path), layout({lang,title,description:text.slice(0,180),path,body:bodyFor(lang,path,title,text)}));
    urls.push(`https://chudzinovich.pp.ua${route(lang,path)}`);
  }
}

const sitemapPath = join(out,'sitemap.xml');
let sitemap = await readFile(sitemapPath,'utf8');
const addition = urls.filter(url => !sitemap.includes(`<loc>${url}</loc>`)).map(url => `<url><loc>${url}</loc></url>`).join('');
sitemap = sitemap.replace('</urlset>',`${addition}</urlset>`);
await writeText(sitemapPath,sitemap);

console.log(`POLICY_PAGES_BUILD=PASS pages=${Object.keys(PAGES).length * langs.length}`);
