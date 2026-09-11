import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeText } from './lib/fs.mjs';
import { resolvePublicDataDir } from './lib/public-data.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=join(root,'_site');
const dataDir=resolvePublicDataDir(root);
const langs=['ru','be','en','pl'];
const MARKER='CHUDO_DATA_PROVENANCE_TRANSPARENCY_V1';

const COPY={
  ru:{title:'Прозрачность публикации базы',intro:'Строка исходного файла не равна человеку и не становится автоматически публичной карточкой. Ниже показано, сколько строк было обработано, сколько карточек вошло в опубликованный snapshot и какие данные были удержаны из публичного контура.',sourceRows:'Строк источника обработано',publicPeople:'Публичных карточек людей',quarantined:'Строк удержано из-за структурных конфликтов',withheld:'Полей удержано для отдельной проверки',current:'Текущих политзаключённых по атрибуции источника',former:'Бывших политзаключённых по атрибуции источника',repression:'Других записей о репрессиях',quarantineNote:'Quarantine — это строки источника, которые не вошли в публичные карточки до разрешения структурного или идентификационного конфликта. Их частные детали и редакционная очередь не публикуются.',reviewNote:'Удержанные поля — отдельные высокорисковые утверждения, например о смерти или будущей дате события. Удержание поля не означает автоматическое исключение всей карточки человека.',source:'Источник',observed:'Snapshot источника наблюдался',sourceHash:'SHA-256 исходного файла',snapshot:'Публичный snapshot CHUDO',auditTrail:'Техническая цепочка аудита',candidateHash:'SHA-256 candidate manifest',candidateAudit:'SHA-256 candidate audit receipt',buildAudit:'SHA-256 full-build audit receipt'},
  be:{title:'Празрыстасць публікацыі базы',intro:'Радок зыходнага файла не роўны чалавеку і не становіцца аўтаматычна публічнай карткай. Ніжэй паказана, колькі радкоў апрацавана, колькі картак увайшло ў апублікаваны snapshot і якія даныя былі ўтрыманыя з публічнага контуру.',sourceRows:'Апрацавана радкоў крыніцы',publicPeople:'Публічных картак людзей',quarantined:'Радкоў утрымана праз структурныя канфлікты',withheld:'Палёў утрымана для асобнай праверкі',current:'Бягучых палітвязняў паводле атрыбуцыі крыніцы',former:'Былых палітвязняў паводле атрыбуцыі крыніцы',repression:'Іншых запісаў пра рэпрэсіі',quarantineNote:'Quarantine — гэта радкі крыніцы, якія не ўвайшлі ў публічныя карткі да вырашэння структурнага або ідэнтыфікацыйнага канфлікту. Прыватныя дэталі і рэдакцыйная чарга не публікуюцца.',reviewNote:'Утрыманыя палі — асобныя высокарызыкоўныя сцвярджэнні, напрыклад пра смерць або будучую дату падзеі. Утрыманне поля не азначае аўтаматычнага выключэння ўсёй карткі чалавека.',source:'Крыніца',observed:'Snapshot крыніцы назіраўся',sourceHash:'SHA-256 зыходнага файла',snapshot:'Публічны snapshot CHUDO',auditTrail:'Тэхнічны ланцужок аўдыту',candidateHash:'SHA-256 candidate manifest',candidateAudit:'SHA-256 candidate audit receipt',buildAudit:'SHA-256 full-build audit receipt'},
  en:{title:'Database publication transparency',intro:'A source-file row is not the same thing as a person and does not automatically become a public profile. The figures below show how many source rows were processed, how many person profiles entered the published snapshot, and what data was withheld from the public layer.',sourceRows:'Source rows processed',publicPeople:'Public person profiles',quarantined:'Rows withheld for structural conflicts',withheld:'Fields withheld for separate review',current:'Current political prisoners by source attribution',former:'Former political prisoners by source attribution',repression:'Other repression records',quarantineNote:'Quarantine means source rows that did not enter public person profiles until a structural or identity conflict is resolved. Private conflict details and the editorial review queue are not published.',reviewNote:'Withheld fields are separate high-risk claims, such as a death claim or a future event date. Withholding a field does not automatically remove the entire person profile.',source:'Source',observed:'Source snapshot observed',sourceHash:'Source file SHA-256',snapshot:'CHUDO public snapshot',auditTrail:'Technical audit chain',candidateHash:'Candidate manifest SHA-256',candidateAudit:'Candidate audit receipt SHA-256',buildAudit:'Full-build audit receipt SHA-256'},
  pl:{title:'Przejrzystość publikacji bazy',intro:'Wiersz pliku źródłowego nie jest tym samym co osoba i nie staje się automatycznie publicznym profilem. Poniżej pokazano liczbę przetworzonych wierszy, liczbę profili w opublikowanym snapshot oraz dane wstrzymane poza warstwą publiczną.',sourceRows:'Przetworzone wiersze źródła',publicPeople:'Publiczne profile osób',quarantined:'Wiersze wstrzymane z powodu konfliktów strukturalnych',withheld:'Pola wstrzymane do osobnej weryfikacji',current:'Aktualni więźniowie polityczni wg atrybucji źródła',former:'Byli więźniowie polityczni wg atrybucji źródła',repression:'Inne wpisy o represjach',quarantineNote:'Quarantine oznacza wiersze źródłowe, które nie weszły do publicznych profili do czasu rozstrzygnięcia konfliktu strukturalnego lub tożsamości. Prywatne szczegóły konfliktu i kolejka redakcyjna nie są publikowane.',reviewNote:'Wstrzymane pola to osobne twierdzenia wysokiego ryzyka, np. informacja o śmierci lub przyszła data zdarzenia. Wstrzymanie pola nie oznacza automatycznego usunięcia całego profilu osoby.',source:'Źródło',observed:'Zaobserwowano snapshot źródła',sourceHash:'SHA-256 pliku źródłowego',snapshot:'Publiczny snapshot CHUDO',auditTrail:'Techniczny łańcuch audytu',candidateHash:'SHA-256 manifestu candidate',candidateAudit:'SHA-256 candidate audit receipt',buildAudit:'SHA-256 full-build audit receipt'}
};

function outputPath(lang){return lang==='ru'?join(out,'transparency','index.html'):join(out,lang,'transparency','index.html');}
function esc(value){return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
function int(value,label){if(!Number.isInteger(value)||value<0)throw new Error(`TRANSPARENCY_PROVENANCE_INVALID_${label}:${value}`);return value;}
function hash(value,label,{required=false}={}){if(value==null||value===''){if(required)throw new Error(`TRANSPARENCY_PROVENANCE_${label}_MISSING`);return null;}if(!/^[a-f0-9]{64}$/.test(String(value)))throw new Error(`TRANSPARENCY_PROVENANCE_INVALID_${label}`);return String(value);}
function metric(value,label){return `<article><strong>${esc(value)}</strong><span>${esc(label)}</span></article>`;}
function detail(label,value){return value?`<div><dt>${esc(label)}</dt><dd><code>${esc(value)}</code></dd></div>`:'';}

const manifest=await readJson(join(dataDir,'manifest.json'));
if(manifest.publication_state!=='PUBLISHED'){
  console.log(`TRANSPARENCY_PROVENANCE_ENHANCE=SKIP publication_state=${manifest.publication_state||'missing'}`);
  process.exit(0);
}

const source=(manifest.source_snapshots||[]).find(item=>item?.source_id==='src-viasna');
if(!source){
  console.log('TRANSPARENCY_PROVENANCE_ENHANCE=SKIP source=src-viasna absent');
  process.exit(0);
}

const people=int(manifest.counts?.people,'PEOPLE');
const current=int(manifest.counts?.political_prisoners_current,'CURRENT');
const former=int(manifest.counts?.former_political_prisoners,'FORMER');
if(current+former>people)throw new Error(`TRANSPARENCY_PROVENANCE_STATUS_COUNT_OVERFLOW:${current}:${former}:${people}`);
const repression=people-current-former;
const parsedRows=int(source.parsed_rows,'PARSED_ROWS');
const cleanRows=int(source.clean_rows,'CLEAN_ROWS');
const quarantinedRows=int(source.quarantined_rows,'QUARANTINED_ROWS');
const reviewFields=int(source.review_required_findings,'REVIEW_REQUIRED_FINDINGS');
if(cleanRows!==people)throw new Error(`TRANSPARENCY_PROVENANCE_CLEAN_PEOPLE_MISMATCH:${cleanRows}:${people}`);
if(quarantinedRows>parsedRows)throw new Error(`TRANSPARENCY_PROVENANCE_QUARANTINE_OVERFLOW:${quarantinedRows}:${parsedRows}`);
if(people>parsedRows)throw new Error(`TRANSPARENCY_PROVENANCE_PEOPLE_OVER_SOURCE_ROWS:${people}:${parsedRows}`);
const sourceSha=hash(source.source_sha256,'SOURCE_SHA256',{required:true});
const candidateHash=hash(source.candidate_manifest_sha256,'CANDIDATE_MANIFEST_SHA256');
const candidateAudit=hash(source.candidate_audit_receipt_sha256,'CANDIDATE_AUDIT_RECEIPT_SHA256');
const buildAudit=hash(source.candidate_build_audit_receipt_sha256,'CANDIDATE_BUILD_AUDIT_RECEIPT_SHA256');
const observed=source.observed_at||null;
const sourceUrl=source.source_page_url||null;
if(sourceUrl){try{const url=new URL(sourceUrl);if(url.protocol!=='https:')throw new Error();}catch{throw new Error('TRANSPARENCY_PROVENANCE_SOURCE_URL_INVALID');}}

for(const lang of langs){
  const copy=COPY[lang];
  const path=outputPath(lang);
  let html=await readFile(path,'utf8');
  if(html.includes(MARKER))throw new Error(`TRANSPARENCY_PROVENANCE_DUPLICATE_MARKER:${lang}`);
  const auditDetails=[candidateHash,candidateAudit,buildAudit].filter(Boolean).length?`<div class="profile-section transparency-audit"><h3>${esc(copy.auditTrail)}</h3><dl class="profile-fields">${detail(copy.candidateHash,candidateHash)}${detail(copy.candidateAudit,candidateAudit)}${detail(copy.buildAudit,buildAudit)}</dl></div>`:'';
  const section=`<section class="container page provenance-transparency" data-chudo-marker="${MARKER}"><p class="eyebrow">DATA PROVENANCE</p><h2>${esc(copy.title)}</h2><p>${esc(copy.intro)}</p><div class="stats">${metric(parsedRows,copy.sourceRows)}${metric(people,copy.publicPeople)}${metric(quarantinedRows,copy.quarantined)}${metric(reviewFields,copy.withheld)}</div><div class="stats">${metric(current,copy.current)}${metric(former,copy.former)}${metric(repression,copy.repression)}</div><div class="profile-section"><p>${esc(copy.quarantineNote)}</p><p>${esc(copy.reviewNote)}</p></div><dl class="profile-fields">${detail(copy.snapshot,manifest.snapshot_id)}${sourceUrl?`<div><dt>${esc(copy.source)}</dt><dd><a href="${esc(sourceUrl)}" rel="external nofollow noopener">${esc(sourceUrl)}</a></dd></div>`:''}${detail(copy.observed,observed)}${detail(copy.sourceHash,sourceSha)}</dl>${auditDetails}</section>`;
  if(!html.includes('</main>'))throw new Error(`TRANSPARENCY_PROVENANCE_MAIN_MARKER_MISSING:${lang}`);
  html=html.replace('</main>',`${section}</main>`);
  await writeText(path,html);
}

console.log(`TRANSPARENCY_PROVENANCE_ENHANCE=PASS snapshot=${manifest.snapshot_id} source_rows=${parsedRows} public_people=${people} quarantined_rows=${quarantinedRows} review_fields=${reviewFields} current=${current} former=${former} repression=${repression} locales=4 private_details=ZERO`);
