import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { createHash } from 'node:crypto';
import { loadMediaRegistry, sourceById, normalizeHost } from '../lib/media-registry.mjs';
import { classifyMediaText } from '../lib/media-classifier.mjs';
import { assignOrigin } from '../lib/source-independence.mjs';
import { parseDiscoveryFeed } from '../lib/feed-parser.mjs';

const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const CONTENT_TYPES = ['text/html','text/plain','application/rss+xml','application/atom+xml','application/xml','text/xml'];

function isForbiddenIp(address) {
  const family = isIP(address);
  if (family === 4) {
    const p = address.split('.').map(Number);
    if (p[0] === 0 || p[0] === 10 || p[0] === 127) return true;
    if (p[0] === 169 && p[1] === 254) return true;
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true;
    if (p[0] >= 224) return true;
  }
  if (family === 6) {
    const a = address.toLowerCase();
    if (a === '::1' || a === '::') return true;
    if (/^fe[89ab]/.test(a) || a.startsWith('fc') || a.startsWith('fd')) return true;
    if (a.startsWith('::ffff:') && isIP(a.slice(7)) === 4) return isForbiddenIp(a.slice(7));
  }
  return false;
}

export async function assertPublicDns(hostname, resolver=lookup) {
  const records = await resolver(hostname,{all:true,verbatim:true});
  if (!records.length) throw new Error('MEDIA_DNS_EMPTY');
  for (const record of records) if (!isIP(record.address) || isForbiddenIp(record.address)) throw new Error(`MEDIA_DNS_FORBIDDEN_ADDRESS:${record.address}`);
  return records;
}

export function validateSourceUrl(source, input) {
  const url = new URL(input);
  if (url.protocol !== 'https:') throw new Error('MEDIA_HTTPS_ONLY');
  if (url.username || url.password) throw new Error('MEDIA_URL_CREDENTIALS_FORBIDDEN');
  const host = normalizeHost(url.hostname);
  const allowed = (source.canonical_domains || []).some(domain => { const d=normalizeHost(domain); return host===d || host.endsWith(`.${d}`); });
  if (!allowed) throw new Error(`MEDIA_SOURCE_DOMAIN_NOT_ALLOWED:${host}`);
  return url;
}

function liveGate(source) {
  if (process.env.MEDIA_MONITOR_NETWORK_GATE !== 'PASS') throw new Error('MEDIA_MONITOR_NETWORK_GATE_NOT_PASS');
  if (process.env.FETCHER_SECURITY_GATE !== 'PASS') throw new Error('FETCHER_SECURITY_GATE_NOT_PASS');
  if (process.env.MEDIA_SOURCE_REUSE_GATE !== 'PASS') throw new Error('MEDIA_SOURCE_REUSE_GATE_NOT_PASS');
  if (!['PERMITTED','LEGAL_REVIEWED'].includes(source.legal_reuse_state)) throw new Error(`MEDIA_SOURCE_LEGAL_REUSE_NOT_CLEARED:${source.source_id}`);
  if (!source.candidate_discovery_enabled || source.monitoring_state !== 'ACTIVE_VERIFIED') throw new Error(`MEDIA_SOURCE_NOT_ENABLED:${source.source_id}`);
}

export async function fetchMediaText(source,input,{timeoutMs=15000,fetchImpl=fetch,resolver=lookup}={}) {
  liveGate(source);
  const url=validateSourceUrl(source,input); await assertPublicDns(url.hostname,resolver);
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try {
    const response=await fetchImpl(url,{redirect:'manual',signal:controller.signal,headers:{'user-agent':'CHUDZINOVICH-HRC-MediaMonitor/0.5 (+https://chudzinovich.pp.ua)'}});
    if (response.status>=300 && response.status<400) throw new Error('MEDIA_REDIRECT_BLOCKED');
    if (!response.ok) throw new Error(`MEDIA_HTTP_STATUS:${response.status}`);
    const contentType=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
    if (!CONTENT_TYPES.includes(contentType)) throw new Error(`MEDIA_CONTENT_TYPE_BLOCKED:${contentType||'missing'}`);
    if (Number(response.headers.get('content-length')||0)>MAX_RESPONSE_BYTES) throw new Error('MEDIA_RESPONSE_TOO_LARGE');
    let size=0; const chunks=[];
    for await (const chunk of response.body) { size+=chunk.byteLength; if (size>MAX_RESPONSE_BYTES) throw new Error('MEDIA_RESPONSE_TOO_LARGE'); chunks.push(chunk); }
    return Buffer.concat(chunks).toString('utf8');
  } finally { clearTimeout(timer); }
}

function stripTags(value='') { return value.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim(); }
export function extractArticleMetadata(html,articleUrl) {
  const title=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'';
  const desc=html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']*)["']/i)?.[1]||'';
  const published=html.match(/<meta[^>]+(?:property|name)=["'](?:article:published_time|datePublished)["'][^>]+content=["']([^"']+)["']/i)?.[1]||null;
  return {article_url:String(articleUrl),title:stripTags(title),summary:stripTags(desc),published_at:published};
}

export function buildMediaObservation(source,metadata,{observed_at=new Date().toISOString(),person_names=[],upstream_source=null,foreignJurisdiction=false}={}) {
  const c=classifyMediaText({title:metadata.title,summary:metadata.summary,foreignJurisdiction});
  const observation_id='mo-'+createHash('sha256').update(`${source.source_id}|${metadata.article_url}`).digest('hex').slice(0,16);
  return assignOrigin({observation_id,source_id:source.source_id,article_url:metadata.article_url,title:metadata.title||'',summary:metadata.summary||'',published_at:metadata.published_at||null,observed_at,event_hint:c.event_hint,person_names,upstream_source,origin_claim_id:'',independence_group:'',classification:c.classification,high_risk_flags:c.high_risk_flags,source_claim_only:true,publication_state:'PRIVATE_DISCOVERY_ONLY'});
}

export async function fetchObservation(sourceId,articleUrl,options={}) {
  const registry=await loadMediaRegistry(); const source=sourceById(registry,sourceId);
  if (!source) throw new Error(`UNKNOWN_MEDIA_SOURCE:${sourceId}`);
  const html=await fetchMediaText(source,articleUrl,options);
  return buildMediaObservation(source,extractArticleMetadata(html,articleUrl),options);
}

export async function fetchEndpointObservations(sourceId,endpointId,options={}) {
  const registry = await loadMediaRegistry();
  const source = sourceById(registry,sourceId);
  if (!source) throw new Error(`UNKNOWN_MEDIA_SOURCE:${sourceId}`);
  const endpoint = (source.endpoint_audit?.endpoints || []).find(item => item.endpoint_id === endpointId);
  if (!endpoint) throw new Error(`UNKNOWN_MEDIA_ENDPOINT:${sourceId}:${endpointId}`);
  if (!endpoint.parser_ready || !['RSS','ATOM'].includes(endpoint.kind)) throw new Error(`MEDIA_ENDPOINT_PARSER_NOT_READY:${endpointId}`);
  const xml = await fetchMediaText(source,endpoint.url,options);
  const items = parseDiscoveryFeed(xml,endpoint.url);
  const observations = [];
  const seen = new Set();
  for (const item of items) {
    const articleUrl = validateSourceUrl(source,item.article_url).toString();
    if (seen.has(articleUrl)) continue;
    seen.add(articleUrl);
    observations.push(buildMediaObservation(source,{...item,article_url:articleUrl},options));
  }
  return {source_id:sourceId,endpoint_id:endpointId,scope:endpoint.scope,observations};
}

export const MEDIA_FETCH_POLICY=Object.freeze({arbitrary_urls:false,redirects:false,runtime_browser_requests:false,live_network_gated:true,verified_endpoint_only:true});
