import { deflateSync } from 'node:zlib';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeText } from './lib/fs.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=join(root,'_site');
const SITE='https://chudzinovich.pp.ua';
const BUILD_DATE='2026-08-29';
const MARKER='<!-- CHUDO_SEARCH_AUTHORITY_V1 -->';
const SOCIAL=`${SITE}/assets/brand/social-card.png`;
const ICON=`${SITE}/assets/brand/icon-512.png`;

const COPY={
  ru:{policy:'Редакционная политика',rss:'Новости CHUDO — RSS',imageAlt:'Правозащитный центр CHUDO — документирование политических репрессий в Беларуси'},
  be:{policy:'Рэдакцыйная палітыка',rss:'Навіны CHUDO — RSS',imageAlt:'Праваабарончы цэнтр CHUDO — дакументаванне палітычных рэпрэсій у Беларусі'},
  en:{policy:'Editorial policy',rss:'CHUDO News — RSS',imageAlt:'CHUDO Human Rights Center — documenting political repression in Belarus'},
  pl:{policy:'Polityka redakcyjna',rss:'Aktualności CHUDO — RSS',imageAlt:'Centrum Praw Człowieka CHUDO — dokumentowanie represji politycznych na Białorusi'}
};

const SEO={
  ru:{
    '/': ['Правозащитный центр CHUDO — политзаключённые и репрессии в Беларуси','Правозащитный центр CHUDO документирует политические репрессии в Беларуси, сохраняет проверяемые источники, имена, хронологии и материалы помощи.'],
    '/about/':['О Правозащитном центре CHUDO','Миссия, принципы и публичная работа Правозащитного центра CHUDO по документированию политических репрессий и сохранению имён.'],
    '/methodology/':['Методология документирования политических репрессий','Как CHUDO проверяет личности, даты, статусы, источники и противоречия при ведении публичной правозащитной базы по Беларуси.'],
    '/editorial-policy/':['Редакционная политика и стандарты проверки CHUDO','Как CHUDO отделяет сообщения источников от подтверждённых фактов, проверяет сведения, исправляет ошибки и защищает персональные данные.'],
    '/sources/':['Источники данных о политических репрессиях в Беларуси','Публичные правозащитные, медийные, Telegram- и видеoисточники, используемые CHUDO с явной атрибуцией и разными уровнями проверки.'],
    '/corrections/':['Исправления и обновления правозащитной базы CHUDO','Правила исправления ошибок, обновления статусов, работы с противоречивыми источниками и сохранения истории изменений в базе CHUDO.'],
    '/help/':['Как помочь политзаключённым и репрессированным в Беларуси','Практические способы поддержки политзаключённых и их семей: проверка актуальных данных, письма, публичность и безопасная помощь.'],
    '/monitoring/':['Мониторинг политических репрессий в Беларуси','Мониторинг задержаний, судов, приговоров, мест заключения и других форм политически мотивированного преследования в Беларуси.'],
    '/reports/':['Доклады о политических репрессиях в Беларуси','Доклады, обзоры и документированные материалы CHUDO о политически мотивированных преследованиях, судах и местах заключения.'],
    '/news/':['Новости прав человека и политических репрессий в Беларуси','Новости и материалы о правах человека, политзаключённых, судах и репрессиях в Беларуси с указанием источников и ссылками на оригиналы.'],
    '/media/':['Белорусские СМИ и проверенные публичные источники','Каталог белорусских СМИ и публичных источников, используемых для обнаружения материалов с обязательной ссылкой на первоисточник.'],
    '/channels/':['Telegram-источники о Беларуси и политических репрессиях','Каталог зарегистрированных Telegram-источников CHUDO. Публикации сохраняют авторство канала и не выдаются за подтверждённые факты центра.'],
    '/videos/':['Видео CHUDO о правах человека и Беларуси','Видео Правозащитного центра CHUDO о политических репрессиях, политзаключённых, общественных событиях и документировании нарушений прав человека.'],
    '/faq/':['Вопросы о политзаключённых и репрессиях в Беларуси','Ответы CHUDO на частые вопросы о статусах, источниках, проверке данных, исправлениях и безопасной поддержке политзаключённых.'],
    '/privacy/':['Конфиденциальность и защита персональных данных CHUDO','Как Правозащитный центр CHUDO обрабатывает публичные сведения, ограничивает публикацию чувствительных данных и защищает частную жизнь.'],
    '/security/':['Безопасность сайта и сообщение об уязвимости CHUDO','Правила ответственного сообщения об уязвимостях сайта CHUDO, границы публичных данных и меры защиты посетителей и источников.'],
    '/contacts/':['Контакты Правозащитного центра CHUDO','Контактная страница Правозащитного центра CHUDO для сообщений об ошибках, предложений сотрудничества, запросов СМИ и вопросов безопасности.']
  },
  be:{
    '/':['Праваабарончы цэнтр CHUDO — палітвязні і рэпрэсіі ў Беларусі','Праваабарончы цэнтр CHUDO дакументуе палітычныя рэпрэсіі ў Беларусі, захоўвае правяральныя крыніцы, імёны, храналогіі і матэрыялы дапамогі.'],
    '/about/':['Пра Праваабарончы цэнтр CHUDO','Місія, прынцыпы і публічная праца CHUDO па дакументаванні палітычных рэпрэсій і захаванні імёнаў.'],
    '/methodology/':['Метадалогія дакументавання палітычных рэпрэсій','Як CHUDO правярае асобы, даты, статусы, крыніцы і супярэчнасці пры вядзенні публічнай праваабарончай базы па Беларусі.'],
    '/editorial-policy/':['Рэдакцыйная палітыка і стандарты праверкі CHUDO','Як CHUDO аддзяляе паведамленні крыніц ад пацверджаных фактаў, правярае звесткі, выпраўляе памылкі і абараняе персанальныя даныя.'],
    '/sources/':['Крыніцы даных пра палітычныя рэпрэсіі ў Беларусі','Публічныя праваабарончыя, медыйныя, Telegram- і відэакрыніцы CHUDO з выразнай атрыбуцыяй і рознымі ўзроўнямі праверкі.'],
    '/corrections/':['Выпраўленні і абнаўленні праваабарончай базы CHUDO','Правілы выпраўлення памылак, абнаўлення статусаў, працы з супярэчлівымі крыніцамі і захавання гісторыі змен.'],
    '/help/':['Як дапамагчы палітвязням і рэпрэсаваным у Беларусі','Практычныя спосабы падтрымкі палітвязняў і іх сем’яў: праверка актуальных даных, лісты, публічнасць і бяспечная дапамога.'],
    '/monitoring/':['Маніторынг палітычных рэпрэсій у Беларусі','Маніторынг затрыманняў, судоў, прысудаў, месцаў зняволення і іншых форм палітычна матываванага пераследу ў Беларусі.'],
    '/reports/':['Даклады пра палітычныя рэпрэсіі ў Беларусі','Даклады, агляды і дакументаваныя матэрыялы CHUDO пра палітычна матываваны пераслед, суды і месцы зняволення.'],
    '/news/':['Навіны правоў чалавека і палітычных рэпрэсій у Беларусі','Навіны і матэрыялы пра правы чалавека, палітвязняў, суды і рэпрэсіі ў Беларусі з указаннем крыніц і спасылкамі на арыгіналы.'],
    '/media/':['Беларускія СМІ і правераныя публічныя крыніцы','Каталог беларускіх СМІ і публічных крыніц для выяўлення матэрыялаў з абавязковай спасылкай на першакрыніцу.'],
    '/channels/':['Telegram-крыніцы пра Беларусь і палітычныя рэпрэсіі','Каталог зарэгістраваных Telegram-крыніц CHUDO. Публікацыі захоўваюць аўтарства канала і не выдаюцца за пацверджаныя факты цэнтра.'],
    '/videos/':['Відэа CHUDO пра правы чалавека і Беларусь','Відэа CHUDO пра палітычныя рэпрэсіі, палітвязняў, грамадскія падзеі і дакументаванне парушэнняў правоў чалавека.'],
    '/faq/':['Пытанні пра палітвязняў і рэпрэсіі ў Беларусі','Адказы CHUDO на частыя пытанні пра статусы, крыніцы, праверку даных, выпраўленні і бяспечную падтрымку палітвязняў.'],
    '/privacy/':['Прыватнасць і абарона персанальных даных CHUDO','Як CHUDO апрацоўвае публічныя звесткі, абмяжоўвае публікацыю адчувальных даных і абараняе прыватнае жыццё.'],
    '/security/':['Бяспека сайта і паведамленне пра ўразлівасць CHUDO','Правілы адказнага паведамлення пра ўразлівасці сайта CHUDO, межы публічных даных і меры абароны наведвальнікаў.'],
    '/contacts/':['Кантакты Праваабарончага цэнтра CHUDO','Кантактная старонка CHUDO для паведамленняў пра памылкі, прапаноў супрацоўніцтва, запытаў СМІ і пытанняў бяспекі.']
  },
  en:{
    '/':['CHUDO Human Rights Center — Political Prisoners and Repression in Belarus','CHUDO Human Rights Center documents political repression in Belarus and preserves verifiable sources, names, timelines and practical support information.'],
    '/about/':['About CHUDO Human Rights Center','The mission, principles and public work of CHUDO Human Rights Center in documenting political repression and preserving names.'],
    '/methodology/':['Methodology for Documenting Political Repression','How CHUDO verifies identities, dates, statuses, sources and conflicts while maintaining a public human-rights database on Belarus.'],
    '/editorial-policy/':['CHUDO Editorial Policy and Verification Standards','How CHUDO separates source reports from confirmed facts, verifies information, corrects errors and protects personal data.'],
    '/sources/':['Sources on Political Repression in Belarus','Public human-rights, media, Telegram and video sources used by CHUDO with explicit attribution and distinct verification levels.'],
    '/corrections/':['Corrections and Updates to the CHUDO Database','Rules for correcting errors, updating statuses, handling conflicting sources and preserving the public history of material changes.'],
    '/help/':['How to Support Political Prisoners in Belarus','Practical ways to support political prisoners and their families through current information, letters, visibility and safer assistance.'],
    '/monitoring/':['Monitoring Political Repression in Belarus','Monitoring detentions, trials, sentences, detention facilities and other forms of politically motivated persecution in Belarus.'],
    '/reports/':['Reports on Political Repression in Belarus','CHUDO reports, reviews and documented material on politically motivated persecution, courts and detention facilities in Belarus.'],
    '/news/':['Belarus Human Rights and Political Repression News','News and source material on human rights, political prisoners, courts and repression in Belarus with attribution and original links.'],
    '/media/':['Belarus Media and Verified Public Sources','A directory of Belarus media and public sources used to discover material while preserving clear links to the original publisher.'],
    '/channels/':['Telegram Sources on Belarus and Political Repression','A directory of registered CHUDO Telegram sources. Posts retain channel attribution and are not presented as independently verified CHUDO facts.'],
    '/videos/':['CHUDO Videos on Human Rights and Belarus','CHUDO Human Rights Center videos about political repression, political prisoners, public events and documentation of human-rights violations.'],
    '/faq/':['Questions About Political Prisoners and Repression in Belarus','CHUDO answers to common questions about statuses, sources, verification, corrections and safer support for political prisoners.'],
    '/privacy/':['CHUDO Privacy and Personal Data Protection','How CHUDO handles public information, limits the publication of sensitive data and protects the privacy of people and visitors.'],
    '/security/':['CHUDO Website Security and Vulnerability Reporting','How to report a vulnerability responsibly, the boundaries of public data and the measures used to protect visitors and sources.'],
    '/contacts/':['Contact CHUDO Human Rights Center','Contact CHUDO Human Rights Center to report an error, propose cooperation, submit a media inquiry or raise a security concern.']
  },
  pl:{
    '/':['Centrum Praw Człowieka CHUDO — Więźniowie Polityczni i Represje na Białorusi','Centrum Praw Człowieka CHUDO dokumentuje represje polityczne na Białorusi oraz zachowuje weryfikowalne źródła, nazwiska i chronologie.'],
    '/about/':['O Centrum Praw Człowieka CHUDO','Misja, zasady i publiczna działalność CHUDO w zakresie dokumentowania represji politycznych i zachowania nazwisk.'],
    '/methodology/':['Metodologia Dokumentowania Represji Politycznych','Jak CHUDO weryfikuje osoby, daty, statusy, źródła i sprzeczności podczas prowadzenia publicznej bazy praw człowieka dotyczącej Białorusi.'],
    '/editorial-policy/':['Polityka Redakcyjna i Standardy Weryfikacji CHUDO','Jak CHUDO oddziela doniesienia źródłowe od potwierdzonych faktów, weryfikuje informacje, koryguje błędy i chroni dane osobowe.'],
    '/sources/':['Źródła Danych o Represjach Politycznych na Białorusi','Publiczne źródła praw człowieka, media, Telegram i wideo używane przez CHUDO z wyraźnym przypisaniem i różnymi poziomami weryfikacji.'],
    '/corrections/':['Korekty i Aktualizacje Bazy CHUDO','Zasady korygowania błędów, aktualizacji statusów, obsługi sprzecznych źródeł i zachowania historii istotnych zmian.'],
    '/help/':['Jak Pomóc Więźniom Politycznym na Białorusi','Praktyczne sposoby wspierania więźniów politycznych i ich rodzin poprzez aktualne informacje, listy, widoczność i bezpieczniejszą pomoc.'],
    '/monitoring/':['Monitoring Represji Politycznych na Białorusi','Monitoring zatrzymań, procesów, wyroków, miejsc osadzenia i innych form prześladowania motywowanego politycznie na Białorusi.'],
    '/reports/':['Raporty o Represjach Politycznych na Białorusi','Raporty, przeglądy i udokumentowane materiały CHUDO o prześladowaniach politycznych, sądach i miejscach osadzenia.'],
    '/news/':['Wiadomości o Prawach Człowieka i Represjach na Białorusi','Wiadomości o prawach człowieka, więźniach politycznych, sądach i represjach na Białorusi z przypisaniem źródeł i linkami do oryginałów.'],
    '/media/':['Białoruskie Media i Zweryfikowane Źródła Publiczne','Katalog białoruskich mediów i źródeł publicznych wykorzystywanych do wyszukiwania materiałów z linkiem do pierwotnego wydawcy.'],
    '/channels/':['Źródła Telegram o Białorusi i Represjach Politycznych','Katalog zarejestrowanych źródeł Telegram CHUDO. Wpisy zachowują autorstwo kanału i nie są przedstawiane jako niezależnie potwierdzone fakty.'],
    '/videos/':['Filmy CHUDO o Prawach Człowieka i Białorusi','Filmy CHUDO o represjach politycznych, więźniach politycznych, wydarzeniach publicznych i dokumentowaniu naruszeń praw człowieka.'],
    '/faq/':['Pytania o Więźniów Politycznych i Represje na Białorusi','Odpowiedzi CHUDO na pytania o statusy, źródła, weryfikację, korekty i bezpieczniejsze wspieranie więźniów politycznych.'],
    '/privacy/':['Prywatność i Ochrona Danych Osobowych CHUDO','Jak CHUDO przetwarza informacje publiczne, ogranicza publikację danych wrażliwych i chroni prywatność osób oraz odwiedzających.'],
    '/security/':['Bezpieczeństwo Serwisu i Zgłaszanie Podatności CHUDO','Zasady odpowiedzialnego zgłaszania podatności, granice danych publicznych i środki ochrony odwiedzających oraz źródeł.'],
    '/contacts/':['Kontakt z Centrum Praw Człowieka CHUDO','Kontakt z CHUDO w sprawie błędu, współpracy, zapytania medialnego lub problemu dotyczącego bezpieczeństwa serwisu.']
  }
};

const FONT={
  'A':['01110','10001','10001','11111','10001','10001','10001'],
  'C':['01111','10000','10000','10000','10000','10000','01111'],
  'D':['11110','10001','10001','10001','10001','10001','11110'],
  'E':['11111','10000','10000','11110','10000','10000','11111'],
  'G':['01111','10000','10000','10111','10001','10001','01111'],
  'H':['10001','10001','10001','11111','10001','10001','10001'],
  'I':['11111','00100','00100','00100','00100','00100','11111'],
  'M':['10001','11011','10101','10101','10001','10001','10001'],
  'N':['10001','11001','10101','10011','10001','10001','10001'],
  'O':['01110','10001','10001','10001','10001','10001','01110'],
  'R':['11110','10001','10001','11110','10100','10010','10001'],
  'S':['01111','10000','10000','01110','00001','00001','11110'],
  'T':['11111','00100','00100','00100','00100','00100','00100'],
  'U':['10001','10001','10001','10001','10001','10001','01110'],
  ' ':['00000','00000','00000','00000','00000','00000','00000']
};

async function htmlFiles(dir){const entries=await readdir(dir,{withFileTypes:true});const files=[];for(const entry of entries){const path=join(dir,entry.name);if(entry.isDirectory())files.push(...await htmlFiles(path));else if(entry.isFile()&&entry.name.endsWith('.html'))files.push(path);}return files;}
function pageInfo(file){const rel=relative(out,file).split(sep).join('/');const parts=rel.split('/');let lang='ru';if(['be','en','pl'].includes(parts[0])){lang=parts.shift();}const rest=parts.join('/');let path='/';if(rest==='index.html')path='/';else if(rest.endsWith('/index.html'))path=`/${rest.slice(0,-'index.html'.length)}`;else path=`/${rest}`;return{lang,path,rel};}
function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function escapeReg(value=''){return String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function setTitle(html,value){const tag=`<title>${escapeHtml(value)}</title>`;return /<title>[\s\S]*?<\/title>/i.test(html)?html.replace(/<title>[\s\S]*?<\/title>/i,tag):html.replace('</head>',`${tag}\n</head>`);}
function setMetaName(html,name,content){const re=new RegExp(`<meta\\s+[^>]*name=["']${escapeReg(name)}["'][^>]*>`,`i`);const tag=`<meta name="${escapeHtml(name)}" content="${escapeHtml(content)}">`;return re.test(html)?html.replace(re,tag):html.replace('</head>',`${tag}\n</head>`);}
function setMetaProperty(html,property,content){const re=new RegExp(`<meta\\s+[^>]*property=["']${escapeReg(property)}["'][^>]*>`,`i`);const tag=`<meta property="${escapeHtml(property)}" content="${escapeHtml(content)}">`;return re.test(html)?html.replace(re,tag):html.replace('</head>',`${tag}\n</head>`);}
function upsertLink(html,rel,href,extra=''){const re=new RegExp(`<link\\s+[^>]*rel=["'][^"']*\\b${escapeReg(rel)}\\b[^"']*["'][^>]*>`,`i`);const tag=`<link rel="${escapeHtml(rel)}" href="${escapeHtml(href)}"${extra}>`;return re.test(html)?html.replace(re,tag):html.replace('</head>',`${tag}\n</head>`);}
function locale(lang){return({ru:'ru_RU',be:'be_BY',en:'en_US',pl:'pl_PL'})[lang];}
function localizedRoute(lang,path){return `${lang==='ru'?'':`/${lang}`}${path}`||'/';}
function footerLink(html,lang){if(html.includes('data-editorial-policy-link'))return html;const link=`<a data-editorial-policy-link href="${localizedRoute(lang,'/editorial-policy/')}">${escapeHtml(COPY[lang].policy)}</a>`;return html.replace('</footer>',`${link}</footer>`);}

function crc32(buffer){let crc=0xffffffff;for(const byte of buffer){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return(crc^0xffffffff)>>>0;}
function pngChunk(type,data=Buffer.alloc(0)){const name=Buffer.from(type,'ascii');const length=Buffer.alloc(4);length.writeUInt32BE(data.length);const checksum=Buffer.alloc(4);checksum.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([length,name,data,checksum]);}
function encodePng(width,height,pixels){const stride=width*4;const raw=Buffer.alloc((stride+1)*height);for(let y=0;y<height;y++){const offset=y*(stride+1);raw[offset]=0;pixels.copy(raw,offset+1,y*stride,(y+1)*stride);}const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),pngChunk('IHDR',ihdr),pngChunk('IDAT',deflateSync(raw,{level:9})),pngChunk('IEND')]);}
function image(width,height){return{width,height,pixels:Buffer.alloc(width*height*4)};}
function pixel(img,x,y,r,g,b,a=255){if(x<0||y<0||x>=img.width||y>=img.height)return;const i=(y*img.width+x)*4;img.pixels[i]=r;img.pixels[i+1]=g;img.pixels[i+2]=b;img.pixels[i+3]=a;}
function rect(img,x,y,w,h,color){for(let yy=Math.max(0,y);yy<Math.min(img.height,y+h);yy++)for(let xx=Math.max(0,x);xx<Math.min(img.width,x+w);xx++)pixel(img,xx,yy,...color);}
function drawText(img,text,x,y,scale,color){let cursor=x;for(const char of text){const glyph=FONT[char]||FONT[' '];for(let row=0;row<glyph.length;row++)for(let col=0;col<5;col++)if(glyph[row][col]==='1')rect(img,cursor+col*scale,y+row*scale,scale,scale,color);cursor+=6*scale;}return cursor;}
function gradientImage(width,height){const img=image(width,height);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const t=x/Math.max(1,width-1);const glow=Math.max(0,1-Math.hypot((x-width*.78)/(width*.55),(y-height*.22)/(height*.8)));const r=Math.round(10*(1-t)+4*t+glow*7);const g=Math.round(37*(1-t)+120*t+glow*45);const b=Math.round(64*(1-t)+87*t+glow*28);pixel(img,x,y,r,g,b,255);}return img;}
async function writeBrandAssets(){
  const dir=join(out,'assets','brand');await mkdir(dir,{recursive:true});
  const social=gradientImage(1200,630);rect(social,48,48,1104,8,[16,185,129,255]);rect(social,48,574,1104,8,[16,185,129,255]);drawText(social,'CHUDO',60,160,36,[255,255,255,255]);drawText(social,'HUMAN RIGHTS CENTER',144,438,8,[181,255,225,255]);await writeFile(join(dir,'social-card.png'),encodePng(social.width,social.height,social.pixels));
  const icon=gradientImage(512,512);rect(icon,26,26,460,10,[16,185,129,255]);rect(icon,26,476,460,10,[16,185,129,255]);drawText(icon,'C',106,74,60,[255,255,255,255]);drawText(icon,'HR',142,390,18,[181,255,225,255]);await writeFile(join(dir,'icon-512.png'),encodePng(icon.width,icon.height,icon.pixels));
  const favicon=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0A2540"/><path d="M48 18c-4-5-9-8-16-8C19 10 10 19 10 32s9 22 22 22c7 0 12-3 16-8l-8-7c-2 3-5 5-9 5-7 0-11-5-11-12s4-12 11-12c4 0 7 2 9 5z" fill="#fff"/><path d="M50 10v12H38" fill="none" stroke="#10B981" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>\n`;
  await writeText(join(dir,'favicon.svg'),favicon);
  const manifest={name:'CHUDO Human Rights Center',short_name:'CHUDO HRC',description:'Independent human-rights documentation and political repression monitoring.',start_url:'/',scope:'/',display:'standalone',background_color:'#F8FAFC',theme_color:'#0A2540',icons:[{src:'/assets/brand/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'},{src:'/assets/brand/favicon.svg',sizes:'any',type:'image/svg+xml'}]};
  await writeText(join(out,'manifest.webmanifest'),JSON.stringify(manifest,null,2)+'\n');
}

await writeBrandAssets();
let optimized=0,identityPages=0,footerLinks=0;
for(const file of await htmlFiles(out)){
  if(file.endsWith(`${sep}404.html`))continue;
  const {lang,path}=pageInfo(file);let html=await readFile(file,'utf8');
  const meta=SEO[lang]?.[path];
  if(meta){html=setTitle(html,meta[0]);html=setMetaName(html,'description',meta[1]);html=setMetaProperty(html,'og:title',meta[0]);html=setMetaProperty(html,'og:description',meta[1]);html=setMetaName(html,'twitter:title',meta[0]);html=setMetaName(html,'twitter:description',meta[1]);optimized++;}
  const title=(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||'CHUDO Human Rights Center').replace(/<[^>]+>/g,'');
  const description=html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)?.[1]||'';
  html=setMetaName(html,'author','CHUDO Human Rights Center');
  html=setMetaName(html,'theme-color','#0A2540');
  html=setMetaName(html,'twitter:card','summary_large_image');
  html=setMetaName(html,'twitter:title',meta?.[0]||title);
  html=setMetaName(html,'twitter:description',meta?.[1]||description);
  html=setMetaName(html,'twitter:image',SOCIAL);
  html=setMetaProperty(html,'og:site_name','CHUDO Human Rights Center');
  html=setMetaProperty(html,'og:locale',locale(lang));
  html=setMetaProperty(html,'og:image',SOCIAL);
  html=setMetaProperty(html,'og:image:type','image/png');
  html=setMetaProperty(html,'og:image:width','1200');
  html=setMetaProperty(html,'og:image:height','630');
  html=setMetaProperty(html,'og:image:alt',COPY[lang].imageAlt);
  html=upsertLink(html,'icon','/assets/brand/favicon.svg',' type="image/svg+xml"');
  html=upsertLink(html,'apple-touch-icon','/assets/brand/icon-512.png',' sizes="512x512"');
  html=upsertLink(html,'manifest','/manifest.webmanifest');
  if(!html.includes('type="application/rss+xml"'))html=html.replace('</head>',`<link rel="alternate" type="application/rss+xml" title="${escapeHtml(COPY[lang].rss)}" href="${localizedRoute(lang,'/feed.xml')}">\n</head>`);
  if(path==='/'&&!html.includes(MARKER)){
    const graph={'@context':'https://schema.org','@graph':[
      {'@type':'Organization','@id':`${SITE}/#organization`,name:'CHUDO Human Rights Center',alternateName:'Правозащитный центр CHUDO',url:`${SITE}/`,logo:{'@type':'ImageObject',url:ICON,width:512,height:512},image:{'@type':'ImageObject',url:SOCIAL,width:1200,height:630},sameAs:['https://t.me/Z690002','https://www.youtube.com/channel/UCTXAwovvaec4w9ztbggWMEQ']},
      {'@type':'WebSite','@id':`${SITE}/#website`,url:`${SITE}/`,name:'CHUDO Human Rights Center',alternateName:'Правозащитный центр CHUDO',publisher:{'@id':`${SITE}/#organization`},inLanguage:['ru','be','en','pl']}
    ]};
    html=html.replace('</head>',`${MARKER}\n<script type="application/ld+json">${JSON.stringify(graph).replaceAll('<','\\u003c')}</script>\n</head>`);identityPages++;
  }
  const before=html;html=footerLink(html,lang);if(before!==html)footerLinks++;
  await writeText(file,html);
}

const stamp=new Date().toISOString();
const sitemapIndex=`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${SITE}/sitemap.xml</loc><lastmod>${stamp}</lastmod></sitemap>\n  <sitemap><loc>${SITE}/news-sitemap.xml</loc><lastmod>${stamp}</lastmod></sitemap>\n</sitemapindex>\n`;
await writeText(join(out,'sitemap-index.xml'),sitemapIndex);
let robots='';try{robots=await readFile(join(out,'robots.txt'),'utf8');}catch{}
const robotLines=robots.split(/\r?\n/).filter(line=>line&&!/^Sitemap:/i.test(line));
robotLines.push(`Sitemap: ${SITE}/sitemap-index.xml`,`Sitemap: ${SITE}/sitemap.xml`,`Sitemap: ${SITE}/news-sitemap.xml`);
await writeText(join(out,'robots.txt'),robotLines.join('\n')+'\n');
await writeText(join(out,'humans.txt'),`CHUDO HUMAN RIGHTS CENTER\nPublic name: Правозащитный центр CHUDO\nPurpose: independent human-rights documentation and political repression monitoring\nLanguages: Russian, Belarusian, English, Polish\nEditorial policy: ${SITE}/editorial-policy/\nMethodology: ${SITE}/methodology/\nCorrections: ${SITE}/corrections/\nSecurity: ${SITE}/security/\nUpdated: ${BUILD_DATE}\n`);
await writeText(join(out,'.well-known','security.txt'),`Contact: ${SITE}/contacts/\nPolicy: ${SITE}/security/\nCanonical: ${SITE}/.well-known/security.txt\nExpires: 2027-08-29T23:59:59Z\nPreferred-Languages: ru, be, en, pl\n`);
const report={schema_version:'1.0.0',generated_at:stamp,site:SITE,optimized_high_value_pages:optimized,organization_identity_pages:identityPages,footer_policy_links:footerLinks,assets:{social_card:'/assets/brand/social-card.png',icon:'/assets/brand/icon-512.png',favicon:'/assets/brand/favicon.svg'},sitemaps:['/sitemap-index.xml','/sitemap.xml','/news-sitemap.xml'],editorial_policy:'/editorial-policy/'};
await writeText(join(out,'search-authority.json'),JSON.stringify(report,null,2)+'\n');
console.log(`SEARCH_AUTHORITY_ENHANCE=PASS optimized=${optimized} identity_pages=${identityPages} footer_links=${footerLinks} social_png=PASS manifest=PASS sitemap_index=PASS security_txt=PASS`);
