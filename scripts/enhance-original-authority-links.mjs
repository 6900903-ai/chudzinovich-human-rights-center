import { readFile, readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeText } from './lib/fs.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=join(root,'_site');
const STYLE='<link rel="stylesheet" href="/assets/css/search-guides.css">';
const MARKER='data-original-authority-home';
const COPY={
  ru:{guides:'Справочники и исследования',eyebrow:'ОРИГИНАЛЬНЫЕ МАТЕРИАЛЫ CHUDO',title:'Как проверяются политические репрессии',intro:'Собственные справочники CHUDO объясняют критерии статуса, проверку личности и событий, происхождение сведений и правила цитирования правозащитной базы.',links:[['/guides/political-prisoner-status/','Кого называют политзаключённым'],['/guides/verify-repression-record/','Как проверить запись'],['/guides/source-attribution/','Источник, утверждение и факт'],['/guides/cite-the-database/','Как цитировать базу']]},
  be:{guides:'Даведнікі і даследаванні',eyebrow:'АРЫГІНАЛЬНЫЯ МАТЭРЫЯЛЫ CHUDO',title:'Як правяраюцца палітычныя рэпрэсіі',intro:'Уласныя даведнікі CHUDO тлумачаць крытэрыі статусу, праверку асобы і падзей, паходжанне звестак і правілы цытавання праваабарончай базы.',links:[['/guides/political-prisoner-status/','Каго называюць палітвязнем'],['/guides/verify-repression-record/','Як праверыць запіс'],['/guides/source-attribution/','Крыніца, сцвярджэнне і факт'],['/guides/cite-the-database/','Як цытаваць базу']]},
  en:{guides:'Guides and research',eyebrow:'ORIGINAL CHUDO MATERIAL',title:'How political repression records are verified',intro:'Original CHUDO guides explain status criteria, identity and event verification, source provenance and responsible citation of a human-rights database.',links:[['/guides/political-prisoner-status/','Who is called a political prisoner'],['/guides/verify-repression-record/','How to verify a record'],['/guides/source-attribution/','Source, claim and fact'],['/guides/cite-the-database/','How to cite the database']]},
  pl:{guides:'Przewodniki i badania',eyebrow:'ORYGINALNE MATERIAŁY CHUDO',title:'Jak weryfikuje się wpisy o represjach politycznych',intro:'Oryginalne przewodniki CHUDO wyjaśniają kryteria statusu, weryfikację osób i zdarzeń, pochodzenie źródeł oraz odpowiedzialne cytowanie bazy praw człowieka.',links:[['/guides/political-prisoner-status/','Kogo nazywa się więźniem politycznym'],['/guides/verify-repression-record/','Jak zweryfikować wpis'],['/guides/source-attribution/','Źródło, twierdzenie i fakt'],['/guides/cite-the-database/','Jak cytować bazę']]}
};
function esc(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function route(lang,path){return `${lang==='ru'?'':`/${lang}`}${path}`||'/';}
async function htmlFiles(dir){const files=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())files.push(...await htmlFiles(path));else if(entry.isFile()&&entry.name.endsWith('.html'))files.push(path);}return files;}
function pageInfo(file){const rel=relative(out,file).split(sep).join('/');const parts=rel.split('/');let lang='ru';if(['be','en','pl'].includes(parts[0]))lang=parts.shift();const rest=parts.join('/');const path=rest==='index.html'?'/':rest.endsWith('/index.html')?`/${rest.slice(0,-'index.html'.length)}`:`/${rest}`;return{lang,path};}
function homeSection(lang){const c=COPY[lang];const links=c.links.map(([path,label])=>`<a href="${route(lang,path)}">${esc(label)}</a>`).join('');return`<section class="container original-authority-home" ${MARKER}><p class="eyebrow">${esc(c.eyebrow)}</p><h2>${esc(c.title)}</h2><p>${esc(c.intro)}</p><div class="original-authority-links">${links}</div><p><a class="secondary-btn" href="${route(lang,'/guides/')}">${esc(c.guides)}</a></p></section>`;}
let files=0,homepages=0,footerLinks=0,styles=0;
for(const file of await htmlFiles(out)){
  const {lang,path}=pageInfo(file);let html=await readFile(file,'utf8');if(!html.includes(STYLE)){html=html.replace('</head>',`${STYLE}\n</head>`);styles++;}
  if(path==='/'&&!html.includes(MARKER)){html=html.replace('</main>',`${homeSection(lang)}\n</main>`);homepages++;}
  if(!html.includes('data-guides-link')&&html.includes('</footer>')){html=html.replace('</footer>',`<a data-guides-link href="${route(lang,'/guides/')}">${esc(COPY[lang].guides)}</a></footer>`);footerLinks++;}
  await writeText(file,html);files++;
}
console.log(`ORIGINAL_AUTHORITY_LINKS=PASS files=${files} homepages=${homepages} footer_links=${footerLinks} styles=${styles}`);
