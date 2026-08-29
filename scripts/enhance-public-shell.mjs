import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeText } from './lib/fs.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = join(root, '_site');
const MARKER = '<!-- CHUDO_PUBLIC_NAV_V1 -->';

const COPY = {
  ru:{sources:'Источники',methodology:'Методология',corrections:'Исправления',contacts:'Контакты',privacy:'Конфиденциальность',security:'Безопасность',terms:'Условия использования',archive:'Публичный правозащитный архив'},
  be:{sources:'Крыніцы',methodology:'Метадалогія',corrections:'Выпраўленні',contacts:'Кантакты',privacy:'Прыватнасць',security:'Бяспека',terms:'Умовы выкарыстання',archive:'Публічны праваабарончы архіў'},
  en:{sources:'Sources',methodology:'Methodology',corrections:'Corrections',contacts:'Contacts',privacy:'Privacy',security:'Security',terms:'Terms of use',archive:'Public human-rights archive'},
  pl:{sources:'Źródła',methodology:'Metodologia',corrections:'Korekty',contacts:'Kontakt',privacy:'Prywatność',security:'Bezpieczeństwo',terms:'Warunki korzystania',archive:'Publiczne archiwum praw człowieka'}
};

function langFor(path) {
  const rel = relative(out,path).split(sep).join('/');
  if (rel.startsWith('be/')) return 'be';
  if (rel.startsWith('en/')) return 'en';
  if (rel.startsWith('pl/')) return 'pl';
  return 'ru';
}

function prefix(lang) { return lang === 'ru' ? '' : `/${lang}`; }
function href(lang,path) { return `${prefix(lang)}${path}`; }

function utilityLinks(lang, cls='') {
  const c = COPY[lang];
  const items = [
    ['/sources/',c.sources],['/methodology/',c.methodology],['/corrections/',c.corrections],['/contacts/',c.contacts],
    ['/privacy/',c.privacy],['/security/',c.security],['/terms/',c.terms]
  ];
  return `<nav class="${cls}" aria-label="${c.archive}">${items.map(([path,label])=>`<a href="${href(lang,path)}">${label}</a>`).join('')}</nav>`;
}

async function htmlFiles(dir) {
  const entries = await readdir(dir,{withFileTypes:true});
  const files = [];
  for (const entry of entries) {
    const path = join(dir,entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(path);
  }
  return files;
}

let changed = 0;
for (const path of await htmlFiles(out)) {
  let html = await readFile(path,'utf8');
  if (html.includes(MARKER)) continue;
  const lang = langFor(path);
  const c = COPY[lang];

  const langMarker = '<div class="language-links" aria-label="Languages">';
  if (html.includes(langMarker)) {
    html = html.replace(langMarker, `${utilityLinks(lang,'side-links side-links-secondary')}${langMarker}`);
  }

  const footerRe = /<footer class="site-footer"><strong>CHUDO HUMAN RIGHTS CENTER<\/strong><span>([\s\S]*?)<\/span><\/footer>/;
  html = html.replace(footerRe, (_,notice) => `<footer class="site-footer">${MARKER}<strong>CHUDO HUMAN RIGHTS CENTER</strong><small>${c.archive}</small>${utilityLinks(lang,'footer-links')}<span>${notice}</span></footer>`);

  if (!html.includes('/assets/css/public-shell.css')) {
    html = html.replace('<link rel="stylesheet" href="/assets/css/main.css">','<link rel="stylesheet" href="/assets/css/main.css">\n<link rel="stylesheet" href="/assets/css/public-shell.css">');
  }

  await writeText(path,html);
  changed++;
}

console.log(`PUBLIC_SHELL_ENHANCE=PASS files=${changed}`);
