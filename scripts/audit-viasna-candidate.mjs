import { createHash } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifySnapshot } from './lib/snapshot.mjs';
import { assertPublicDatasetProvenance } from './lib/provenance.mjs';
import { buildSearchRecord, categoryFor, paginate, prisonRelativePath, profileRelativePath, publishedPeople } from './lib/catalog.mjs';

const repoRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const LANGS=['ru','be','en','pl'];
const PAGE_SIZE=48;
const GOOGLE_SITEMAP_URL_LIMIT=50000;

function inside(parent,child){const rel=relative(parent,child);return rel===''||(!rel.startsWith('..'+sep)&&rel!=='..'&&!isAbsolute(rel));}
function sha256(data){return createHash('sha256').update(data).digest('hex');}
function envOptionalInt(name){const raw=process.env[name];if(raw==null||raw==='')return null;const value=Number.parseInt(raw,10);if(!Number.isInteger(value)||value<0)throw new Error(`${name}_INVALID`);return value;}
function envInt(name,fallback,{min=0,max=Number.MAX_SAFE_INTEGER}={}){const value=envOptionalInt(name);if(value===null)return fallback;if(value<min||value>max)throw new Error(`${name}_INVALID`);return value;}
function route(lang,path){return lang==='ru'?path:`/${lang}${path}`;}
function readJson(path){return readFile(path,'utf8').then(JSON.parse);}
function assertExpected(name,actual,expected){if(expected!==null&&actual!==expected)throw new Error(`${name}_MISMATCH:${actual}:${expected}`);}

function collectPrivateLeakPaths(value,path='$',out=[]){
  if(value==null)return out;
  if(Array.isArray(value)){for(let i=0;i<value.length;i++)collectPrivateLeakPaths(value[i],`${path}[${i}]`,out);return out;}
  if(typeof value!=='object')return out;
  for(const [key,item] of Object.entries(value)){
    const next=`${path}.${key}`;
    if(/^(private_editorial_notes|identity_conflicts|review_queue|review_required|quarantine|died_raw)$/i.test(key))out.push(next);
    if(key==='publication_state'&&['PRIVATE_REVIEW','STAGING_OBSERVATION_ONLY'].includes(item))out.push(next);
    collectPrivateLeakPaths(item,next,out);
  }
  return out;
}

function assertUnique(values,code){const seen=new Set();for(const value of values){if(seen.has(value))throw new Error(`${code}:${value}`);seen.add(value);}return seen.size;}
function statusCounts(people){let active=0,former=0,np=0;for(const person of people){const category=categoryFor(person);if(category==='prisoners')active++;else if(category==='former-prisoners')former++;else np++;}return{active,former,np};}
function coreUrlCount(people,prisons,counts){
  const categoryPages=paginate(Array(counts.active),PAGE_SIZE).length+paginate(Array(counts.former),PAGE_SIZE).length+paginate(Array(people.length),PAGE_SIZE).length;
  const profilePages=people.length*LANGS.length;
  const categoryPagesLocalized=categoryPages*LANGS.length;
  const prisonPages=prisons.length*LANGS.length;
  const coreHubAndStaticPages=7*LANGS.length;
  return{profilePages,categoryPagesLocalized,prisonPages,coreHubAndStaticPages,total:profilePages+categoryPagesLocalized+prisonPages+coreHubAndStaticPages};
}
function projectedCoreRoutes(people,prisons,counts){
  const urls=[];
  for(const person of people)for(const lang of LANGS)urls.push(route(lang,profileRelativePath(person,lang)));
  for(const [kind,count] of [['prisoners',counts.active],['former-prisoners',counts.former],['repressed',people.length]]){
    const base=`/${kind}/`;const total=Math.max(1,Math.ceil(count/PAGE_SIZE));
    for(let page=1;page<=total;page++)for(const lang of LANGS)urls.push(route(lang,page===1?base:`${base}page/${page}/`));
  }
  for(const prison of prisons)for(const lang of LANGS)urls.push(route(lang,prisonRelativePath(prison,lang)));
  for(const path of ['/','/prisons/','/news/','/monitoring/','/reports/','/help/','/about/'])for(const lang of LANGS)urls.push(route(lang,path));
  return urls;
}

const input=process.env.CHRC_VIASNA_CANDIDATE_DIR;
if(!input)throw new Error('CHRC_VIASNA_CANDIDATE_DIR_NOT_CONFIGURED');
const candidate=await realpath(resolve(input));
const repo=await realpath(repoRoot);
if(process.env.CHRC_TEST_MODE!=='1'&&inside(repo,candidate))throw new Error('REAL_VIASNA_CANDIDATE_INSIDE_PUBLIC_REPO');
const info=await stat(candidate);if(!info.isDirectory())throw new Error('VIASNA_CANDIDATE_NOT_DIRECTORY');

const integrity=await verifySnapshot(candidate);
if(!integrity.ok)throw new Error(`VIASNA_CANDIDATE_INTEGRITY_FAIL:${JSON.stringify(integrity.failures)}`);
const manifest=integrity.manifest;
if(manifest.publication_state!=='CANDIDATE_REVIEW')throw new Error(`VIASNA_CANDIDATE_STATE_INVALID:${manifest.publication_state||'missing'}`);

const [peopleRaw,prisons,manifestRaw]=await Promise.all([
  readJson(join(candidate,'people.json')),
  readJson(join(candidate,'prisons.json')),
  readFile(join(candidate,'manifest.json'))
]);
const people=publishedPeople(peopleRaw,{allowFixtures:false});
if(people.length!==peopleRaw.length)throw new Error(`VIASNA_CANDIDATE_NON_PUBLIC_PERSON_STATE:${people.length}:${peopleRaw.length}`);
if(people.some(person=>person.fixture===true))throw new Error('VIASNA_CANDIDATE_FIXTURE_PRESENT');
assertPublicDatasetProvenance(people);

const privateLeaks=[...collectPrivateLeakPaths(people,'$.people'),...collectPrivateLeakPaths(prisons,'$.prisons')];
if(privateLeaks.length)throw new Error(`VIASNA_CANDIDATE_PRIVATE_BOUNDARY_FAIL:${privateLeaks.slice(0,20).join('|')}`);

for(const person of people)if(!/^p-\d{7}$/.test(String(person.person_id||'')))throw new Error(`VIASNA_CANDIDATE_PERSON_ID_INVALID:${person.person_id||'missing'}`);
assertUnique(people.map(person=>person.person_id),'VIASNA_CANDIDATE_DUPLICATE_PERSON_ID');

const sourceIdentityOwners=new Map();
for(const person of people){
  const keys=[...new Set((person.source_identity_keys||[]).filter(Boolean))];
  if(!keys.length)throw new Error(`VIASNA_CANDIDATE_SOURCE_IDENTITY_MISSING:${person.person_id}`);
  for(const key of keys){
    const owner=sourceIdentityOwners.get(key);
    if(owner&&owner!==person.person_id)throw new Error(`VIASNA_CANDIDATE_SOURCE_IDENTITY_REUSED:${key}:${owner}:${person.person_id}`);
    sourceIdentityOwners.set(key,person.person_id);
  }
}

for(const prison of prisons)if(!/^pr-[a-f0-9]{12}$/.test(String(prison.prison_id||'')))throw new Error(`VIASNA_CANDIDATE_PRISON_ID_INVALID:${prison.prison_id||'missing'}`);
assertUnique(prisons.map(prison=>prison.prison_id),'VIASNA_CANDIDATE_DUPLICATE_PRISON_ID');

const counts=statusCounts(people);
assertExpected('VIASNA_CANDIDATE_EXPECTED_PEOPLE',people.length,envOptionalInt('VIASNA_EXPECTED_PEOPLE'));
assertExpected('VIASNA_CANDIDATE_EXPECTED_PRISONS',prisons.length,envOptionalInt('VIASNA_EXPECTED_PRISONS'));
assertExpected('VIASNA_CANDIDATE_EXPECTED_ACTIVE',counts.active,envOptionalInt('VIASNA_EXPECTED_CANDIDATE_ACTIVE'));
assertExpected('VIASNA_CANDIDATE_EXPECTED_FORMER',counts.former,envOptionalInt('VIASNA_EXPECTED_CANDIDATE_FORMER'));
assertExpected('VIASNA_CANDIDATE_EXPECTED_NP',counts.np,envOptionalInt('VIASNA_EXPECTED_CANDIDATE_NP'));

if(manifest.counts?.people!==people.length)throw new Error(`VIASNA_CANDIDATE_MANIFEST_PEOPLE_MISMATCH:${manifest.counts?.people}:${people.length}`);
if(manifest.counts?.political_prisoners_current!==counts.active)throw new Error(`VIASNA_CANDIDATE_MANIFEST_ACTIVE_MISMATCH:${manifest.counts?.political_prisoners_current}:${counts.active}`);
if(manifest.counts?.former_political_prisoners!==counts.former)throw new Error(`VIASNA_CANDIDATE_MANIFEST_FORMER_MISMATCH:${manifest.counts?.former_political_prisoners}:${counts.former}`);
if(manifest.counts?.repressed_total!==people.length)throw new Error(`VIASNA_CANDIDATE_MANIFEST_REPRESSED_MISMATCH:${manifest.counts?.repressed_total}:${people.length}`);

const expectedSourceSha=String(process.env.VIASNA_EXPECTED_SOURCE_SHA256||'').trim().toLowerCase();
const sourceSnapshot=(manifest.source_snapshots||[]).find(item=>item?.source_id==='src-viasna');
if(!sourceSnapshot)throw new Error('VIASNA_CANDIDATE_SOURCE_SNAPSHOT_MISSING');
if(expectedSourceSha&&sourceSnapshot.source_sha256!==expectedSourceSha)throw new Error(`VIASNA_CANDIDATE_SOURCE_SHA256_MISMATCH:${sourceSnapshot.source_sha256||'missing'}:${expectedSourceSha}`);

const routes=projectedCoreRoutes(people,prisons,counts);
assertUnique(routes,'VIASNA_CANDIDATE_DUPLICATE_CORE_ROUTE');
const projected=coreUrlCount(people,prisons,counts);
if(routes.length!==projected.total)throw new Error(`VIASNA_CANDIDATE_ROUTE_PROJECTION_MISMATCH:${routes.length}:${projected.total}`);
const sitemapReserve=envInt('CHRC_CANDIDATE_SITEMAP_URL_RESERVE',5000,{min:0,max:20000});
const maxProjectedCoreUrls=envInt('CHRC_CANDIDATE_MAX_CORE_URLS',45000,{min:1,max:GOOGLE_SITEMAP_URL_LIMIT});
if(projected.total>maxProjectedCoreUrls)throw new Error(`VIASNA_CANDIDATE_CORE_URL_BUDGET_EXCEEDED:${projected.total}:${maxProjectedCoreUrls}`);
if(projected.total+sitemapReserve>GOOGLE_SITEMAP_URL_LIMIT)throw new Error(`VIASNA_CANDIDATE_SITEMAP_HEADROOM_FAIL:${projected.total}:${sitemapReserve}:${GOOGLE_SITEMAP_URL_LIMIT}`);

const searchIndexBytes={};
const maxSearchIndexBytes=envInt('CHRC_CANDIDATE_MAX_SEARCH_INDEX_BYTES_PER_LANG',16*1024*1024,{min:1024,max:64*1024*1024});
for(const lang of LANGS){
  const records=people.map(person=>buildSearchRecord(person,lang,route));
  const bytes=Buffer.byteLength(JSON.stringify(records));
  searchIndexBytes[lang]=bytes;
  if(bytes>maxSearchIndexBytes)throw new Error(`VIASNA_CANDIDATE_SEARCH_INDEX_BUDGET_EXCEEDED:${lang}:${bytes}:${maxSearchIndexBytes}`);
}

const result={
  state:'REAL_VIASNA_CANDIDATE_AUDIT_PASS_NOT_PUBLISHED',
  snapshot_id:manifest.snapshot_id,
  candidate_manifest_sha256:sha256(manifestRaw),
  source_sha256:sourceSnapshot.source_sha256||null,
  people:people.length,
  active:counts.active,
  former:counts.former,
  np:counts.np,
  prisons:prisons.length,
  unique_person_ids:people.length,
  unique_source_identity_keys:sourceIdentityOwners.size,
  private_boundary_leaks:0,
  projected_core_urls:projected.total,
  projected_profile_pages:projected.profilePages,
  projected_category_pages:projected.categoryPagesLocalized,
  sitemap_url_reserve:sitemapReserve,
  projected_sitemap_with_reserve:projected.total+sitemapReserve,
  search_index_bytes:searchIndexBytes,
  public_repo_mutated:false,
  production_published:false,
  next_gate:'PRIVATE_IDENTITY_RESOLUTION_THEN_EXPLICIT_SNAPSHOT_PROMOTION'
};
console.log(`REAL_VIASNA_CANDIDATE_AUDIT=PASS snapshot=${result.snapshot_id} people=${result.people} active=${result.active} former=${result.former} np=${result.np} prisons=${result.prisons} core_urls=${result.projected_core_urls} sitemap_with_reserve=${result.projected_sitemap_with_reserve} private_leaks=0 published=false`);
console.log(JSON.stringify(result));
