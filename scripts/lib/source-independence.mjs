import { createHash } from 'node:crypto';

function norm(value='') {
  return String(value).toLocaleLowerCase('ru').normalize('NFD').replace(/\p{Diacritic}/gu,'')
    .replaceAll('ё','е').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
}

const UPSTREAM_PATTERNS = [
  ['by-mvd', ['мвд','министерство внутренних дел','містэрства ўнутраных спраў']],
  ['by-investigative-committee', ['следственный комитет','ск беларус','следчы камітэт']],
  ['by-prosecutor-general', ['генеральная прокуратура','генпрокуратура','генеральная пракуратура']],
  ['by-courts', ['пресс-служба суда','суд сообщил','суд паведаміў']],
  ['viasna', ['правозащитный центр весна','правозащитный центр «вясна»','праваабарончы цэнтр вясна','пц вясна']],
  ['by-state-security', ['кгб','комитет государственной безопасности','камітэт дзяржаўнай бяспекі']]
];

export function detectUpstreamSource(input='') {
  const text = norm(input);
  for (const [id, patterns] of UPSTREAM_PATTERNS) if (patterns.some(p => text.includes(norm(p)))) return id;
  return null;
}

export function makeOriginClaimId({ upstream_source=null, source_id, title='', event_hint='UNKNOWN', person_names=[] } = {}) {
  const personKey = [...person_names].map(norm).filter(Boolean).sort().join('|');
  // Conservative grouping prevents RU/BE/transliteration variants of one upstream claim
  // from inflating the independent confirmation count.
  const basis = upstream_source
    ? `upstream:${upstream_source}|event:${event_hint}`
    : `original:${source_id}|event:${event_hint}|persons:${personKey || 'unknown'}|title:${norm(title).slice(0,160)}`;
  return 'oc-' + createHash('sha256').update(basis).digest('hex').slice(0,20);
}

export function assignOrigin(observation) {
  const upstream_source = observation.upstream_source || detectUpstreamSource(`${observation.title || ''}\n${observation.summary || ''}`);
  const origin_claim_id = makeOriginClaimId({ ...observation, upstream_source });
  return { ...observation, upstream_source, origin_claim_id, independence_group: upstream_source ? `upstream:${upstream_source}` : `source:${observation.source_id}` };
}

export function summarizeIndependence(observations=[]) {
  const assigned = observations.map(assignOrigin);
  return {
    observations: assigned,
    source_count: new Set(assigned.map(o => o.source_id)).size,
    independent_origin_count: new Set(assigned.map(o => o.origin_claim_id)).size
  };
}

export function confidenceFromIndependence({ independent_origin_count, hasHumanRightsSource=false } = {}) {
  if (hasHumanRightsSource || independent_origin_count >= 3) return 'CORROBORATED';
  if (independent_origin_count === 2) return 'HIGH';
  return 'LOW';
}
