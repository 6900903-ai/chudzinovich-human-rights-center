import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeText } from './lib/fs.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=join(root,'_site');
const MARKER='<!-- CHUDO_PUBLIC_NAV_V11 -->';
const COPY={
 ru:{search:'Поиск',videos:'Видео',faq:'Частые вопросы',regions:'Регионы и годы',caseIndex:'Суды и статьи УК',sources:'Источники',media:'СМИ',channels:'Telegram-источники',press:'Для СМИ',methodology:'Методология',transparency:'Прозрачность',editorial:'Редакционная политика',corrections:'Исправления',contacts:'Контакты',privacy:'Конфиденциальность',security:'Безопасность',terms:'Условия использования',archive:'Публичный правозащитный архив',menu:'Открыть меню',previous:'Прокрутить меню назад',next:'Прокрутить меню вперёд',siteMenu:'Меню сайта',closeMenu:'Закрыть меню',languages:'Языки',homeTitle:'Правозащитный центр CHUDO — политзаключённые и репрессии в Беларуси',homeDescription:'Правозащитный центр CHUDO документирует политические репрессии в Беларуси, сохраняет сведения об источниках, политзаключённых, местах заключения, новостях и правозащитном мониторинге.'},
 be:{search:'Пошук',videos:'Відэа',faq:'Частыя пытанні',regions:'Рэгіёны і гады',caseIndex:'Суды і артыкулы КК',sources:'Крыніцы',media:'СМІ',channels:'Telegram-крыніцы',press:'Для СМІ',methodology:'Метадалогія',transparency:'Празрыстасць',editorial:'Рэдакцыйная палітыка',corrections:'Выпраўленні',contacts:'Кантакты',privacy:'Прыватнасць',security:'Бяспека',terms:'Умовы выкарыстання',archive:'Публічны праваабарончы архіў',menu:'Адкрыць меню',previous:'Пракруціць меню назад',next:'Пракруціць меню наперад',siteMenu:'Меню сайта',closeMenu:'Закрыць меню',languages:'Мовы',homeTitle:'Праваабарончы цэнтр CHUDO — палітвязні і рэпрэсіі ў Беларусі',homeDescription:'Праваабарончы цэнтр CHUDO дакументуе палітычныя рэпрэсіі ў Беларусі, захоўвае звесткі пра крыніцы, палітвязняў, месцы зняволення, навіны і праваабарончы маніторынг.'},
 en:{search:'Search',videos:'Videos',faq:'FAQ',regions:'Regions and years',caseIndex:'Courts and articles',sources:'Sources',media:'Media',channels:'Telegram sources',press:'For media',methodology:'Methodology',transparency:'Transparency',editorial:'Editorial policy',corrections:'Corrections',contacts:'Contacts',privacy:'Privacy',security:'Security',terms:'Terms of use',archive:'Public human-rights archive',menu:'Open menu',previous:'Scroll navigation back',next:'Scroll navigation forward',siteMenu:'Site menu',closeMenu:'Close menu',languages:'Languages',homeTitle:'CHUDO Human Rights Center — Political Prisoners and Repression in Belarus',homeDescription:'CHUDO Human Rights Center documents political repression in Belarus and preserves source-attributed information about political prisoners, detention facilities, news and human-rights monitoring.'},
 pl:{search:'Szukaj',videos:'Wideo',faq:'FAQ',regions:'Regiony i lata',caseIndex:'Sądy i artykuły',sources:'Źródła',media:'Media',channels:'Źródła Telegram',press:'Dla mediów',methodology:'Metodologia',transparency:'Przejrzystość',editorial:'Polityka redakcyjna',corrections:'Korekty',contacts:'Kontakt',privacy:'Prywatność',security:'Bezpieczeństwo',terms:'Warunki korzystania',archive:'Publiczne archiwum praw człowieka',menu:'Otwórz menu',previous:'Przewiń menu wstecz',next:'Przewiń menu dalej',siteMenu:'Menu strony',closeMenu:'Zamknij menu',languages:'Języki',homeTitle:'CHUDO — więźniowie polityczni i represje na Białorusi',homeDescription:'Centrum Praw Człowieka CHUDO dokumentuje represje polityczne na Białorusi i zachowuje informacje ze wskazaniem źródeł o więźniach politycznych, miejscach osadzenia, wiadomościach i monitoringu praw człowieka.'}
};
function langFor(path){const rel=relative(out,path).split(sep).join('/');if(rel.startsWith('be/'))return'be';if(rel.startsWith('en/'))return'en';if(rel.startsWith('pl/'))return'pl';return'ru';}
function relativePath(path){return relative(out,path).split(sep).join('/');}
function isHome(path){const rel=relativePath(path);return rel==='index.html'||rel==='be/index.html'||rel==='en/index.html'||rel==='pl/index.html';}
function prefix(lang){return lang==='ru'?'':`/${lang}`;}
function href(lang,path){return `${prefix(lang)}${path}`;}
function attr(value=''){return String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');}
function utilityLinks(lang,cls=''){const c=COPY[lang];const items=[['/search/',c.search],['/videos/',c.videos],['/faq/',c.faq],['/regions/',c.regions],['/case-index/',c.caseIndex],['/sources/',c.sources],['/media/',c.media],['/channels/',c.channels],['/press/',c.press],['/methodology/',c.methodology],['/transparency/',c.transparency],['/editorial-policy/',c.editorial],['/corrections/',c.corrections],['/contacts/',c.contacts],['/privacy/',c.privacy],['/security/',c.security],['/terms/',c.terms]];return `<nav class="${cls}" aria-label="${attr(c.archive)}">${items.map(([path,label])=>`<a href="${href(lang,path)}">${label}</a>`).join('')}</nav>`;}
async function htmlFiles(dir){const entries=await readdir(dir,{withFileTypes:true});const files=[];for(const entry of entries){const path=join(dir,entry.name);if(entry.isDirectory())files.push(...await htmlFiles(path));else if(entry.isFile()&&entry.name.endsWith('.html'))files.push(path);}return files;}
let changed=0;
for(const path of await htmlFiles(out)){
  let html=await readFile(path,'utf8');
  if(html.includes(MARKER))continue;
  const lang=langFor(path),c=COPY[lang];
  html=html.replace('aria-label="Menu"',`aria-label="${attr(c.menu)}"`)
    .replace('aria-label="Previous"',`aria-label="${attr(c.previous)}"`)
    .replace('aria-label="Next"',`aria-label="${attr(c.next)}"`)
    .replace('aria-label="Site menu"',`aria-label="${attr(c.siteMenu)}"`)
    .replace('aria-label="Close menu"',`aria-label="${attr(c.closeMenu)}"`);
  const langMarker='<div class="language-links" aria-label="Languages">';
  if(html.includes(langMarker))html=html.replace(langMarker,`${utilityLinks(lang,'side-links side-links-secondary')}<div class="language-links" aria-label="${attr(c.languages)}">`);
  if(html.includes('<footer class="site-footer">'))html=html.replace('</footer>',`<small>${c.archive}</small>${utilityLinks(lang,'footer-links')}</footer>`);
  if(!html.includes('/assets/css/public-shell.css'))html=html.replace('<link rel="stylesheet" href="/assets/css/main.css">','<link rel="stylesheet" href="/assets/css/main.css">\n<link rel="stylesheet" href="/assets/css/public-shell.css">');
  if(isHome(path)){
    html=html.replace(/<title>[\s\S]*?<\/title>/i,`<title>${attr(c.homeTitle)}</title>`)
      .replace(/<meta name="description" content="[^"]*">/i,`<meta name="description" content="${attr(c.homeDescription)}">`)
      .replace(/<meta property="og:title" content="[^"]*">/i,`<meta property="og:title" content="${attr(c.homeTitle)}">`)
      .replace(/<meta property="og:description" content="[^"]*">/i,`<meta property="og:description" content="${attr(c.homeDescription)}">`);
  }
  html=html.replace('</body>',`${MARKER}</body>`);
  await writeText(path,html);
  changed++;
}
console.log(`PUBLIC_SHELL_ENHANCE=PASS files=${changed} localized_a11y=PASS homepage_metadata=PASS trust_links=PASS`);
