import { createHash } from 'node:crypto';
import { assertPublicDns, validateViasnaUrl } from '../adapters/viasna.mjs';

const MAX_HTML_BYTES = 4 * 1024 * 1024;
const MAX_CSV_BYTES = 16 * 1024 * 1024;
const HTML_CONTENT_TYPES = new Set(['text/html', 'application/xhtml+xml']);
const CSV_CONTENT_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/plain',
  'application/octet-stream',
  'binary/octet-stream'
]);

function decodeEntityToken(token) {
  const lower = token.toLowerCase();
  const named = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
  if (Object.hasOwn(named, lower)) return named[lower];
  if (lower.startsWith('#x')) {
    const value = Number.parseInt(lower.slice(2), 16);
    return Number.isFinite(value) && value >= 0 && value <= 0x10ffff ? String.fromCodePoint(value) : `&${token};`;
  }
  if (lower.startsWith('#')) {
    const value = Number.parseInt(lower.slice(1), 10);
    return Number.isFinite(value) && value >= 0 && value <= 0x10ffff ? String.fromCodePoint(value) : `&${token};`;
  }
  return `&${token};`;
}

export function decodeBasicHtmlEntities(value = '') {
  return String(value).replace(/&([a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);/g, (_match, token) => decodeEntityToken(token));
}

function attributeValue(attributes, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(attributes).match(new RegExp(`\\b${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\\x60]+))`, 'i'));
  return match ? decodeBasicHtmlEntities(match[1] ?? match[2] ?? match[3] ?? '').trim() : null;
}

function hasBooleanAttribute(attributes, name) {
  return new RegExp(`(?:^|\\s)${name}(?:\\s|=|$)`, 'i').test(String(attributes));
}

function textContent(value = '') {
  return decodeBasicHtmlEntities(String(value).replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizedCandidateUrl(url) {
  const normalized = new URL(url.href);
  normalized.hash = '';
  const pairs = [...normalized.searchParams.entries()].sort(([ak, av], [bk, bv]) => ak.localeCompare(bk) || av.localeCompare(bv));
  normalized.search = '';
  for (const [key, value] of pairs) normalized.searchParams.append(key, value);
  return normalized.href;
}

function candidateSignals(url, label, attributes, baseUrl) {
  const normalizedLabel = label.toLowerCase().replace(/[()\[\]{}]/g, '').trim();
  const path = decodeURIComponent(url.pathname).toLowerCase();
  const query = decodeURIComponent(url.search).toLowerCase();
  const href = decodeURIComponent(url.href).toLowerCase();
  const exactCsvLabel = normalizedLabel === 'csv' || normalizedLabel === 'скачать csv' || normalizedLabel === 'download csv';
  const csvLabel = /(^|\s)csv($|\s)/i.test(normalizedLabel);
  const csvExtension = /\.csv(?:$|[?#])/i.test(href);
  const csvQuery = /(?:^|[?&])(csv|format|type|output|download|export|file)(?:=|%3d)(?:csv|1|true)(?:&|$)/i.test(url.search) || /(?:^|[?&])(?:csv)(?:&|=|$)/i.test(url.search);
  const exportPath = /(?:^|\/)(?:csv|export|download)(?:\/|\.|$)/i.test(path);
  const downloadAttribute = hasBooleanAttribute(attributes, 'download');
  const samePath = url.pathname === baseUrl.pathname;
  let score = 0;
  if (exactCsvLabel) score += 140;
  else if (csvLabel) score += 90;
  if (csvExtension) score += 80;
  if (csvQuery) score += 70;
  if (exportPath) score += 45;
  if (downloadAttribute) score += 20;
  if (samePath) score += 10;
  return { score, exactCsvLabel, csvLabel, csvExtension, csvQuery, exportPath, downloadAttribute, samePath, query };
}

export function discoverViasnaCsvExport(html, pageUrl) {
  const baseUrl = validateViasnaUrl(pageUrl);
  const byUrl = new Map();
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorPattern.exec(String(html))) !== null) {
    const attributes = match[1] || '';
    const rawHref = attributeValue(attributes, 'href');
    if (!rawHref || rawHref.startsWith('#') || /^(?:javascript|data|mailto|tel):/i.test(rawHref)) continue;
    let url;
    try {
      url = validateViasnaUrl(new URL(rawHref, baseUrl).href);
    } catch {
      continue;
    }
    if (url.hostname !== baseUrl.hostname) continue;
    url.hash = '';
    const label = textContent(match[2]);
    const signals = candidateSignals(url, label, attributes, baseUrl);
    if (signals.score < 70) continue;
    const key = normalizedCandidateUrl(url);
    const candidate = { url: key, label, score: signals.score, signals };
    const previous = byUrl.get(key);
    if (!previous || candidate.score > previous.score) byUrl.set(key, candidate);
  }

  const candidates = [...byUrl.values()].sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));
  if (!candidates.length) throw new Error('VIASNA_CSV_EXPORT_LINK_NOT_FOUND');
  const topScore = candidates[0].score;
  const top = candidates.filter(candidate => candidate.score === topScore);
  if (top.length > 1) throw new Error(`VIASNA_CSV_EXPORT_LINK_AMBIGUOUS:${top.map(candidate => candidate.url).join('|')}`);
  return {
    page_url: baseUrl.href,
    selected_url: candidates[0].url,
    selected_label: candidates[0].label,
    selected_score: candidates[0].score,
    candidate_count: candidates.length,
    candidates
  };
}

function assertGate(name, env) {
  if (env[name] !== 'PASS') throw new Error(`${name}_NOT_PASS`);
}

function expectedTypes(kind) {
  if (kind === 'html') return HTML_CONTENT_TYPES;
  if (kind === 'csv') return CSV_CONTENT_TYPES;
  throw new Error(`VIASNA_DISCOVERY_KIND_UNSUPPORTED:${kind}`);
}

function acceptHeader(kind) {
  if (kind === 'html') return 'text/html,application/xhtml+xml;q=0.9';
  return 'text/csv,application/csv;q=0.95,application/vnd.ms-excel;q=0.9,text/plain;q=0.6,application/octet-stream;q=0.3';
}

function rejectUnexpectedBody(text, kind) {
  const prefix = text.slice(0, 8192).toLowerCase();
  if (kind === 'html') {
    if (!/<(?:!doctype\s+html|html|body|a)\b/i.test(prefix)) throw new Error('VIASNA_LIST_RESPONSE_NOT_HTML');
    if (/(captcha|access denied|forbidden|cloudflare ray id|sign in|login required)/i.test(prefix)) throw new Error('VIASNA_LIST_ACCESS_INTERSTITIAL');
  } else if (/<(?:!doctype\s+html|html|body)\b/i.test(prefix)) {
    throw new Error('VIASNA_EXPORT_RETURNED_HTML');
  }
}

export async function fetchViasnaDiscoveryResource(input, {
  kind,
  timeoutMs = 20000,
  env = process.env,
  fetchImpl = fetch,
  dnsCheck = assertPublicDns
} = {}) {
  assertGate('VIASNA_DATA_REUSE_GATE', env);
  assertGate('FETCHER_SECURITY_GATE', env);
  const url = validateViasnaUrl(input);
  await dnsCheck(url.hostname);
  const types = expectedTypes(kind);
  const maxBytes = kind === 'html' ? MAX_HTML_BYTES : MAX_CSV_BYTES;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('VIASNA_DISCOVERY_TIMEOUT')), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      redirect: 'manual',
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        accept: acceptHeader(kind),
        'accept-encoding': 'identity',
        'user-agent': 'CHUDO-HRC-Viasna-Export-Discovery/0.1 (+https://chudzinovich.pp.ua)'
      }
    });
    if (response.status >= 300 && response.status < 400) throw new Error('VIASNA_DISCOVERY_REDIRECT_REQUIRES_REVALIDATION');
    if (!response.ok) throw new Error(`VIASNA_DISCOVERY_HTTP_${response.status}`);
    const contentType = String(response.headers.get('content-type') || '').toLowerCase().split(';', 1)[0].trim();
    if (!types.has(contentType)) throw new Error(`VIASNA_DISCOVERY_CONTENT_TYPE_UNEXPECTED:${contentType || 'missing'}`);
    const declared = Number(response.headers.get('content-length') || 0);
    if (Number.isFinite(declared) && declared > maxBytes) throw new Error('VIASNA_DISCOVERY_RESPONSE_TOO_LARGE');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0) throw new Error('VIASNA_DISCOVERY_RESPONSE_EMPTY');
    if (bytes.byteLength > maxBytes) throw new Error('VIASNA_DISCOVERY_RESPONSE_TOO_LARGE');
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes).replace(/^\uFEFF/, '');
    rejectUnexpectedBody(text, kind);
    return {
      text,
      bytes: bytes.byteLength,
      content_type: contentType,
      source_url: url.href,
      fetched_at: new Date().toISOString(),
      sha256: createHash('sha256').update(bytes).digest('hex')
    };
  } finally {
    clearTimeout(timer);
  }
}
