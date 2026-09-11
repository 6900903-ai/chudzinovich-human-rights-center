import { createHash } from 'node:crypto';
import { lstat, readFile, realpath, readdir, stat } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir=dirname(fileURLToPath(import.meta.url));
const repoRoot=resolve(moduleDir,'../..');
const REQUIRED_FILES=['people.json','prisons.json','news.json','reports.json'];
const PUBLIC_STATES=new Set(['PUBLIC_CONFIRMED','PUBLIC_SOURCE_ATTRIBUTED','PUBLIC_DISPUTED']);
const STATUS_VALUES=new Set(['POLITICAL_PRISONER','FORMER_POLITICAL_PRISONER','REPRESSION_DOCUMENTED']);
const REQUIRED_RELEASE_GATES=[
  'LEGAL_DATA_REUSE_GATE',
  'PRIVACY_DPIA_GATE',
  'EDITORIAL_REVIEW_GATE',
  'SOURCE_ATTRIBUTION_GATE',
  'IMAGE_RIGHTS_GATE',
  'REAL_DATA_RELEASE_AUTHORIZATION'
];
const FORBIDDEN_FIELD_NAMES=new Set([
  'passport','passport_number','identity_document','identity_document_number','document_number',
  'home_address','private_address','private_phone','private_email','personal_number','national_id',
  'bank_account','card_number','password','secret','private_key','access_token','refresh_token',
  'editorial_note','private_note','reviewer_note','rejected_reason','candidate_queue'
]);

function inside(parent,child){const rel=relative(parent,child);return rel===''||(!rel.startsWith(`..${sep}`)&&rel!=='..'&&!isAbsolute(rel));}
function sha256(bytes){return createHash('sha256').update(bytes).digest('hex');}
function requireString(value,code){if(typeof value!=='string'||!value.trim())throw new Error(code);return value;}
function requireArray(value,code){if(!Array.isArray(value))throw new Error(code);return value;}
function requireObject(value,code){if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(code);return value;}
function httpsUrl(value,code){const raw=requireString(value,code);const url=new URL(raw);if(url.protocol!=='https:'||url.username||url.password)throw new Error(code);return url.href;}
function isoDate(value,code,{nullable=false}={}){if(nullable&&value==null)return null;const raw=requireString(value,code);if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(raw)||Number.isNaN(Date.parse(raw)))throw new Error(code);return raw;}
function noControlChars(value,code){if(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(String(value)))throw new Error(code);}
function normalizeName(value=''){return String(value).normalize('NFKC').toLocaleLowerCase('ru').replaceAll('ё','е').replace(/[^\p{L}\p{N}]+/gu,' ').trim();}

async function canonicalOutsideRepo(input,{testMode=false}={}){
  if(!input)throw new Error('REVIEW_SNAPSHOT_DIR_NOT_CONFIGURED');
  const actual=await realpath(resolve(input));
  const repo=await realpath(repoRoot);
  if(!testMode&&inside(repo,actual))throw new Error('REVIEW_SNAPSHOT_MUST_BE_OUTSIDE_PUBLIC_REPO');
  const info=await stat(actual);if(!info.isDirectory())throw new Error('REVIEW_SNAPSHOT_NOT_DIRECTORY');
  return actual;
}

async function readJsonStrict(path,code){
  const link=await lstat(path);if(link.isSymbolicLink())throw new Error(`${code}_SYMLINK`);
  if(!link.isFile())throw new Error(`${code}_NOT_FILE`);
  const bytes=await readFile(path);if(bytes.length===0)throw new Error(`${code}_EMPTY`);
  let value;try{value=JSON.parse(bytes.toString('utf8'));}catch{throw new Error(`${code}_JSON_INVALID`);}
  return{bytes,value};
}

function scanForbiddenFields(value,path='$'){
  if(Array.isArray(value)){for(let i=0;i<value.length;i++)scanForbiddenFields(value[i],`${path}[${i}]`);return;}
  if(!value||typeof value!=='object')return;
  for(const [key,child] of Object.entries(value)){
    const normalized=key.toLocaleLowerCase('en').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
    if(FORBIDDEN_FIELD_NAMES.has(normalized))throw new Error(`FORBIDDEN_PRIVATE_OR_EDITORIAL_FIELD:${path}.${key}`);
    scanForbiddenFields(child,`${path}.${key}`);
  }
}

function validateLocalizedName(value,code){
  const object=requireObject(value,code);requireString(object.ru,`${code}_RU`);for(const lang of ['be','en','pl'])if(object[lang]!=null&&typeof object[lang]!=='string')throw new Error(`${code}_${lang.toUpperCase()}`);
}

function validateSource(source,personId){
  requireObject(source,`PERSON_SOURCE_INVALID:${personId}`);
  requireString(source.source_id,`PERSON_SOURCE_ID_MISSING:${personId}`);
  validateLocalizedName(source.name,`PERSON_SOURCE_NAME_INVALID:${personId}`);
  httpsUrl(source.url,`PERSON_SOURCE_URL_INVALID:${personId}`);
  if(source.observed_at!=null)isoDate(source.observed_at,`PERSON_SOURCE_OBSERVED_AT_INVALID:${personId}`);
  if(source.human_verified_at!=null)isoDate(source.human_verified_at,`PERSON_SOURCE_HUMAN_VERIFIED_AT_INVALID:${personId}`);
}

function validateEventSources(person,personId,sourceIds){
  const eventArrays=['cases','detentions','charges','judgments','sentences','prison_placements','release_events','status_events','health_claims','risk_assessments','evidence'];
  const eventIds=new Set();
  for(const key of eventArrays){
    const events=requireArray(person[key],`PERSON_${key.toUpperCase()}_INVALID:${personId}`);
    for(const event of events){
      requireObject(event,`PERSON_EVENT_INVALID:${personId}:${key}`);
      if(event.event_id!=null){const id=requireString(event.event_id,`PERSON_EVENT_ID_INVALID:${personId}:${key}`);if(eventIds.has(id))throw new Error(`DUPLICATE_EVENT_ID:${personId}:${id}`);eventIds.add(id);}
      if(event.source_id!=null&&!sourceIds.has(event.source_id))throw new Error(`EVENT_SOURCE_NOT_DECLARED:${personId}:${event.source_id}`);
      if(event.source_url!=null)httpsUrl(event.source_url,`EVENT_SOURCE_URL_INVALID:${personId}:${key}`);
      if(event.human_verified_at!=null)isoDate(event.human_verified_at,`EVENT_HUMAN_VERIFIED_AT_INVALID:${personId}:${key}`);
      if(['health_claims','risk_assessments'].includes(key)){
        if(event.publication_state!=='PUBLIC_CONFIRMED'||!event.human_verified_at)throw new Error(`HIGH_RISK_EVENT_NOT_HUMAN_CONFIRMED:${personId}:${key}`);
      }
    }
  }
  for(const event of person.status_events){
    if(!STATUS_VALUES.has(event.status))throw new Error(`STATUS_VALUE_INVALID:${personId}:${event.status}`);
    requireString(event.source_id,`STATUS_SOURCE_ID_MISSING:${personId}`);
    httpsUrl(event.source_url,`STATUS_SOURCE_URL_INVALID:${personId}`);
    if(!sourceIds.has(event.source_id))throw new Error(`STATUS_SOURCE_NOT_DECLARED:${personId}:${event.source_id}`);
  }
}

function validatePeople(people){
  requireArray(people,'PEOPLE_NOT_ARRAY');
  const ids=new Set();const identityKeys=new Set();const displayGroups=new Map();let current=0,former=0,disputed=0,withPortrait=0;
  for(const person of people){
    requireObject(person,'PERSON_NOT_OBJECT');
    const id=requireString(person.person_id,'PERSON_ID_MISSING');if(!/^p-\d{7}$/.test(id))throw new Error(`PERSON_ID_INVALID:${id}`);if(ids.has(id))throw new Error(`DUPLICATE_PERSON_ID:${id}`);ids.add(id);
    if(person.fixture===true)throw new Error(`FIXTURE_PERSON_FORBIDDEN:${id}`);
    if(!PUBLIC_STATES.has(person.publication_state))throw new Error(`PERSON_PUBLICATION_STATE_INVALID:${id}`);
    if(person.publication_state==='PUBLIC_DISPUTED')disputed++;
    validateLocalizedName(person.canonical_name,`PERSON_NAME_INVALID:${id}`);noControlChars(person.canonical_name.ru,`PERSON_NAME_CONTROL_CHARACTER:${id}`);
    const aliases=requireArray(person.aliases,`PERSON_ALIASES_INVALID:${id}`);for(const alias of aliases){if(typeof alias!=='string')throw new Error(`PERSON_ALIAS_INVALID:${id}`);noControlChars(alias,`PERSON_ALIAS_CONTROL_CHARACTER:${id}`);}
    const keys=requireArray(person.source_identity_keys??[],`PERSON_IDENTITY_KEYS_INVALID:${id}`);for(const key of keys){const value=requireString(key,`PERSON_IDENTITY_KEY_INVALID:${id}`);if(identityKeys.has(value))throw new Error(`DUPLICATE_SOURCE_IDENTITY_KEY:${value}`);identityKeys.add(value);}
    const sources=requireArray(person.sources,`PERSON_SOURCES_INVALID:${id}`);if(!sources.length)throw new Error(`PERSON_WITHOUT_SOURCE:${id}`);for(const source of sources)validateSource(source,id);const sourceIds=new Set(sources.map(source=>source.source_id));
    if(person.photo){requireObject(person.photo,`PERSON_PHOTO_INVALID:${id}`);if(person.photo.rights_state!=='PERMITTED'||typeof person.photo.local_asset!=='string'||!person.photo.local_asset.startsWith('/assets/'))throw new Error(`PERSON_PHOTO_RIGHTS_NOT_CLEARED:${id}`);withPortrait++;}
    validateEventSources(person,id,sourceIds);
    if(!person.status_events.length)throw new Error(`PERSON_WITHOUT_STATUS_EVENT:${id}`);
    const latest=person.status_events.at(-1);if(latest.status==='POLITICAL_PRISONER')current++;else if(latest.status==='FORMER_POLITICAL_PRISONER')former++;
    const group=normalizeName(person.canonical_name.ru);displayGroups.set(group,(displayGroups.get(group)||0)+1);
  }
  return{people:people.length,current,former,disputed,with_portrait:withPortrait,duplicate_display_name_groups:[...displayGroups.values()].filter(value=>value>1).length};
}

function validatePrisons(prisons){
  requireArray(prisons,'PRISONS_NOT_ARRAY');const ids=new Set();
  for(const prison of prisons){requireObject(prison,'PRISON_NOT_OBJECT');const id=requireString(prison.prison_id,'PRISON_ID_MISSING');if(ids.has(id))throw new Error(`DUPLICATE_PRISON_ID:${id}`);ids.add(id);if(prison.fixture===true)throw new Error(`FIXTURE_PRISON_FORBIDDEN:${id}`);if(prison.publication_state&&!PUBLIC_STATES.has(prison.publication_state))throw new Error(`PRISON_PUBLICATION_STATE_INVALID:${id}`);if(prison.source_url!=null)httpsUrl(prison.source_url,`PRISON_SOURCE_URL_INVALID:${id}`);}
  return{prisons:prisons.length};
}

function validateNews(news){
  requireArray(news,'NEWS_NOT_ARRAY');const ids=new Set();
  for(const item of news){requireObject(item,'NEWS_ITEM_NOT_OBJECT');const id=requireString(item.news_id,'NEWS_ID_MISSING');if(ids.has(id))throw new Error(`DUPLICATE_NEWS_ID:${id}`);ids.add(id);if(!PUBLIC_STATES.has(item.publication_state))throw new Error(`NEWS_PUBLICATION_STATE_INVALID:${id}`);httpsUrl(item.source_url,`NEWS_SOURCE_URL_INVALID:${id}`);if((item.high_risk_flags||[]).length&&item.editorial_reviewed!==true&&item.source_kind!=='TELEGRAM')throw new Error(`HIGH_RISK_NEWS_NOT_REVIEWED:${id}`);}
  return{news:news.length};
}

function validateReports(reports){requireArray(reports,'REPORTS_NOT_ARRAY');return{reports:reports.length};}

function releaseGateStatus(env){const gates=Object.fromEntries(REQUIRED_RELEASE_GATES.map(name=>[name,env[name]||'NOT_SET']));return{gates,all_pass:REQUIRED_RELEASE_GATES.every(name=>env[name]==='PASS')};}

export async function auditReviewedSnapshot(input,{testMode=false,env=process.env}={}){
  const dir=await canonicalOutsideRepo(input,{testMode});
  const allowed=new Set(['manifest.json',...REQUIRED_FILES]);
  const unexpected=(await readdir(dir)).filter(name=>!allowed.has(name));if(unexpected.length)throw new Error(`REVIEW_SNAPSHOT_UNEXPECTED_FILES:${unexpected.sort().join(',')}`);
  const manifestFile=await readJsonStrict(join(dir,'manifest.json'),'MANIFEST');const manifest=requireObject(manifestFile.value,'MANIFEST_NOT_OBJECT');
  if(manifest.publication_state!=='PUBLISHED')throw new Error(`MANIFEST_NOT_PUBLISHED:${manifest.publication_state}`);
  const snapshotId=requireString(manifest.snapshot_id,'MANIFEST_SNAPSHOT_ID_MISSING');if(!/^snap-\d{8}T\d{6}Z-[a-f0-9]{8}$/.test(snapshotId))throw new Error(`MANIFEST_SNAPSHOT_ID_INVALID:${snapshotId}`);
  isoDate(manifest.created_at,'MANIFEST_CREATED_AT_INVALID');
  const manifestEntries=requireArray(manifest.files,'MANIFEST_FILES_INVALID');const byPath=new Map(manifestEntries.map(entry=>[entry.path,entry]));
  for(const name of REQUIRED_FILES)if(!byPath.has(name))throw new Error(`MANIFEST_REQUIRED_FILE_MISSING:${name}`);
  if(byPath.size!==REQUIRED_FILES.length)throw new Error('MANIFEST_FILE_SET_NOT_EXACT');
  const datasets={};const fileDigests={};
  for(const name of REQUIRED_FILES){
    const entry=requireObject(byPath.get(name),`MANIFEST_FILE_ENTRY_INVALID:${name}`);if(!/^[a-f0-9]{64}$/.test(entry.sha256||''))throw new Error(`MANIFEST_FILE_SHA_INVALID:${name}`);if(!Number.isInteger(entry.bytes)||entry.bytes<0)throw new Error(`MANIFEST_FILE_BYTES_INVALID:${name}`);
    const file=await readJsonStrict(join(dir,name),`SNAPSHOT_FILE_${name}`);const digest=sha256(file.bytes);if(digest!==entry.sha256)throw new Error(`SNAPSHOT_FILE_SHA_MISMATCH:${name}`);if(file.bytes.length!==entry.bytes)throw new Error(`SNAPSHOT_FILE_BYTES_MISMATCH:${name}`);scanForbiddenFields(file.value,`$.${name}`);datasets[name]=file.value;fileDigests[name]={sha256:digest,bytes:file.bytes.length};
  }
  const people=validatePeople(datasets['people.json']);const prisons=validatePrisons(datasets['prisons.json']);const news=validateNews(datasets['news.json']);const reports=validateReports(datasets['reports.json']);
  const counts=requireObject(manifest.counts,'MANIFEST_COUNTS_INVALID');
  const expected={people:people.people,political_prisoners_current:people.current,former_political_prisoners:people.former,repressed_total:people.people};
  for(const [key,value] of Object.entries(expected))if(counts[key]!==value)throw new Error(`MANIFEST_COUNT_MISMATCH:${key}:${counts[key]}!=${value}`);
  const sourceSnapshots=requireArray(manifest.source_snapshots??[],'MANIFEST_SOURCE_SNAPSHOTS_INVALID');if(!sourceSnapshots.length)throw new Error('MANIFEST_SOURCE_SNAPSHOT_MISSING');
  for(const source of sourceSnapshots){requireObject(source,'MANIFEST_SOURCE_SNAPSHOT_INVALID');requireString(source.source_id,'MANIFEST_SOURCE_ID_MISSING');isoDate(source.observed_at,'MANIFEST_SOURCE_OBSERVED_AT_INVALID');if(source.source_manifest_sha256!=null&&!/^[a-f0-9]{64}$/.test(source.source_manifest_sha256))throw new Error('MANIFEST_SOURCE_SHA_INVALID');}
  const gates=releaseGateStatus(env);const manifestSha=sha256(manifestFile.bytes);
  const expectedId=env.EXPECTED_SNAPSHOT_ID||null;const expectedManifest=env.EXPECTED_MANIFEST_SHA256||null;
  const identityMatch=(!expectedId||expectedId===snapshotId)&&(!expectedManifest||expectedManifest===manifestSha);
  if(expectedId&&expectedId!==snapshotId)throw new Error(`EXPECTED_SNAPSHOT_ID_MISMATCH:${snapshotId}`);
  if(expectedManifest&&expectedManifest!==manifestSha)throw new Error(`EXPECTED_MANIFEST_SHA256_MISMATCH:${manifestSha}`);
  return{
    schema_version:'1.0.0',audit_state:'VALIDATED_PRIVATE_SNAPSHOT',audited_at:new Date().toISOString(),
    snapshot_id:snapshotId,manifest_sha256:manifestSha,publication_state:manifest.publication_state,
    counts:{...expected,prisons:prisons.prisons,news:news.news,reports:reports.reports,disputed_people:people.disputed,people_with_permitted_portrait:people.with_portrait,duplicate_display_name_groups:people.duplicate_display_name_groups},
    file_digests:fileDigests,source_snapshot_count:sourceSnapshots.length,
    controls:{outside_public_repo:testMode?'TEST_MODE':'PASS',unexpected_files:0,fixture_records:0,forbidden_private_or_editorial_fields:0,manifest_integrity:'PASS',source_attribution:'PASS',high_risk_event_review:'PASS',political_prisoner_autodesignation:false,public_repo_mutated:false,network_access_used:false},
    release_gates:gates.gates,identity_match:identityMatch,release_ready:gates.all_pass&&identityMatch
  };
}

export function sanitizedAuditSummary(report){
  const clean=structuredClone(report);delete clean.file_digests;return clean;
}

export{REQUIRED_RELEASE_GATES,repoRoot,inside,sha256};
