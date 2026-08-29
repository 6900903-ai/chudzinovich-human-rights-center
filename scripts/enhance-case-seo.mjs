import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeText } from './lib/fs.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=join(root,'_site');
const PAGES={
 ru:{
  '/case-index/':['Суды, судьи, прокуроры и статьи УК Беларуси — CHUDO','Публичный индекс CHUDO по судебным делам политических репрессий в Беларуси: статьи УК, судьи, прокуроры и связанные карточки людей.'],
  '/criminal-code/':['Статьи УК в делах о политических репрессиях Беларуси — CHUDO','Статьи Уголовного кодекса, которые встречаются в опубликованных карточках дел о политических репрессиях в Беларуси, со ссылками на связанные записи CHUDO.'],
  '/judges/':['Судьи в делах о политических репрессиях Беларуси — CHUDO','Публичный индекс имён судей, встречающихся в опубликованных судебных событиях CHUDO о политических репрессиях в Беларуси.'],
  '/prosecutors/':['Прокуроры в делах о политических репрессиях Беларуси — CHUDO','Публичный индекс имён прокуроров, встречающихся в опубликованных судебных событиях CHUDO о политических репрессиях в Беларуси.']
 },
 be:{
  '/case-index/':['Суды, суддзі, пракуроры і артыкулы КК Беларусі — CHUDO','Публічны індэкс CHUDO па судовых справах палітычных рэпрэсій у Беларусі: артыкулы КК, суддзі, пракуроры і звязаныя карткі.'],
  '/criminal-code/':['Артыкулы КК у справах палітычных рэпрэсій Беларусі — CHUDO','Артыкулы Крымінальнага кодэкса ў апублікаваных картках спраў аб палітычных рэпрэсіях у Беларусі.'],
  '/judges/':['Суддзі ў справах палітычных рэпрэсій Беларусі — CHUDO','Публічны індэкс імёнаў суддзяў у апублікаваных судовых падзеях CHUDO.'],
  '/prosecutors/':['Пракуроры ў справах палітычных рэпрэсій Беларусі — CHUDO','Публічны індэкс імёнаў пракурораў у апублікаваных судовых падзеях CHUDO.']
 },
 en:{
  '/case-index/':['Belarus courts, judges, prosecutors and Criminal Code cases — CHUDO','CHUDO public index of Criminal Code articles, judges and prosecutors appearing in published political-repression cases in Belarus.'],
  '/criminal-code/':['Criminal Code articles in Belarus political-repression cases — CHUDO','Criminal Code articles appearing in published CHUDO records on political repression in Belarus, linked to relevant public profiles.'],
  '/judges/':['Judges in Belarus political-repression cases — CHUDO','Public index of judges named in published CHUDO judicial events concerning political repression in Belarus.'],
  '/prosecutors/':['Prosecutors in Belarus political-repression cases — CHUDO','Public index of prosecutors named in published CHUDO judicial events concerning political repression in Belarus.']
 },
 pl:{
  '/case-index/':['Sądy, sędziowie, prokuratorzy i artykuły karne Białorusi — CHUDO','Publiczny indeks CHUDO: artykuły kodeksu karnego, sędziowie i prokuratorzy występujący w opublikowanych sprawach represji politycznych na Białorusi.'],
  '/criminal-code/':['Artykuły kodeksu karnego w sprawach represji na Białorusi — CHUDO','Artykuły kodeksu karnego występujące w publicznych rekordach CHUDO dotyczących represji politycznych na Białorusi.'],
  '/judges/':['Sędziowie w sprawach represji politycznych na Białorusi — CHUDO','Publiczny indeks sędziów wymienionych w opublikowanych wydarzeniach sądowych CHUDO.'],
  '/prosecutors/':['Prokuratorzy w sprawach represji politycznych na Białorusi — CHUDO','Publiczny indeks prokuratorów wymienionych w opublikowanych wydarzeniach sądowych CHUDO.']
 }
};
function esc(value=''){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function fileFor(lang,path){const prefix=lang==='ru'?'':lang;return join(out,prefix,path.replace(/^\//,'').replace(/\/$/,''),'index.html');}
let count=0;
for(const [lang,pages] of Object.entries(PAGES))for(const [path,[title,description]] of Object.entries(pages)){const file=fileFor(lang,path);let html=await readFile(file,'utf8');html=html.replace(/<title>[\s\S]*?<\/title>/i,`<title>${esc(title)}</title>`).replace(/<meta name="description" content="[^"]*">/i,`<meta name="description" content="${esc(description)}">`).replace(/<meta property="og:title" content="[^"]*">/i,`<meta property="og:title" content="${esc(title)}">`).replace(/<meta property="og:description" content="[^"]*">/i,`<meta property="og:description" content="${esc(description)}">`);await writeText(file,html);count++;}
console.log(`CASE_SEO_ENHANCE=PASS pages=${count}`);
