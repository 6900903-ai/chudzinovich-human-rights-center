import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { classifyMediaText } from '../lib/media-classifier.mjs';
import { loadTelegramRegistry, telegramSourceByHandle } from '../lib/telegram-registry.mjs';

const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;

function decodeEntities(value = '') {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function textOnly(value = '') {
  return decodeEntities(String(value)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();
}

export function validateTelegramPreviewUrl(source, input) {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.hostname !== 't.me') throw new Error('TELEGRAM_PREVIEW_DOMAIN_FORBIDDEN');
  if (url.username || url.password) throw new Error('TELEGRAM_URL_CREDENTIALS_FORBIDDEN');
  const expected = `/s/${source.handle}`.toLowerCase();
  if (!url.pathname.toLowerCase().startsWith(expected)) throw new Error(`TELEGRAM_HANDLE_PATH_MISMATCH:${source.handle}`);
  return url;
}

function sourceNetworkGate() {
  if (process.env.TELEGRAM_NETWORK_GATE !== 'PASS') throw new Error('TELEGRAM_NETWORK_GATE_NOT_PASS');
  if (process.env.FETCHER_SECURITY_GATE !== 'PASS') throw new Error('FETCHER_SECURITY_GATE_NOT_PASS');
  if (process.env.TELEGRAM_SOURCE_REUSE_GATE !== 'PASS') throw new Error('TELEGRAM_SOURCE_REUSE_GATE_NOT_PASS');
}

export async function fetchTelegramPreview(source, input = source.preview_url, { fetchImpl = fetch, resolver = lookup, timeoutMs = 15000 } = {}) {
  sourceNetworkGate();
  const url = validateTelegramPreviewUrl(source, input);
  const records = await resolver('t.me', { all:true, verbatim:true });
  if (!records.length) throw new Error('TELEGRAM_DNS_EMPTY');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      redirect:'manual', signal:controller.signal,
      headers:{'user-agent':'CHUDO-HRC-TelegramMonitor/0.1 (+https://chudzinovich.pp.ua)'}
    });
    if (response.status >= 300 && response.status < 400) throw new Error('TELEGRAM_REDIRECT_BLOCKED');
    if (!response.ok) throw new Error(`TELEGRAM_HTTP_STATUS:${response.status}`);
    const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (contentType !== 'text/html') throw new Error(`TELEGRAM_CONTENT_TYPE_BLOCKED:${contentType || 'missing'}`);
    if (Number(response.headers.get('content-length') || 0) > MAX_RESPONSE_BYTES) throw new Error('TELEGRAM_RESPONSE_TOO_LARGE');
    let size = 0;
    const chunks = [];
    for await (const chunk of response.body) {
      size += chunk.byteLength;
      if (size > MAX_RESPONSE_BYTES) throw new Error('TELEGRAM_RESPONSE_TOO_LARGE');
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
  } finally {
    clearTimeout(timer);
  }
}

function blockMatches(html) {
  const blocks = [];
  const re = /<div[^>]+class=["'][^"']*tgme_widget_message_wrap[^"']*["'][^>]*>([\s\S]*?)(?=<div[^>]+class=["'][^"']*tgme_widget_message_wrap|$)/gi;
  let match;
  while ((match = re.exec(html))) blocks.push(match[0]);
  return blocks;
}

export function assessTelegramMaterial(source, material) {
  const classification = classifyMediaText({ title:material.text.slice(0,240), summary:material.text });
  const privateData = /(?:домашн(?:ий|его) адрес|адрес проживания|номер телефона|телефон\s*[:：]|паспортн|личный номер|место жительства\s*[:：])/iu.test(material.text)
    || /\+?\d[\d() .-]{8,}\d/u.test(material.text)
    || /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu.test(material.text);
  const allegation = /(?:агент(?:ура)?|доносчик|предатель|коллаборант|коррупц|мошенник|вор\b|сотрудник\s+(?:кгб|мвд)|работает\s+на\s+(?:кгб|фсб))/iu.test(material.text);
  const highRisk = classification.high_risk_flags.length > 0;
  const strictSource = source.publication_policy === 'STRICT_REVIEW_NO_PRIVATE_DATA';
  const allegationReview = source.publication_policy === 'REVIEW_REQUIRED_FOR_ALLEGATIONS' && allegation;

  if (privateData) return { state:'BLOCK_PRIVATE_DATA', classification, allegation, private_data:true, publication_allowed:false };
  if (highRisk || strictSource || allegationReview) return { state:'PRIVATE_REVIEW_REQUIRED', classification, allegation, private_data:false, publication_allowed:false };
  return { state:'PUBLIC_SUMMARY_ELIGIBLE', classification, allegation, private_data:false, publication_allowed:true };
}

export function parseTelegramPublicPreview(html, source) {
  const materials = [];
  for (const block of blockMatches(String(html))) {
    const postRef = block.match(/data-post=["']([^"']+)["']/i)?.[1]
      || block.match(/href=["']https:\/\/t\.me\/([^"']+\/\d+)["']/i)?.[1];
    if (!postRef) continue;
    const [handle, postId] = postRef.split('/');
    if (handle.toLowerCase() !== source.handle.toLowerCase() || !/^\d+$/.test(postId || '')) continue;
    const textHtml = block.match(/<div[^>]+class=["'][^"']*tgme_widget_message_text[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] || '';
    const text = textOnly(textHtml);
    if (!text) continue;
    const publishedAt = block.match(/<time[^>]+datetime=["']([^"']+)["']/i)?.[1] || null;
    const postUrl = `https://t.me/${source.handle}/${postId}`;
    const material = {
      material_id: 'tgm-' + createHash('sha256').update(`${source.source_id}|${postId}`).digest('hex').slice(0,16),
      source_id: source.source_id,
      handle: source.handle,
      post_id: postId,
      post_url: postUrl,
      text,
      published_at: publishedAt,
      source_claim_only: true,
      full_republication_allowed: false,
      publication_mode: 'ATTRIBUTED_SUMMARY_AND_SHORT_QUOTE'
    };
    material.assessment = assessTelegramMaterial(source, material);
    materials.push(material);
  }
  return materials;
}

export async function parseRequiredTelegramChannel(handle, html) {
  const registry = await loadTelegramRegistry();
  const source = telegramSourceByHandle(registry, handle);
  if (!source) throw new Error(`TELEGRAM_SOURCE_NOT_REGISTERED:${handle}`);
  return parseTelegramPublicPreview(html, source);
}

export const TELEGRAM_PUBLICATION_POLICY = Object.freeze({
  political_prisoner_autodesignation:false,
  full_republication_default:false,
  high_risk_autopublish:false,
  private_data_republication:false,
  visitor_runtime_requests:false
});
