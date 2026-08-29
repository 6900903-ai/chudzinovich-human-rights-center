function compact(value='') {
  return String(value).replace(/\s+/g,' ').trim();
}

function excerpt(value='', max=360) {
  const text = compact(value);
  if (text.length <= max) return text;
  return text.slice(0,max - 1).trimEnd() + '…';
}

function slugPart(value='') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,48) || 'telegram';
}

export function telegramMaterialToNewsItem(source, material, { published_at = null } = {}) {
  if (!source || source.publication_enabled !== true) throw new Error('TELEGRAM_NEWS_SOURCE_NOT_ENABLED');
  if (!material?.assessment) throw new Error('TELEGRAM_NEWS_ASSESSMENT_MISSING');
  if (material.assessment.publication_allowed !== true) return null;

  const sourceText = String(material.text || '').trim();
  if (!sourceText) throw new Error('TELEGRAM_NEWS_TEXT_EMPTY');

  const canRepublishFullText = source.full_republication_allowed === true;
  const publicText = canRepublishFullText ? sourceText : excerpt(sourceText);
  const firstLine = compact(sourceText.split(/\n+/)[0] || sourceText);
  const title = excerpt(firstLine, 120);
  const published = published_at || material.published_at || new Date().toISOString();
  const postId = String(material.post_id || '').replace(/[^0-9]/g,'') || 'post';

  return {
    news_id:`news-tg-${slugPart(source.handle)}-${postId}`,
    slug:`tg-${slugPart(source.handle)}-${postId}`,
    title:{ru:title},
    summary:{ru:publicText},
    published_at:published,
    source_kind:'TELEGRAM',
    source_id:source.source_id,
    source_name:source.display_name || `@${source.handle}`,
    source_url:material.post_url,
    source_published_at:material.published_at || null,
    publication_state:'PUBLIC_SOURCE_ATTRIBUTED',
    source_claim_only:true,
    editorial_reviewed:false,
    high_risk_flags:[...(material.assessment.classification?.high_risk_flags || [])],
    category:'Telegram'
  };
}

export const TELEGRAM_NEWS_CONVERSION_POLICY = Object.freeze({
  fact_check_required:false,
  manual_editorial_approval_required:false,
  source_attribution_required:true,
  private_data_block_required:true,
  full_text_requires_source_reuse_rights:true
});
