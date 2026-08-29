import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeText } from './lib/fs.mjs';
import { resolvePublicDataDir } from './lib/public-data.mjs';
import { layout, route, esc } from './templates.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = join(root, '_site');
const dataDir = resolvePublicDataDir(root);
const manifest = await readJson(join(dataDir, 'manifest.json'));
const langs = ['ru', 'be', 'en', 'pl'];
const UPDATED = '2026-08-29';

const PAGES = [
  { key: 'humanRights', path: '/human-rights-belarus/' },
  { key: 'politicalPrisoners', path: '/political-prisoners-belarus/' },
  { key: 'repression', path: '/political-repression-belarus/' },
  { key: 'citation', path: '/research-and-citation-guide/' }
];

const COPY = {
  ru: {
    statusTitle: 'Текущий статус публичной базы',
    statusPublished: count => `Опубликован проверяемый snapshot. В публичной базе сейчас ${count} записей о людях. Для каждой записи указываются происхождение данных и состояние публикации.`,
    statusEmpty: 'Структура базы и методология уже открыты, но персональные записи ещё не опубликованы. CHUDO не заменяет отсутствующие данные оценками, автоматическими догадками или неподтверждёнными списками.',
    updated: 'Обновлено',
    related: 'Связанные разделы',
    links: [
      ['/methodology/', 'Методология'], ['/sources/', 'Источники'], ['/corrections/', 'Исправления'],
      ['/monitoring/', 'Мониторинг'], ['/reports/', 'Доклады'], ['/prisoners/', 'Каталог политзаключённых']
    ],
    pages: {
      humanRights: {
        eyebrow: 'ПРАВА ЧЕЛОВЕКА В БЕЛАРУСИ',
        title: 'Права человека в Беларуси: проверяемые данные, источники и исправления',
        description: 'Практическое объяснение того, как CHUDO документирует нарушения прав человека в Беларуси, отделяет сообщения источников от подтверждённых фактов и исправляет записи.',
        lead: 'Правозащитная база полезна только тогда, когда читатель понимает, откуда взялось каждое утверждение, когда оно было проверено и что именно остаётся неизвестным. Поэтому CHUDO строит публичный архив не как поток громких заявлений, а как систему проверяемых записей.',
        sections: [
          ['Что документирует CHUDO', [
            'Архив предназначен для систематизации публично доступных сведений о политически мотивированном преследовании: задержаниях, обвинениях, судах, наказаниях, местах заключения, освобождениях и последующих изменениях статуса. Эти элементы не смешиваются в одно общее описание: событие, источник и дата наблюдения сохраняются раздельно.',
            'Новостное сообщение само по себе не присваивает человеку статус политзаключённого. Статус показывается только как явно атрибутированное решение правозащитного источника или как отдельно подтверждённая редакционная запись. Правило проекта: источник не равен факту, а сообщение СМИ не равно правозащитному признанию.'
          ]],
          ['Как устроена проверка', [
            'Сначала материал попадает в слой наблюдений источника. Затем проверяются имя, возможные совпадения, даты, статьи закона, место заключения и противоречия между публикациями. Неясные совпадения, будущие даты, конфликтующие личности и чувствительные сведения не должны автоматически становиться публичной карточкой.',
            'Опубликованная запись получает постоянный идентификатор. Факты сопровождаются ссылкой на первоисточник, временем получения и состоянием достоверности. Когда источник исправляет или удаляет материал, CHUDO должен сохранять историю изменения, а не незаметно переписывать прошлое.'
          ]],
          ['Что означает открытая неопределённость', [
            'В правозащитной работе отсутствие сведений нельзя заполнять предположением. Если дата известна только до месяца или года, это так и показывается. Если текущее место заключения не подтверждено, система не должна выдавать последнее старое значение как актуальное.',
            'Метка «по данным источника» означает, что читатель видит утверждение конкретного источника, а не самостоятельное подтверждение CHUDO. Метка «данные расходятся» предупреждает о конфликте, который ещё не разрешён. Такая прозрачность важнее внешнего впечатления полноты.'
          ]],
          ['Как сообщить об ошибке', [
            'Для исправления нужны точная ссылка на карточку или постоянный идентификатор, описание спорного поля и источник, позволяющий проверить изменение. Просьба об исправлении не должна требовать публичного раскрытия домашнего адреса, номера документа, частного телефона или иных данных, не необходимых для правозащитной цели.',
            'Существенное исправление должно оставлять публичный след: что изменено, когда и на каком основании. Это позволяет журналистам, исследователям и родственникам понимать, какая версия записи использовалась ранее.'
          ]]
        ]
      },
      politicalPrisoners: {
        eyebrow: 'ПОЛИТЗАКЛЮЧЁННЫЕ БЕЛАРУСИ',
        title: 'Политзаключённые Беларуси: как проверяется статус и обновляются данные',
        description: 'Как CHUDO отделяет правозащитное признание политзаключённого от сообщений СМИ, фиксирует изменение статуса и публикует источники без автоматических догадок.',
        lead: 'Слово «политзаключённый» является не поисковым ярлыком, а серьёзным правозащитным утверждением. Поэтому карточка человека должна показывать не только статус, но и кто его установил, когда источник был проверен и изменился ли статус после освобождения.',
        sections: [
          ['Сообщение о преследовании и статус — не одно и то же', [
            'СМИ, Telegram-канал, родственник или адвокат могут сообщить о задержании, приговоре или переводе. Такое сообщение важно для обнаружения события, но оно не даёт системе права автоматически объявить человека политзаключённым.',
            'В CHUDO статус должен быть связан с конкретным правозащитным источником или отдельным подтверждённым редакционным решением. На странице обязательно сохраняется атрибуция: читатель видит, кем и на каком основании человек указан как действующий или бывший политзаключённый.'
          ]],
          ['Жизненный цикл статуса', [
            'Статус не хранится как одно перезаписываемое слово. Он оформляется последовательностью событий: признание, уточнение, освобождение, изменение на «бывший политзаключённый», спор или отзыв. Это позволяет не терять историю и не смешивать дату события с датой публикации.',
            'Освобождение не стирает сведения о преследовании. Оно меняет текущую категорию, но карточка продолжает хранить подтверждённые задержания, обвинения, приговоры, места заключения и источники.'
          ]],
          ['Почему важны дата и источник', [
            'Списки политзаключённых меняются. Без даты наблюдения даже правильное когда-то утверждение может вводить в заблуждение. Поэтому рядом с ключевыми сведениями должны быть доступны дата последней проверки и ссылка на первоисточник.',
            'При расхождении источников система должна показывать конфликт, а не выбирать наиболее удобную версию. До разрешения конфликта опасные изменения — например, сведения о смерти, здоровье, местонахождении или личности несовершеннолетнего — не публикуются автоматически.'
          ]],
          ['Как пользоваться каталогом', [
            'После публикации реального snapshot каталог позволит искать человека по имени и фамилии, фильтровать по месту заключения, региону и статьям закона, а также переходить к постоянной карточке. Постоянный идентификатор надёжнее одной только ссылки с именем: написание имени может меняться, а идентификатор остаётся прежним.',
            'При цитировании статуса указывайте дату просмотра и источник признания. Не превращайте старый статус в утверждение о текущем положении человека без повторной проверки.'
          ]]
        ]
      },
      repression: {
        eyebrow: 'ПОЛИТИЧЕСКИЕ РЕПРЕССИИ В БЕЛАРУСИ',
        title: 'Политические репрессии в Беларуси: как строится база фактов и хронология',
        description: 'Структура документирования задержаний, уголовных дел, судов, наказаний, мест заключения и освобождений в базе CHUDO с указанием источников и истории изменений.',
        lead: 'Чтобы увидеть масштаб и механизм репрессий, недостаточно хранить отдельные новости. Нужна связанная хронология, где человек, дело, статья закона, суд, наказание и место заключения остаются самостоятельными сущностями с проверяемым происхождением.',
        sections: [
          ['От новости к структурированной записи', [
            'Публикация источника фиксируется как наблюдение. Из неё могут быть извлечены отдельные элементы: дата задержания, статья обвинения, судья, прокурор, вид наказания, учреждение и заявление об освобождении. Каждый элемент должен сохранять собственную ссылку на источник.',
            'Если в одной статье объединены несколько людей или событий, это не должно автоматически создавать одинаковые карточки. Идентичность каждого человека проверяется отдельно, а неоднозначные совпадения отправляются на закрытую редакционную проверку.'
          ]],
          ['Хронология вместо статичного профиля', [
            'Правозащитная карточка меняется со временем. Человека могут перевести в другое учреждение, приговор изменить, дело пересмотреть, а источник — исправить дату. Событийная модель позволяет добавить новое подтверждение, не уничтожая предыдущую запись.',
            'Текущее значение определяется только из действующего и достаточно свежего события. Старое место заключения не должно показываться как текущее, если источник сообщил об этапировании или информация устарела.'
          ]],
          ['Суды, статьи закона и учреждения', [
            'Связанные указатели по статьям закона, судьям, прокурорам, регионам и учреждениям помогают исследовать повторяющиеся практики. Но такие страницы становятся полезными только после появления реальных проверенных записей; пустые или автоматически размноженные страницы не должны занимать место в поисковой выдаче.',
            'CHUDO публикует каталоги как навигацию по доказуемым данным, а не как автоматический рейтинг людей или учреждений. Любое обобщение должно быть отделено от первичных фактов и сопровождаться методологией.'
          ]],
          ['Исправления и воспроизводимость', [
            'Публичный snapshot представляет точное состояние базы на определённый момент. Контрольные суммы файлов позволяют проверить, что опубликованный набор не изменился незаметно. Следующая версия должна иметь новый идентификатор и историю различий.',
            'Исследователь может сослаться на постоянную карточку, дату snapshot и первоисточник. Такой подход делает выводы воспроизводимыми и уменьшает риск распространения устаревших сведений.'
          ]]
        ]
      },
      citation: {
        eyebrow: 'ДЛЯ ЖУРНАЛИСТОВ И ИССЛЕДОВАТЕЛЕЙ',
        title: 'Как проверять и цитировать данные о репрессиях в Беларуси',
        description: 'Практическое руководство по проверке карточек CHUDO, ссылкам на первоисточники, датам snapshot, статусам достоверности и корректному цитированию данных.',
        lead: 'Правильная ссылка на базу — это не просто URL. Хорошая цитата позволяет другому человеку восстановить, какую запись вы видели, когда она была актуальна, откуда взялся конкретный факт и какие ограничения были указаны.',
        sections: [
          ['Минимальный набор для цитаты', [
            'Укажите имя человека так, как оно показано в карточке, постоянный идентификатор записи, конкретный факт или событие, правозащитный статус с атрибуцией, дату просмотра и прямую ссылку на первоисточник. Для исследований также фиксируйте идентификатор публичного snapshot.',
            'Не цитируйте суммарный текст карточки как единый подтверждённый факт. Дата задержания, обвинение, приговор и место заключения могут происходить из разных источников и иметь разный уровень подтверждения.'
          ]],
          ['Как читать метки', [
            '«Подтверждено» означает, что запись прошла установленную проверку CHUDO. «По данным источника» означает точную атрибуцию внешнего утверждения. «Данные расходятся» предупреждает, что опубликованные источники не совпадают. Ни одна из этих меток не должна удаляться из цитаты, если от неё зависит смысл.',
            'Если известен только год или месяц, не дописывайте отсутствующий день. Если текущее местонахождение не подтверждено, не делайте вывод на основании старой записи.'
          ]],
          ['Проверка перед публикацией материала', [
            'Откройте первоисточник, убедитесь, что ссылка относится к тому же человеку, сравните дату источника с датой события и проверьте историю исправлений карточки. Для чувствительных утверждений найдите независимое подтверждение или прямо сообщите читателю, что сведения исходят из одного источника.',
            'Перед публикацией повторно проверьте действующий статус. Освобождение, перевод или пересмотр дела могут произойти после того snapshot, который использовался в черновике.'
          ]],
          ['Исправление собственной публикации', [
            'Если CHUDO обновил запись, это не всегда означает, что старая журналистская публикация была недобросовестной: источник мог измениться позже. Но материал должен получить заметное уточнение, когда новая информация меняет существенный вывод.',
            'Сохраняйте дату исправления, кратко объясняйте изменение и ссылайтесь на актуальную карточку либо историю изменений. Это укрепляет доверие читателей и помогает не распространять устаревшие данные повторно.'
          ]]
        ]
      }
    }
  },
  be: {
    statusTitle: 'Бягучы стан публічнай базы',
    statusPublished: count => `Апублікаваны правяральны snapshot. У публічнай базе цяпер ${count} запісаў пра людзей; для кожнага факта паказваецца паходжанне і стан публікацыі.`,
    statusEmpty: 'Структура базы і метадалогія ўжо адкрытыя, але персанальныя запісы яшчэ не апублікаваныя. CHUDO не замяняе адсутныя даныя ацэнкамі, аўтаматычнымі здагадкамі або непацверджанымі спісамі.',
    updated: 'Абноўлена', related: 'Звязаныя раздзелы',
    links: [['/methodology/','Метадалогія'],['/sources/','Крыніцы'],['/corrections/','Выпраўленні'],['/monitoring/','Маніторынг'],['/reports/','Даклады'],['/prisoners/','Каталог палітвязняў']],
    pages: {
      humanRights: {eyebrow:'ПРАВЫ ЧАЛАВЕКА Ў БЕЛАРУСІ',title:'Правы чалавека ў Беларусі: правяральныя даныя, крыніцы і выпраўленні',description:'Як CHUDO дакументуе парушэнні правоў чалавека ў Беларусі, аддзяляе паведамленні крыніц ад пацверджаных фактаў і захоўвае гісторыю выпраўленняў.',lead:'Праваабарончая база карысная толькі тады, калі чытач разумее паходжанне кожнага сцвярджэння, дату яго праверкі і межы вядомага. Таму CHUDO будуе архіў як сістэму правяральных запісаў, а не як стужку гучных заяў.',sections:[
        ['Што дакументуецца',['Архіў сістэматызуе публічныя звесткі пра палітычна матываваны пераслед: затрыманні, абвінавачанні, суды, пакаранні, месцы зняволення, вызваленні і змены статусу. Падзея, крыніца і дата назірання захоўваюцца асобна.','Паведамленне СМІ не надае чалавеку статус палітвязня. Статус паказваецца толькі як атрыбутаванае рашэнне праваабарончай крыніцы або асобна пацверджаны рэдакцыйны запіс.']],
        ['Як адбываецца праверка',['Матэрыял спачатку становіцца назіраннем крыніцы. Пасля правяраюцца імя, магчымыя супадзенні, даты, артыкулы закона, месца зняволення і супярэчнасці. Неадназначныя асобы і адчувальныя сцвярджэнні не павінны аўтаматычна трапляць у публічную картку.','Апублікаваны запіс атрымлівае пастаянны ідэнтыфікатар, спасылку на першакрыніцу, час атрымання і стан даверу. Істотнае выпраўленне захоўваецца ў гісторыі.']],
        ['Адкрытая нявызначанасць',['Адсутныя звесткі нельга запаўняць здагадкай. Калі вядомы толькі месяц або год, дакладнасць даты не павялічваецца штучна. Старое месца зняволення не паказваецца як актуальнае без новага пацверджання.','Метка «паводле крыніцы» азначае атрыбуцыю, а не самастойную праверку CHUDO. Метка пра разыходжанне даных папярэджвае пра нявырашаны канфлікт.']],
        ['Як паведаміць пра памылку',['Патрэбныя спасылка або ідэнтыфікатар карткі, апісанне спрэчнага поля і крыніца для праверкі. Не дасылайце хатнія адрасы, нумары дакументаў або іншыя лішнія прыватныя даныя.','Значнае выпраўленне павінна паказваць, што, калі і на якой падставе было зменена.']]
      ]},
      politicalPrisoners:{eyebrow:'ПАЛІТВЯЗНІ БЕЛАРУСІ',title:'Палітвязні Беларусі: як правяраецца статус і абнаўляюцца даныя',description:'Як CHUDO аддзяляе праваабарончае прызнанне палітвязня ад паведамленняў СМІ, фіксуе вызваленне і захоўвае атрыбуцыю статусу.',lead:'Статус палітвязня — сур’ёзнае праваабарончае сцвярджэнне. Картка павінна паказваць не толькі катэгорыю, але і крыніцу прызнання, дату назірання і наступныя змены.',sections:[
        ['Паведамленне і статус — розныя рэчы',['СМІ, канал, сваяк або адвакат могуць паведаміць пра затрыманне ці прысуд. Гэта дапамагае выявіць падзею, але не дазваляе сістэме аўтаматычна абвясціць чалавека палітвязнем.','Статус звязваецца з канкрэтнай праваабарончай крыніцай або пацверджаным рэдакцыйным рашэннем; атрыбуцыя заўсёды захоўваецца.']],
        ['Жыццёвы цыкл статусу',['Прызнанне, удакладненне, вызваленне, пераход у катэгорыю былых палітвязняў, спрэчка і адкліканне захоўваюцца як асобныя падзеі.','Вызваленне не сцірае гісторыю пераследу, а змяняе бягучую катэгорыю.']],
        ['Чаму патрэбны дата і крыніца',['Без даты назірання раней правільны статус можа ўводзіць у зман. Ключавыя звесткі павінны мець дату апошняй праверкі і спасылку.','Пры разыходжанні крыніц паказваецца канфлікт. Звесткі пра смерць, здароўе, месцазнаходжанне і непаўналетніх не публікуюцца аўтаматычна.']],
        ['Як карыстацца каталогам',['Пасля публікацыі рэальнага snapshot каталог дазволіць шукаць па імені, месцы зняволення, рэгіёне і артыкулах закона. Пастаянны ID надзейней за адно напісанне імя.','Пры цытаванні пазначайце дату прагляду і крыніцу прызнання; не пераносіце стары статус у сучаснасць без паўторнай праверкі.']]
      ]},
      repression:{eyebrow:'ПАЛІТЫЧНЫЯ РЭПРЭСІІ Ў БЕЛАРУСІ',title:'Палітычныя рэпрэсіі ў Беларусі: база фактаў і храналогія',description:'Як у CHUDO звязваюцца затрыманні, крымінальныя справы, суды, пакаранні, установы і вызваленні з захаваннем крыніц.',lead:'Асобныя навіны не паказваюць механізм рэпрэсій. Для даследавання патрэбная звязаная храналогія, дзе чалавек, справа, артыкул, суд, пакаранне і ўстанова застаюцца асобнымі правяральнымі сутнасцямі.',sections:[
        ['Ад навіны да запісу',['Публікацыя становіцца назіраннем, з якога асобна вылучаюцца дата, артыкул, суддзя, пракурор, пакаранне, установа і паведамленне пра вызваленне. Кожны элемент захоўвае сваю крыніцу.','Супольная публікацыя пра некалькі людзей не павінна аўтаматычна ствараць аднолькавыя карткі; асоба кожнага правяраецца асобна.']],
        ['Храналогія замест статычнага профілю',['Перавод, новы прысуд, этапаванне або выпраўленне крыніцы дадаюцца як новыя падзеі без знішчэння папярэдняй версіі.','Бягучае значэнне выводзіцца толькі з дзейнай і дастаткова свежай падзеі.']],
        ['Суды, артыкулы і ўстановы',['Паказальнікі дапамагаюць вывучаць паўторныя практыкі, але пустыя або масава створаныя старонкі не павінны трапляць у пошук.','Каталог — гэта навігацыя па доказных даных, а не аўтаматычны рэйтынг людзей ці ўстаноў.']],
        ['Выпраўленні і ўзнаўляльнасць',['Публічны snapshot фіксуе стан базы на пэўны момант і мае кантрольныя сумы. Новая версія атрымлівае новы ідэнтыфікатар.','Даследчык можа спаслацца на ID карткі, дату snapshot і першакрыніцу, каб іншы чалавек аднавіў выкарыстаны набор даных.']]
      ]},
      citation:{eyebrow:'ДЛЯ ЖУРНАЛІСТАЎ І ДАСЛЕДЧЫКАЎ',title:'Як правяраць і цытаваць даныя пра рэпрэсіі ў Беларусі',description:'Практычны гід па пастаянных ID, датах snapshot, першакрыніцах, метках даверу і выпраўленнях у базе CHUDO.',lead:'Добрая цытата дазваляе аднавіць, якую версію запісу вы бачылі, калі яна была актуальная, адкуль паходзіць канкрэтны факт і якія абмежаванні былі пазначаныя.',sections:[
        ['Мінімум для цытаты',['Пакажыце імя, пастаянны ID, канкрэтную падзею, статус з атрыбуцыяй, дату прагляду і спасылку на першакрыніцу. Для даследаванняў запішыце таксама ID snapshot.','Не падавайце ўсю картку як адзін пацверджаны факт: яе часткі могуць мець розныя крыніцы і ўзровень праверкі.']],
        ['Як чытаць меткі',['«Пацверджана» азначае рэдакцыйную праверку; «паводле крыніцы» — дакладную атрыбуцыю; «даныя разыходзяцца» — нявырашаны канфлікт.','Не дадавайце дзень да частковай даты і не рабіце выснову пра сучаснае месцазнаходжанне са старога запісу.']],
        ['Праверка перад публікацыяй',['Адкрыйце першакрыніцу, зверайце асобу і даты, праглядзіце гісторыю выпраўленняў. Для адчувальных сцвярджэнняў шукайце незалежнае пацверджанне.','Паўторна праверце бягучы статус перад выхадам матэрыялу: вызваленне або перавод маглі адбыцца пасля выкарыстанага snapshot.']],
        ['Выпраўленне сваёй публікацыі',['Калі новая інфармацыя змяняе істотную выснову, дадайце прыкметнае ўдакладненне з датай і спасылкай на актуальную картку.','Гэта дапамагае не распаўсюджваць састарэлыя звесткі і захоўвае давер аўдыторыі.']]
      ]}
    }
  },
  en: {
    statusTitle:'Current public database status',
    statusPublished: count => `A verifiable snapshot is published. The public database currently contains ${count} person records, each with provenance and publication state.`,
    statusEmpty:'The database structure and methodology are public, but person records have not yet been released. CHUDO does not replace missing evidence with estimates, automated guesses or unverified lists.',
    updated:'Updated', related:'Related sections',
    links:[['/methodology/','Methodology'],['/sources/','Sources'],['/corrections/','Corrections'],['/monitoring/','Monitoring'],['/reports/','Reports'],['/prisoners/','Political-prisoner catalogue']],
    pages:{
      humanRights:{eyebrow:'HUMAN RIGHTS IN BELARUS',title:'Human rights in Belarus: verifiable records, sources and corrections',description:'How CHUDO documents human-rights violations in Belarus, separates source reports from verified facts and preserves a transparent correction history.',lead:'A human-rights database is useful only when readers can see where each claim came from, when it was checked and what remains unknown. CHUDO therefore treats the public archive as a system of verifiable records rather than a stream of headlines.',sections:[
        ['What CHUDO documents',['The archive is designed to structure public information about politically motivated persecution: detentions, charges, court proceedings, sentences, places of detention, releases and later status changes. Events, sources and observation dates remain separate.','A media report does not automatically designate a person as a political prisoner. That status must be explicitly attributed to a human-rights source or supported by a separately confirmed editorial decision.']],
        ['How verification works',['A publication first becomes a source observation. Names, possible identity matches, dates, legal provisions, facilities and conflicts are then checked. Ambiguous identities, future dates and sensitive claims must not automatically become public profiles.','A published record receives a stable identifier. Facts retain source links, acquisition time and confidence state, while material corrections remain visible in the change history.']],
        ['Making uncertainty visible',['Missing data must not be filled by assumption. Month- or year-level dates keep their original precision, and an old facility is not presented as current without fresh evidence.','“According to the source” is attribution, not independent CHUDO verification. A conflict label tells readers that published sources disagree and the discrepancy remains unresolved.']],
        ['Reporting an error',['A useful correction request identifies the profile or stable ID, the disputed field and a source that can be checked. It should not disclose unnecessary home addresses, document numbers or private phone details.','Material corrections should state what changed, when it changed and why, allowing journalists and researchers to understand which version they previously used.']]
      ]},
      politicalPrisoners:{eyebrow:'POLITICAL PRISONERS IN BELARUS',title:'Political prisoners in Belarus: how status and updates are verified',description:'How CHUDO separates political-prisoner designation from media reporting, records release and status changes, and keeps the original attribution visible.',lead:'“Political prisoner” is a serious human-rights designation, not a search label. A responsible profile shows who made the designation, when the source was observed and how the status changed after release.',sections:[
        ['A report and a designation are different',['Media outlets, public channels, relatives or lawyers may report detention or sentencing. Such reports help discover an event but do not authorize an automated political-prisoner designation.','CHUDO links status to a named human-rights source or a confirmed editorial decision and keeps that attribution visible on the profile.']],
        ['Status has a lifecycle',['Recognition, clarification, release, transition to former political prisoner, dispute and retraction are stored as separate events rather than one overwritten word.','Release changes the current category but does not erase the documented history of detention, charges, sentence or imprisonment.']],
        ['Why dates and sources matter',['Political-prisoner lists change. Without an observation date, a once-correct statement can become misleading. Key facts therefore need a last-checked date and a direct source link.','Where sources conflict, the conflict should be shown. Claims about death, health, location or minors require stricter review and must not be published automatically.']],
        ['Using the catalogue responsibly',['Once a real snapshot is released, the catalogue can support name, facility, region and legal-article search. A stable record ID remains reliable even when transliteration or spelling changes.','When citing current status, include the access date and designation source; never carry an old status forward without checking again.']]
      ]},
      repression:{eyebrow:'POLITICAL REPRESSION IN BELARUS',title:'Political repression in Belarus: building a factual timeline',description:'How CHUDO connects detentions, criminal cases, courts, sentences, detention facilities and releases while retaining source-level provenance.',lead:'Individual news items cannot reveal the structure of repression. Research requires a connected timeline in which people, cases, legal provisions, courts, sentences and facilities remain distinct and verifiable entities.',sections:[
        ['From publication to structured record',['A source item becomes an observation from which detention dates, charges, judges, prosecutors, penalties, facilities and release claims may be extracted separately. Each element retains its own source.','A report covering several people must not create identical profiles automatically. Every identity match is evaluated separately and ambiguity goes to private review.']],
        ['A timeline, not a static profile',['Transfers, amended judgments, new source corrections and release events are added without silently destroying the earlier state.','A current value is derived only from an active and sufficiently recent event; stale placement data must not be presented as current.']],
        ['Courts, legal provisions and facilities',['Cross-indexes can expose recurring patterns, but empty or mass-generated pages provide little value and should stay out of search until backed by real published records.','CHUDO catalogues are navigation over evidence, not automated rankings of people or institutions. Analysis must remain distinct from source facts.']],
        ['Corrections and reproducibility',['A public snapshot fixes the database state at a point in time and carries file checksums. A later state receives a new identifier and a documented difference history.','Researchers can cite a stable profile ID, snapshot date and primary source so others can reproduce the evidence set used.']]
      ]},
      citation:{eyebrow:'FOR JOURNALISTS AND RESEARCHERS',title:'How to verify and cite Belarus repression data',description:'A practical guide to CHUDO record IDs, snapshot dates, primary sources, confidence labels and correction history for responsible citation.',lead:'A reliable citation is more than a URL. It enables another person to recover the exact record state, its date, the source of a specific fact and any limitations displayed at the time.',sections:[
        ['Minimum citation elements',['Record the person’s displayed name, stable ID, the specific event or fact, status attribution, access date and direct primary-source link. For research datasets, also record the public snapshot ID.','Do not cite a whole profile as one uniformly verified fact: detention, charges, judgment and placement may rely on different sources and confidence levels.']],
        ['Reading confidence labels',['“Confirmed” indicates CHUDO review; “according to the source” is explicit attribution; “data conflict” means the discrepancy remains unresolved. Preserve these qualifications when they affect meaning.','Do not invent a day for a partial date or infer current location from a stale placement record.']],
        ['Checks before publication',['Open the primary source, confirm identity and dates, and review the profile’s correction history. Seek independent confirmation for sensitive claims or clearly state that only one source reports them.','Recheck current status immediately before publication because release, transfer or review may have occurred after the snapshot used in drafting.']],
        ['Correcting your own article',['When new evidence changes a material conclusion, add a visible correction with a date and a link to the current profile or correction history.','This limits repeated circulation of stale information and strengthens reader trust.']]
      ]}
    }
  },
  pl: {
    statusTitle:'Aktualny stan publicznej bazy',
    statusPublished: count => `Opublikowano weryfikowalny snapshot. Publiczna baza zawiera obecnie ${count} rekordów osób, z informacją o pochodzeniu i stanie publikacji.`,
    statusEmpty:'Struktura bazy i metodologia są już publiczne, lecz rekordy osób nie zostały jeszcze opublikowane. CHUDO nie zastępuje brakujących dowodów szacunkami, automatycznymi domysłami ani niezweryfikowanymi listami.',
    updated:'Zaktualizowano', related:'Powiązane działy',
    links:[['/methodology/','Metodologia'],['/sources/','Źródła'],['/corrections/','Korekty'],['/monitoring/','Monitoring'],['/reports/','Raporty'],['/prisoners/','Katalog więźniów politycznych']],
    pages:{
      humanRights:{eyebrow:'PRAWA CZŁOWIEKA NA BIAŁORUSI',title:'Prawa człowieka na Białorusi: weryfikowalne dane, źródła i korekty',description:'Jak CHUDO dokumentuje naruszenia praw człowieka na Białorusi, oddziela relacje źródeł od potwierdzonych faktów i zachowuje historię korekt.',lead:'Baza praw człowieka ma wartość tylko wtedy, gdy czytelnik widzi pochodzenie każdego twierdzenia, datę weryfikacji i granice wiedzy. Dlatego CHUDO buduje archiwum jako system sprawdzalnych rekordów, a nie strumień nagłówków.',sections:[
        ['Co dokumentuje CHUDO',['Archiwum porządkuje publiczne informacje o prześladowaniach motywowanych politycznie: zatrzymaniach, zarzutach, procesach, karach, miejscach osadzenia, zwolnieniach i zmianach statusu. Zdarzenia, źródła i daty obserwacji pozostają rozdzielone.','Relacja medialna nie nadaje automatycznie statusu więźnia politycznego. Status musi być przypisany do konkretnego źródła praw człowieka lub oddzielnie potwierdzonej decyzji redakcyjnej.']],
        ['Jak działa weryfikacja',['Publikacja najpierw staje się obserwacją źródła. Następnie sprawdzane są tożsamość, daty, przepisy prawa, placówki i sprzeczności. Niejednoznaczne dopasowania oraz dane wrażliwe nie mogą automatycznie tworzyć publicznego profilu.','Opublikowany rekord otrzymuje stały identyfikator, a fakty zachowują link, czas pobrania i poziom zaufania. Istotne korekty pozostają widoczne w historii.']],
        ['Jawna niepewność',['Brakujących danych nie wolno uzupełniać założeniem. Data znana tylko do miesiąca lub roku zachowuje taką precyzję, a stare miejsce osadzenia nie jest przedstawiane jako aktualne bez nowego potwierdzenia.','Etykieta „według źródła” oznacza atrybucję, nie niezależną weryfikację CHUDO. Informacja o rozbieżności ostrzega o nierozwiązanym konflikcie.']],
        ['Jak zgłosić błąd',['Zgłoszenie powinno wskazywać profil lub stały ID, sporne pole i możliwe do sprawdzenia źródło. Nie należy przesyłać zbędnych adresów domowych, numerów dokumentów ani prywatnych telefonów.','Znacząca korekta powinna wskazywać co, kiedy i dlaczego zmieniono.']]
      ]},
      politicalPrisoners:{eyebrow:'WIĘŹNIOWIE POLITYCZNI NA BIAŁORUSI',title:'Więźniowie polityczni na Białorusi: weryfikacja statusu i aktualizacji',description:'Jak CHUDO oddziela uznanie za więźnia politycznego od informacji medialnej, rejestruje zwolnienie i zachowuje źródło statusu.',lead:'„Więzień polityczny” to poważne stwierdzenie z zakresu praw człowieka, a nie etykieta wyszukiwania. Odpowiedzialny profil pokazuje kto dokonał uznania, kiedy źródło sprawdzono i jak status później się zmieniał.',sections:[
        ['Relacja i status to różne rzeczy',['Media, kanały publiczne, krewni lub prawnicy mogą informować o zatrzymaniu czy wyroku. Pomaga to wykryć zdarzenie, ale nie uprawnia systemu do automatycznego nadania statusu.','CHUDO wiąże status z nazwanym źródłem praw człowieka lub potwierdzoną decyzją redakcyjną i zachowuje atrybucję na profilu.']],
        ['Cykl życia statusu',['Uznanie, doprecyzowanie, zwolnienie, przejście do kategorii byłych więźniów politycznych, spór i wycofanie są osobnymi zdarzeniami.','Zwolnienie zmienia bieżącą kategorię, lecz nie usuwa udokumentowanej historii prześladowania.']],
        ['Dlaczego data i źródło są konieczne',['Listy zmieniają się, dlatego dawniej poprawne twierdzenie bez daty może wprowadzać w błąd. Kluczowe fakty potrzebują daty ostatniej kontroli i bezpośredniego linku.','Rozbieżności należy pokazywać, a informacje o śmierci, zdrowiu, lokalizacji i osobach małoletnich wymagają zaostrzonej kontroli.']],
        ['Odpowiedzialne korzystanie z katalogu',['Po opublikowaniu realnego snapshotu katalog umożliwi wyszukiwanie po nazwisku, placówce, regionie i przepisach. Stały ID jest odporny na zmianę transliteracji.','Cytując aktualny status, podaj datę dostępu i źródło uznania; nie przenoś dawnego statusu do teraźniejszości bez ponownej kontroli.']]
      ]},
      repression:{eyebrow:'REPRESJE POLITYCZNE NA BIAŁORUSI',title:'Represje polityczne na Białorusi: baza faktów i chronologia',description:'Jak CHUDO łączy zatrzymania, sprawy karne, sądy, kary, miejsca osadzenia i zwolnienia, zachowując źródło każdego elementu.',lead:'Pojedyncze wiadomości nie pokazują mechanizmu represji. Badania wymagają połączonej chronologii, w której osoba, sprawa, przepis, sąd, kara i placówka pozostają osobnymi weryfikowalnymi obiektami.',sections:[
        ['Od publikacji do rekordu',['Materiał źródłowy staje się obserwacją, z której osobno wyodrębnia się daty, zarzuty, sędziów, prokuratorów, kary, placówki i informacje o zwolnieniu. Każdy element zachowuje własne źródło.','Publikacja dotycząca wielu osób nie może automatycznie tworzyć identycznych profili; każda tożsamość jest sprawdzana oddzielnie.']],
        ['Chronologia zamiast statycznego profilu',['Przeniesienia, zmienione wyroki, korekty źródła i zwolnienia są dodawane jako kolejne zdarzenia bez cichego niszczenia poprzedniej wersji.','Bieżąca wartość wynika wyłącznie z aktywnego i dostatecznie świeżego zdarzenia.']],
        ['Sądy, przepisy i placówki',['Indeksy przekrojowe pomagają badać powtarzalne praktyki, lecz puste lub masowo wygenerowane strony nie powinny trafiać do wyszukiwarki przed pojawieniem się realnych danych.','Katalogi CHUDO są nawigacją po dowodach, a nie automatycznym rankingiem osób i instytucji.']],
        ['Korekty i odtwarzalność',['Publiczny snapshot utrwala stan bazy i zawiera sumy kontrolne plików. Kolejna wersja otrzymuje nowy identyfikator i historię zmian.','Badacz może zacytować stały ID profilu, datę snapshotu i źródło pierwotne, aby inni mogli odtworzyć użyty zestaw danych.']]
      ]},
      citation:{eyebrow:'DLA DZIENNIKARZY I BADACZY',title:'Jak weryfikować i cytować dane o represjach na Białorusi',description:'Praktyczny przewodnik po stałych identyfikatorach CHUDO, datach snapshotów, źródłach pierwotnych, etykietach zaufania i korektach.',lead:'Rzetelny cytat to więcej niż adres URL. Powinien pozwolić odtworzyć dokładny stan rekordu, jego datę, źródło konkretnego faktu oraz widoczne wówczas ograniczenia.',sections:[
        ['Minimalne elementy cytatu',['Zapisz wyświetlane imię i nazwisko, stały ID, konkretne zdarzenie, atrybucję statusu, datę dostępu i bezpośredni link do źródła. W badaniu zanotuj również ID publicznego snapshotu.','Nie cytuj całego profilu jako jednego jednolicie potwierdzonego faktu; jego elementy mogą mieć różne źródła i poziomy weryfikacji.']],
        ['Jak czytać etykiety',['„Potwierdzone” oznacza kontrolę CHUDO, „według źródła” — atrybucję, a „dane rozbieżne” — nierozwiązany konflikt. Zachowuj te zastrzeżenia w cytacie.','Nie dopisuj dnia do daty częściowej i nie wyciągaj wniosku o aktualnej lokalizacji ze starego wpisu.']],
        ['Kontrola przed publikacją',['Otwórz źródło pierwotne, potwierdź tożsamość i daty, sprawdź historię korekt. Dla twierdzeń wrażliwych znajdź niezależne potwierdzenie lub zaznacz, że pochodzą z jednego źródła.','Tuż przed publikacją ponownie sprawdź status, ponieważ zwolnienie lub przeniesienie mogło nastąpić po użytym snapshotcie.']],
        ['Korekta własnego materiału',['Gdy nowa informacja zmienia istotny wniosek, dodaj widoczną korektę z datą i linkiem do aktualnego profilu.','Ogranicza to dalsze rozpowszechnianie nieaktualnych informacji i wzmacnia zaufanie czytelników.']]
      ]}
    }
  }
};

function outputPath(lang, path) {
  const prefix = lang === 'ru' ? '' : lang;
  const clean = String(path).replace(/^\//, '').replace(/\/$/, '');
  return join(out, prefix, clean, 'index.html');
}

function statusHtml(copy) {
  const text = manifest.publication_state === 'PUBLISHED'
    ? copy.statusPublished(manifest.counts?.people || 0)
    : copy.statusEmpty;
  return `<aside class="empty-state authority-status"><h2>${esc(copy.statusTitle)}</h2><p>${esc(text)}</p><p class="record-id">snapshot: ${esc(manifest.snapshot_id || 'unknown')}</p></aside>`;
}

function relatedHtml(lang, copy) {
  return `<section class="profile-section authority-related"><h2>${esc(copy.related)}</h2><div class="view-switch authority-link-list">${copy.links.map(([path,label]) => `<a href="${route(lang,path)}">${esc(label)}</a>`).join('')}</div></section>`;
}

function pageBody(lang, copy, page) {
  const sections = page.sections.map(([heading, paragraphs]) => `<section class="profile-section"><h2>${esc(heading)}</h2>${paragraphs.map(value => `<p>${esc(value)}</p>`).join('')}</section>`).join('');
  return `<article class="container page authority-page" data-authority-page="true"><p class="eyebrow">${esc(page.eyebrow)}</p><h1>${esc(page.title)}</h1><p class="hero-copy authority-lead">${esc(page.lead)}</p><p class="record-id">${esc(copy.updated)}: ${UPDATED}</p>${statusHtml(copy)}${sections}${relatedHtml(lang,copy)}</article>`;
}

let generated = 0;
for (const lang of langs) {
  const copy = COPY[lang];
  for (const definition of PAGES) {
    const page = copy.pages[definition.key];
    await writeText(outputPath(lang, definition.path), layout({
      lang,
      title: page.title,
      description: page.description,
      path: definition.path,
      body: pageBody(lang, copy, page),
      pageType: 'article'
    }));
    generated++;
  }
}

console.log(`AUTHORITY_PAGES_BUILD=PASS pages=${generated} locales=${langs.length} publication_state=${manifest.publication_state}`);
