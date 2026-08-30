import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { parseCsv } from '../lib/csv.mjs';
import {
  extractCriminalArticles,
  normalizeForMatch,
  normalizeWhitespace,
  parsePartialDate,
  stableIdentityKey
} from '../lib/normalization.mjs';

export const VIASNA_PARSER_VERSION = '0.7.0';
const ALLOWED_HOSTS = new Set(['prisoners.spring96.org', 'spring96.org']);
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = ['text/csv', 'application/csv', 'text/plain', 'application/octet-stream'];

const HEADER_ALIASES = {
  source_record_id: ['id'],
  source_person_url: ['url'],
  name: ['name', 'name and surname', 'имя и фамилия', 'імя і прозвішча'],
  status: ['status', 'статус'],
  birth_date: ['birthday', 'date of birth', 'дата рождения', 'дата нараджэння'],
  gender: ['gender', 'пол'],
  detention_date: ['arrested', 'date of detention', 'дата задержания', 'дата затрымання'],
  charges: ['articles', 'charges indicted', 'предъявлены обвинения', 'прад’яўлены абвінавачванні', "прад'яўлены абвінавачванні"],
  verdict_date: ['verdict_date', 'date of verdict', 'дата приговора', 'дата прысуду'],
  sentence: ['decision', 'sentence', 'решение суда', 'рашэнне суда'],
  penalty: ['penalty', 'вид наказания', 'від пакарання'],
  judge: ['judge', 'судья', 'суддзя'],
  prosecutor: ['prosecutor', 'прокурор', 'пракурор'],
  prison: ['prison', 'место заключения', 'месца зняволення'],
  declaration: ['declaration'],
  release_date: ['release_date'],
  died: ['died']
};

function canonicalHeader(header) {
  const normalized = normalizeForMatch(header);
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.some(alias => normalizeForMatch(alias) === normalized)) return canonical;
  }
  return null;
}

function mapHeaders(headers) {
  const map = new Map();
  for (const header of headers) {
    const canonical = canonicalHeader(header);
    if (canonical && !map.has(canonical)) map.set(canonical, header);
  }
  for (const required of ['name', 'status']) {
    if (!map.has(required)) throw new Error(`VIASNA_REQUIRED_HEADER_MISSING:${required}`);
  }
  return map;
}

function get(record, headerMap, key) {
  const sourceHeader = headerMap.get(key);
  return sourceHeader ? normalizeWhitespace(record[sourceHeader] ?? '') : '';
}

function cleanSourceText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

function getRaw(record, headerMap, key) {
  const sourceHeader = headerMap.get(key);
  return sourceHeader ? cleanSourceText(record[sourceHeader] ?? '') : '';
}

export function validateViasnaUrl(input) {
  const url = new URL(input);
  if (url.protocol !== 'https:') throw new Error('HTTPS_ONLY');
  if (!ALLOWED_HOSTS.has(url.hostname)) throw new Error('SOURCE_DOMAIN_NOT_ALLOWED');
  if (url.username || url.password) throw new Error('URL_CREDENTIALS_FORBIDDEN');
  if (url.port && url.port !== '443') throw new Error('NON_STANDARD_PORT_FORBIDDEN');
  return url;
}

function safeSourcePersonUrl(raw) {
  if (!raw) return null;
  try {
    const url = validateViasnaUrl(raw);
    if (!url.pathname.includes('/person/')) return null;
    return url.href;
  } catch {
    return null;
  }
}

function sourceIdentityKey(recordId, reportedName, birthDate) {
  const id = String(recordId || '').trim();
  if (/^\d+$/.test(id)) return `src-viasna-record:${id}`;
  return reportedName ? stableIdentityKey({ name: reportedName, birthDate }) : null;
}

function isPublicIpv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  return true;
}

function isPublicIpv6(ip) {
  const value = ip.toLowerCase();
  if (value === '::' || value === '::1') return false;
  if (value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe8') || value.startsWith('fe9') || value.startsWith('fea') || value.startsWith('feb')) return false;
  if (value.startsWith('ff')) return false;
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPublicIpv4(mapped[1]);
  return true;
}

export function isPublicIp(ip) {
  const family = isIP(ip);
  if (family === 4) return isPublicIpv4(ip);
  if (family === 6) return isPublicIpv6(ip);
  return false;
}

export async function assertPublicDns(hostname) {
  const results = await lookup(hostname, { all: true, verbatim: true });
  if (!results.length) throw new Error('SOURCE_DNS_EMPTY');
  for (const result of results) if (!isPublicIp(result.address)) throw new Error(`SOURCE_DNS_NON_PUBLIC:${result.address}`);
  return results;
}

function assertExpectedContentType(response, expectedKind) {
  const raw = (response.headers.get('content-type') || '').toLowerCase();
  const type = raw.split(';', 1)[0].trim();
  if (expectedKind === 'csv' && !ALLOWED_CONTENT_TYPES.includes(type)) throw new Error(`SOURCE_CONTENT_TYPE_UNEXPECTED:${type || 'missing'}`);
  return type;
}

function rejectErrorLikeBody(text) {
  const prefix = text.slice(0, 4096).toLocaleLowerCase('en');
  if (/<html[\s>]/i.test(prefix) && /(login|sign in|forbidden|access denied|captcha|cloudflare|error)/i.test(prefix)) throw new Error('SOURCE_ERROR_OR_LOGIN_HTML');
}

export async function fetchViasnaText(input, { timeoutMs = 15000, expectedKind = 'csv' } = {}) {
  if (process.env.VIASNA_DATA_REUSE_GATE !== 'PASS') throw new Error('VIASNA_DATA_REUSE_GATE_NOT_PASS');
  if (process.env.FETCHER_SECURITY_GATE !== 'PASS') throw new Error('FETCHER_SECURITY_GATE_NOT_PASS');
  const url = validateViasnaUrl(input);
  await assertPublicDns(url.hostname);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: 'manual', signal: controller.signal,
      headers: { accept: expectedKind === 'csv' ? 'text/csv,application/csv;q=0.9,text/plain;q=0.5' : 'text/plain', 'user-agent': `CHUDO-HRC-Research-Sync/${VIASNA_PARSER_VERSION} (+https://chudzinovich.pp.ua)` }
    });
    if (response.status >= 300 && response.status < 400) throw new Error('REDIRECT_REQUIRES_REVALIDATION');
    if (!response.ok) throw new Error(`SOURCE_HTTP_${response.status}`);
    const contentType = assertExpectedContentType(response, expectedKind);
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > MAX_RESPONSE_BYTES) throw new Error('SOURCE_RESPONSE_TOO_LARGE');
    const buf = new Uint8Array(await response.arrayBuffer());
    if (buf.byteLength > MAX_RESPONSE_BYTES) throw new Error('SOURCE_RESPONSE_TOO_LARGE');
    const text = new TextDecoder('utf-8', { fatal: false }).decode(buf);
    rejectErrorLikeBody(text);
    return { text, source_url: url.href, fetched_at: new Date().toISOString(), content_type: contentType, bytes: buf.byteLength };
  } finally { clearTimeout(timer); }
}

export function classifyStatusClaim(text) {
  const raw = normalizeWhitespace(text);
  const normalized = normalizeForMatch(raw);
  const exPostFacto = /(recognized ex post facto|признан.*постфактум|прызнан.*постфактум)/iu.test(raw);
  if (normalized === 'active') return { claim_type:'CURRENT_POLITICAL_PRISONER', raw, source_status_code:'active', human_rights_source_asserts:true, attribution_required:true, auto_designation_allowed:false, recognized_ex_post_facto:false };
  if (normalized === 'former') return { claim_type:'FORMER_POLITICAL_PRISONER', raw, source_status_code:'former', human_rights_source_asserts:true, attribution_required:true, auto_designation_allowed:false, recognized_ex_post_facto:false };
  if (normalized === 'np') return { claim_type:'NO_DESIGNATION', raw, source_status_code:'np', human_rights_source_asserts:false, attribution_required:true, auto_designation_allowed:false, recognized_ex_post_facto:false };
  if (!normalized) return { claim_type:'NO_DESIGNATION', raw, source_status_code:null, human_rights_source_asserts:false, attribution_required:false, auto_designation_allowed:false, recognized_ex_post_facto:false };
  if (/(former political prisoner|бывш[^\s]*\s+политзаключ|был[^\s]*\s+палітвяз)/iu.test(raw)) return { claim_type:'FORMER_POLITICAL_PRISONER', raw, source_status_code:null, human_rights_source_asserts:true, attribution_required:true, auto_designation_allowed:false, recognized_ex_post_facto:exPostFacto };
  if (/(political prisoner|политзаключ|палітвяз)/iu.test(raw)) return { claim_type:'CURRENT_POLITICAL_PRISONER', raw, source_status_code:null, human_rights_source_asserts:true, attribution_required:true, auto_designation_allowed:false, recognized_ex_post_facto:exPostFacto };
  return { claim_type:'UNKNOWN_DESIGNATION', raw, source_status_code:null, human_rights_source_asserts:false, attribution_required:true, auto_designation_allowed:false, recognized_ex_post_facto:exPostFacto };
}

function parsePrison(value) {
  const raw = cleanSourceText(value);
  const releaseClaim = /^(released|освобожден|освобожденa|освобождён|освобождена|вызвалены|вызвалена)$/iu.test(raw);
  const atLibertyClaim = /^(находится на свободе до начала отбывания наказания|at liberty before serving sentence);?$/iu.test(raw);
  if (!raw || /^(unknown|неизвестно|невядома)$/iu.test(raw)) return { raw, facility:null, address:null, release_claim:false, at_liberty_claim:false };
  if (releaseClaim) return { raw, facility:null, address:null, release_claim:true, at_liberty_claim:false };
  if (atLibertyClaim) return { raw, facility:null, address:null, release_claim:false, at_liberty_claim:true };
  const lines = raw.split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length > 1) return { raw, facility:lines[0] || null, address:lines.slice(1).join(', ') || null, release_claim:false, at_liberty_claim:false };
  const semi = raw.indexOf(';');
  if (semi >= 0) {
    const facility = raw.slice(0, semi).trim();
    const address = raw.slice(semi + 1).trim().replace(/;$/, '').trim();
    return { raw, facility:facility || null, address:address || null, release_claim:false, at_liberty_claim:false };
  }
  return { raw, facility:raw || null, address:null, release_claim:false, at_liberty_claim:false };
}

export function parseViasnaCsv(csvText, { locale='en', sourceUrl='https://prisoners.spring96.org/en/list', fetchedAt=new Date().toISOString(), observedAt=fetchedAt } = {}) {
  const parsed = parseCsv(csvText, { strictColumns:true });
  const headerMap = mapHeaders(parsed.headers);
  const observations = [];
  const diagnostics = [...parsed.diagnostics];
  for (const { row_number, record } of parsed.records) {
    const sourceRecordId = get(record, headerMap, 'source_record_id');
    const sourcePersonUrl = safeSourcePersonUrl(get(record, headerMap, 'source_person_url'));
    const reportedName = get(record, headerMap, 'name');
    const birthDate = parsePartialDate(get(record, headerMap, 'birth_date'));
    const detentionDate = parsePartialDate(get(record, headerMap, 'detention_date'));
    const verdictDate = parsePartialDate(get(record, headerMap, 'verdict_date'));
    const releaseDate = parsePartialDate(get(record, headerMap, 'release_date'));
    const statusClaim = classifyStatusClaim(get(record, headerMap, 'status'));
    const prison = parsePrison(getRaw(record, headerMap, 'prison'));
    const chargesRaw = get(record, headerMap, 'charges');
    observations.push({
      source_id:'src-viasna', source_url:sourceUrl, source_record_id:sourceRecordId || null, source_person_url:sourcePersonUrl,
      parser_version:VIASNA_PARSER_VERSION, source_locale:locale, row_number, source_observed_at:observedAt, source_fetched_at:fetchedAt,
      canonical_person_id:null, identity_resolution_state:'SOURCE_OBSERVATION_ONLY', reported_name:reportedName, normalized_name:normalizeForMatch(reportedName),
      source_identity_key:sourceIdentityKey(sourceRecordId, reportedName, birthDate), birth_date:birthDate, gender_raw:get(record, headerMap, 'gender'),
      detention_date:detentionDate, charges_raw:chargesRaw, charge_articles:extractCriminalArticles(chargesRaw), verdict_date:verdictDate,
      sentence_raw:get(record, headerMap, 'sentence'), penalty_raw:get(record, headerMap, 'penalty'), judge_raw:get(record, headerMap, 'judge'),
      prosecutor_raw:get(record, headerMap, 'prosecutor'), prison, release_date:releaseDate, release_claim:prison.release_claim,
      declaration_url:safeSourcePersonUrl(get(record, headerMap, 'declaration')) || get(record, headerMap, 'declaration') || null,
      died_raw:get(record, headerMap, 'died'), source_status_claim:statusClaim,
      political_prisoner_autodesignation:false, publication_state:'STAGING_OBSERVATION_ONLY'
    });
  }
  const mappedCanonicalHeaders = [...headerMap.keys()];
  const essential = ['name','status','birth_date','gender','detention_date','charges','verdict_date','sentence','penalty','judge','prison'];
  const coverage = essential.filter(key => headerMap.has(key)).length / essential.length;
  if (coverage < 0.75) diagnostics.push({ code:'VIASNA_HEADER_COVERAGE_LOW', coverage });
  return { source_id:'src-viasna', parser_version:VIASNA_PARSER_VERSION, delimiter:parsed.delimiter, headers:parsed.headers, mapped_headers:mappedCanonicalHeaders, parser_coverage:coverage, observations, diagnostics };
}
