import { parseViasnaCsv } from './adapters/viasna.mjs';
import { discoverViasnaCsvExport, fetchViasnaDiscoveryResource } from './lib/viasna-export-discovery.mjs';

const pageUrl = process.env.VIASNA_SOURCE_PAGE_URL || 'https://prisoners.spring96.org/ru/list';
const locale = process.env.VIASNA_SOURCE_LOCALE || 'ru';
const minimumObservations = Number.parseInt(process.env.VIASNA_MIN_OBSERVATIONS || '5000', 10);
if (!Number.isInteger(minimumObservations) || minimumObservations < 1) throw new Error('VIASNA_MIN_OBSERVATIONS_INVALID');

const listPage = await fetchViasnaDiscoveryResource(pageUrl, { kind: 'html' });
const discovery = discoverViasnaCsvExport(listPage.text, listPage.source_url);
const csvExport = await fetchViasnaDiscoveryResource(discovery.selected_url, { kind: 'csv' });
const parsed = parseViasnaCsv(csvExport.text, {
  locale,
  sourceUrl: discovery.selected_url,
  fetchedAt: csvExport.fetched_at,
  observedAt: csvExport.fetched_at
});

if (parsed.observations.length < minimumObservations) {
  throw new Error(`VIASNA_EXPORT_OBSERVATION_COUNT_TOO_LOW:${parsed.observations.length}:${minimumObservations}`);
}
if (parsed.parser_coverage < 0.75) throw new Error(`VIASNA_EXPORT_PARSER_COVERAGE_TOO_LOW:${parsed.parser_coverage}`);
const columnMismatchCount = parsed.diagnostics.filter(item => item.code === 'CSV_COLUMN_COUNT_MISMATCH').length;
if (columnMismatchCount > 0) throw new Error(`VIASNA_EXPORT_COLUMN_MISMATCH:${columnMismatchCount}`);
const emptyNameCount = parsed.observations.filter(item => !item.reported_name).length;
if (emptyNameCount / parsed.observations.length > 0.01) {
  throw new Error(`VIASNA_EXPORT_EMPTY_NAME_RATIO_TOO_HIGH:${emptyNameCount}:${parsed.observations.length}`);
}

const statusClaims = {};
for (const observation of parsed.observations) {
  const key = observation.source_status_claim?.claim_type || 'UNKNOWN';
  statusClaims[key] = (statusClaims[key] || 0) + 1;
}
const summary = {
  state: 'LIVE_EXPORT_DISCOVERED_AND_PARSED',
  source_id: 'src-viasna',
  source_page_url: listPage.source_url,
  source_page_fetched_at: listPage.fetched_at,
  source_page_sha256: listPage.sha256,
  export_url: discovery.selected_url,
  export_label: discovery.selected_label,
  export_candidate_count: discovery.candidate_count,
  export_fetched_at: csvExport.fetched_at,
  export_content_type: csvExport.content_type,
  export_bytes: csvExport.bytes,
  export_sha256: csvExport.sha256,
  source_locale: locale,
  delimiter: parsed.delimiter,
  observations: parsed.observations.length,
  parser_coverage: parsed.parser_coverage,
  mapped_headers: parsed.mapped_headers,
  diagnostics_count: parsed.diagnostics.length,
  empty_name_count: emptyNameCount,
  status_claim_counts: statusClaims,
  public_database_mutated: false,
  raw_export_persisted: false,
  political_prisoner_autodesignation: false,
  next_gate: 'PRIVATE_IMMUTABLE_SNAPSHOT_PREPARATION'
};

console.log(`VIASNA_EXPORT_DISCOVERY=PASS observations=${summary.observations} bytes=${summary.export_bytes} coverage=${summary.parser_coverage.toFixed(3)} candidates=${summary.export_candidate_count}`);
console.log(JSON.stringify(summary, null, 2));
