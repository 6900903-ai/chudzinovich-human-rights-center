const CYRILLIC = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
  і:'i',ў:'u',ґ:'g'
};

export const STATUS = Object.freeze({
  CURRENT: 'POLITICAL_PRISONER',
  FORMER: 'FORMER_POLITICAL_PRISONER',
  REPRESSED: 'REPRESSION_DOCUMENTED'
});

const CLOSED_STATES = new Set(['RETRACTED', 'SUPERSEDED']);

export function localized(value, lang = 'ru', fallback = '') {
  if (value == null) return fallback;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') return value[lang] || value.ru || value.be || value.en || value.pl || fallback;
  return fallback;
}

export function personName(person, lang = 'ru') {
  return localized(person.canonical_name, lang, person.person_id);
}

export function slugify(value) {
  const source = String(value || '').toLocaleLowerCase('ru').normalize('NFD').replace(/\p{Diacritic}/gu, '');
  let out = '';
  for (const ch of source) out += CYRILLIC[ch] ?? ch;
  return out
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'person';
}

export function profileRelativePath(person, lang = 'ru') {
  return `/prisoners/${person.person_id}-${slugify(personName(person, lang))}/`;
}

export function prisonRelativePath(prison, lang = 'ru') {
  const id = prison.prison_id || 'prison';
  return `/prisons/${id}-${slugify(localized(prison.name || prison.names, lang, id))}/`;
}

function dateValue(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.value || '';
}

function sortByDateThenOrder(events = []) {
  return events
    .map((event, index) => ({ event, index, key: dateValue(event.effective_date || event.date || event.event_date || event.detention_date || event.verdict_date || event.release_date || event.started_at) }))
    .sort((a, b) => (a.key || '').localeCompare(b.key || '') || a.index - b.index);
}

export function latestStatusEvent(person) {
  const eligible = (person.status_events || []).filter(event => event && !CLOSED_STATES.has(event.state));
  return sortByDateThenOrder(eligible).at(-1)?.event || null;
}

export function categoryFor(person) {
  const status = latestStatusEvent(person)?.status;
  if (status === STATUS.CURRENT) return 'prisoners';
  if (status === STATUS.FORMER) return 'former-prisoners';
  return 'repressed';
}

export function categoriesFor(person) {
  const categories = ['repressed'];
  const primary = categoryFor(person);
  if (primary !== 'repressed') categories.unshift(primary);
  return categories;
}

export function latestCurrentPrisonPlacement(person) {
  const placements = (person.prison_placements || []).filter(event => event && !CLOSED_STATES.has(event.state));
  const explicit = placements.filter(event => event.current === true);
  return sortByDateThenOrder(explicit).at(-1)?.event || null;
}

export function extractArticles(person) {
  const values = new Set();
  for (const charge of person.charges || []) {
    for (const article of charge?.articles || []) if (article) values.add(String(article));
    if (charge?.article) values.add(String(charge.article));
  }
  return [...values].sort();
}

export function sourceById(person, sourceId) {
  return (person.sources || []).find(source => source?.source_id === sourceId) || null;
}

export function sourceAttribution(person, event) {
  if (!event) return null;
  const source = sourceById(person, event.source_id);
  if (source) return source;
  if (event.source_url || event.source_name) {
    return {
      source_id: event.source_id || null,
      name: event.source_name || event.source_id || 'Source',
      url: event.source_url || null,
      published_at: event.source_published_at || null,
      observed_at: event.source_observed_at || null,
      human_verified_at: event.human_verified_at || null
    };
  }
  return null;
}

export function sourceName(source, lang = 'ru') {
  return localized(source?.name, lang, source?.source_id || '');
}

export function sourceUrl(source) {
  if (!source) return null;
  return source.url || source.source_url || null;
}

export function latestVerifiedAt(person) {
  const values = [];
  for (const source of person.sources || []) {
    for (const key of ['human_verified_at', 'observed_at', 'source_observed_at']) if (source?.[key]) values.push(source[key]);
  }
  for (const event of [...(person.status_events || []), ...(person.detentions || []), ...(person.judgments || []), ...(person.sentences || []), ...(person.prison_placements || []), ...(person.release_events || [])]) {
    for (const key of ['human_verified_at', 'source_observed_at', 'observed_at']) if (event?.[key]) values.push(event[key]);
  }
  return values.sort().at(-1) || null;
}

export function normalizeSearch(value) {
  return String(value || '').toLocaleLowerCase('ru').normalize('NFD').replace(/\p{Diacritic}/gu, '').replaceAll('ё', 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function buildSearchRecord(person, lang, routeFn) {
  const statusEvent = latestStatusEvent(person);
  const prison = latestCurrentPrisonPlacement(person);
  const articles = extractArticles(person);
  const rawTokens = [
    personName(person, 'ru'), personName(person, 'be'), personName(person, 'en'), personName(person, 'pl'),
    ...(person.aliases || []),
    localized(person.region, 'ru', ''), localized(person.region, 'be', ''), localized(person.region, 'en', ''), localized(person.region, 'pl', ''),
    localized(prison?.prison_name || prison?.name, 'ru', ''), localized(prison?.prison_name || prison?.name, 'be', ''), localized(prison?.prison_name || prison?.name, 'en', ''), localized(prison?.prison_name || prison?.name, 'pl', ''),
    ...articles
  ].filter(Boolean);
  const translitTokens = rawTokens.map(token => slugify(token).replaceAll('-', ' '));
  return {
    id: person.person_id,
    name: personName(person, lang),
    aliases: person.aliases || [],
    profile_url: routeFn(lang, profileRelativePath(person, lang)),
    categories: categoriesFor(person),
    status: statusEvent?.status || null,
    designation: statusEvent?.designation || null,
    gender: person.gender || 'UNKNOWN',
    prison_id: prison?.prison_id || null,
    prison_name: localized(prison?.prison_name || prison?.name, lang, ''),
    region: localized(person.region, lang, ''),
    articles,
    updated_at: latestVerifiedAt(person),
    search_text: normalizeSearch([...rawTokens, ...translitTokens].join(' '))
  };
}

export function paginate(items, pageSize = 48) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  return Array.from({ length: totalPages }, (_, index) => ({
    page: index + 1,
    totalPages,
    items: items.slice(index * pageSize, (index + 1) * pageSize)
  }));
}

export function publishedPeople(people, { allowFixtures = false } = {}) {
  return (people || []).filter(person => {
    if (!allowFixtures && person.fixture === true) return false;
    return ['PUBLIC_CONFIRMED', 'PUBLIC_SOURCE_ATTRIBUTED', 'PUBLIC_DISPUTED'].includes(person.publication_state);
  });
}
