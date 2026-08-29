const PUBLIC_STATES = new Set(['PUBLIC_SOURCE_ATTRIBUTED','PUBLIC_CONFIRMED','PUBLIC_DISPUTED']);

export function localizedNewsValue(value, lang='ru') {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[lang] || value.ru || value.be || value.en || value.pl || '';
}

export function assertPublicNewsItem(item) {
  if (!item || !PUBLIC_STATES.has(item.publication_state)) throw new Error(`NEWS_NOT_PUBLIC:${item?.news_id || 'unknown'}`);
  if (!/^news-[a-z0-9-]+$/.test(item.news_id || '')) throw new Error(`NEWS_ID_INVALID:${item.news_id}`);
  if (!/^[a-z0-9-]+$/.test(item.slug || '')) throw new Error(`NEWS_SLUG_INVALID:${item.news_id}`);
  if (!item.source_id || !item.source_name || !item.source_url) throw new Error(`NEWS_SOURCE_MISSING:${item.news_id}`);
  const url = new URL(item.source_url);
  if (url.protocol !== 'https:') throw new Error(`NEWS_SOURCE_URL_NOT_HTTPS:${item.news_id}`);
  if (!localizedNewsValue(item.title,'ru')) throw new Error(`NEWS_TITLE_MISSING:${item.news_id}`);
  if (!localizedNewsValue(item.summary,'ru')) throw new Error(`NEWS_SUMMARY_MISSING:${item.news_id}`);
  if (!Array.isArray(item.high_risk_flags)) throw new Error(`NEWS_HIGH_RISK_FLAGS_INVALID:${item.news_id}`);

  const attributedTelegram = item.source_kind === 'TELEGRAM' && item.source_claim_only === true;
  if (item.high_risk_flags.length > 0 && item.editorial_reviewed !== true && !attributedTelegram) {
    throw new Error(`HIGH_RISK_NEWS_NOT_REVIEWED:${item.news_id}`);
  }
  if (item.source_kind === 'TELEGRAM' && item.source_claim_only !== true) {
    throw new Error(`TELEGRAM_NEWS_MUST_BE_SOURCE_CLAIM:${item.news_id}`);
  }
  return true;
}

export function publicNewsItems(items = []) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (!PUBLIC_STATES.has(item?.publication_state)) continue;
    assertPublicNewsItem(item);
    if (seen.has(item.news_id)) throw new Error(`DUPLICATE_NEWS_ID:${item.news_id}`);
    seen.add(item.news_id);
    out.push(item);
  }
  return out.sort((a,b) => String(b.published_at).localeCompare(String(a.published_at)));
}

export function newsRelativePath(item) {
  return `/news/${item.slug}/`;
}
