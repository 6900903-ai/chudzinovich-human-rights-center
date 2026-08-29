import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeText } from './lib/fs.mjs';
import { resolvePublicDataDir } from './lib/public-data.mjs';
import { localized, personName, profileRelativePath, prisonRelativePath, publishedPeople } from './lib/catalog.mjs';
import { route } from './templates.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=join(root,'_site');
const dataDir=resolvePublicDataDir(root);
const testMode=process.env.CHRC_TEST_MODE==='1';
const people=publishedPeople(await readJson(join(dataDir,'people.json')),{allowFixtures:testMode});
const prisons=(await readJson(join(dataDir,'prisons.json'))).filter(x=>['PUBLIC_CONFIRMED','PUBLIC_SOURCE_ATTRIBUTED','PUBLIC_DISPUTED'].includes(x.publication_state));
const langs=['ru','be','en','pl'];
const SITE='https://chudzinovich.pp.ua';
const MARKER='<!-- CHUDO_ENTITY_SEO_V1 -->';

function outputPath(lang,path){const prefix=lang==='ru'?'':lang;const clean=String(path).replace(/^\//,'').replace(/\/$/,'');return join(out,prefix,clean,'index.html');}
function absolute(lang,path){return `${SITE}${route(lang,path)}`;}
function jsonLd(data){return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g,'\\u003c')}</script>`;}
function exactBirth(value){if(!value)return null;if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value))return value;if(typeof value==='object'&&value.precision==='day'&&/^\d{4}-\d{2}-\d{2}$/.test(value.value||''))return value.value;return null;}
function aliases(person){return [...new Set((person.aliases||[]).map(String).filter(Boolean))].slice(0,20);}
function statusText(person,lang){const events=(person.status_events||[]).filter(x=>x&&!['RETRACTED','SUPERSEDED'].includes(x.state));const status=events.at(-1)?.status;const map={ru:{POLITICAL_PRISONER:'политзаключённый',FORMER_POLITICAL_PRISONER:'бывший политзаключённый',REPRESSION_DOCUMENTED:'политическое преследование'},be:{POLITICAL_PRISONER:'палітвязень',FORMER_POLITICAL_PRISONER:'былы палітвязень',REPRESSION_DOCUMENTED:'палітычны пераслед'},en:{POLITICAL_PRISONER:'political prisoner',FORMER_POLITICAL_PRISONER:'former political prisoner',REPRESSION_DOCUMENTED:'political persecution'},pl:{POLITICAL_PRISONER:'więzień polityczny',FORMER_POLITICAL_PRISONER:'były więzień polityczny',REPRESSION_DOCUMENTED:'prześladowanie polityczne'}};return map[lang]?.[status]||'';}

let personPages=0,prisonPages=0;
for(const lang of langs){
  for(const person of people){
    const path=profileRelativePath(person,lang),file=outputPath(lang,path);let html;try{html=await readFile(file,'utf8');}catch{continue;}if(html.includes(MARKER))continue;
    const name=personName(person,lang);const alternateName=aliases(person);const schema={'@context':'https://schema.org','@type':'Person','@id':`${absolute(lang,path)}#person`,name,url:absolute(lang,path),identifier:person.person_id,description:[statusText(person,lang),localized(person.region,lang,'')].filter(Boolean).join(' · ')};
    if(alternateName.length)schema.alternateName=alternateName;
    const birth=exactBirth(person.birth_date);if(birth)schema.birthDate=birth;
    const photo=person.photo;if(photo?.rights_state==='PERMITTED'&&typeof photo.local_asset==='string'&&photo.local_asset.startsWith('/assets/'))schema.image=`${SITE}${photo.local_asset}`;
    html=html.replace('</head>',`${jsonLd(schema)}\n${MARKER}\n</head>`);await writeText(file,html);personPages++;
  }
  for(const prison of prisons){
    const path=prisonRelativePath(prison,lang),file=outputPath(lang,path);let html;try{html=await readFile(file,'utf8');}catch{continue;}if(html.includes(MARKER))continue;
    const name=localized(prison.name||prison.names,lang,prison.prison_id||'');const address=localized(prison.address,lang,'');const region=localized(prison.region,lang,'');const schema={'@context':'https://schema.org','@type':'Place','@id':`${absolute(lang,path)}#place`,name,url:absolute(lang,path),identifier:prison.prison_id};
    if(address)schema.address={'@type':'PostalAddress',streetAddress:address,addressRegion:region||undefined,addressCountry:'BY'};
    else if(region)schema.address={'@type':'PostalAddress',addressRegion:region,addressCountry:'BY'};
    html=html.replace('</head>',`${jsonLd(schema)}\n${MARKER}\n</head>`);await writeText(file,html);prisonPages++;
  }
}
console.log(`ENTITY_SEO_ENHANCE=PASS people=${personPages} prisons=${prisonPages} test_mode=${testMode}`);
