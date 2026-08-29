const MAX_ITEMS = 100;
const MAX_TEXT = 20000;

function decodeEntities(value='') {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
    .replace(/&#x([0-9a-f]+);/gi,(_,hex) => String.fromCodePoint(Number.parseInt(hex,16)))
    .replace(/&#(\d+);/g,(_,n) => String.fromCodePoint(Number.parseInt(n,10)))
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#39;/g,"'");
}

function plainText(value='') {
  return decodeEntities(value).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,MAX_TEXT);
}

function tagValue(block, names) {
  for (const name of names) {
    const escaped = name.replace(':','\\:');
    const match = block.match(new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}>`,'i'));
    if (match) return decodeEntities(match[1]).trim();
  }
  return '';
}

function atomLink(block) {
  const candidates = [...block.matchAll(/<link\b([^>]*)>/gi)];
  for (const match of candidates) {
    const attrs = match[1];
    const rel = attrs.match(/\brel=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const href = attrs.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (href && (!rel || rel === 'alternate')) return decodeEntities(href);
  }
  return '';
}

function normalizeArticleUrl(value, endpointUrl) {
  if (!value) return null;
  try {
    const url = new URL(value.trim(), endpointUrl);
    if (!['http:','https:'].includes(url.protocol)) return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function parseRss(xml, endpointUrl) {
  const blocks = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0,MAX_ITEMS).map(match => match[1]);
  return blocks.map(block => {
    const link = tagValue(block,['link']) || tagValue(block,['guid']);
    const article_url = normalizeArticleUrl(link,endpointUrl);
    return {
      article_url,
      title:plainText(tagValue(block,['title'])),
      summary:plainText(tagValue(block,['description','content:encoded','content'])),
      published_at:normalizeDate(tagValue(block,['pubDate','dc:date','date']))
    };
  }).filter(item => item.article_url && item.title);
}

function parseAtom(xml, endpointUrl) {
  const blocks = [...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)].slice(0,MAX_ITEMS).map(match => match[1]);
  return blocks.map(block => {
    const article_url = normalizeArticleUrl(atomLink(block) || tagValue(block,['id']),endpointUrl);
    return {
      article_url,
      title:plainText(tagValue(block,['title'])),
      summary:plainText(tagValue(block,['summary','content'])),
      published_at:normalizeDate(tagValue(block,['published','updated']))
    };
  }).filter(item => item.article_url && item.title);
}

export function parseDiscoveryFeed(xml, endpointUrl) {
  const text = String(xml || '');
  if (text.length === 0) throw new Error('MEDIA_FEED_EMPTY');
  if (/<!DOCTYPE/i.test(text) || /<!ENTITY/i.test(text)) throw new Error('MEDIA_FEED_DTD_FORBIDDEN');
  if (/<rss\b/i.test(text) || /<rdf:RDF\b/i.test(text)) return parseRss(text,endpointUrl);
  if (/<feed\b/i.test(text) && /xmlns(?:=["'][^"']*Atom|:[^=]+=["'][^"']*Atom)/i.test(text)) return parseAtom(text,endpointUrl);
  if (/<feed\b/i.test(text)) return parseAtom(text,endpointUrl);
  throw new Error('MEDIA_FEED_FORMAT_UNSUPPORTED');
}

export const FEED_PARSER_POLICY = Object.freeze({
  max_items:MAX_ITEMS,
  executes_xml_entities:false,
  allows_dtd:false,
  article_fetch_implicit:false
});
