import { validateViasnaUrl } from '../adapters/viasna.mjs';

export function configuredViasnaCsvExport(pageUrl, csvUrl) {
  const page = validateViasnaUrl(pageUrl);
  const direct = validateViasnaUrl(csvUrl);
  if (direct.hostname !== page.hostname) throw new Error('VIASNA_CONFIGURED_CSV_HOST_MISMATCH');
  if (direct.pathname !== page.pathname) throw new Error('VIASNA_CONFIGURED_CSV_PATH_MISMATCH');
  if (direct.hash) throw new Error('VIASNA_CONFIGURED_CSV_FRAGMENT_FORBIDDEN');
  const format = direct.searchParams.get('format');
  const csvFlag = direct.searchParams.has('csv');
  if (format?.toLowerCase() !== 'csv' && !csvFlag) throw new Error('VIASNA_CONFIGURED_CSV_SIGNAL_MISSING');
  return {
    page_url: page.href,
    selected_url: direct.href,
    selected_label: 'csv',
    selected_score: 1000,
    candidate_count: 1,
    candidates: [{ url: direct.href, label: 'csv', score: 1000, signals: { configured: true } }],
    discovery_mode: 'CONFIGURED_DIRECT_CSV'
  };
}
