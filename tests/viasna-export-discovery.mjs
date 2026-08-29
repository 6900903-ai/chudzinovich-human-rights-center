import { discoverViasnaCsvExport, decodeBasicHtmlEntities, fetchViasnaDiscoveryResource } from '../scripts/lib/viasna-export-discovery.mjs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(decodeBasicHtmlEntities('a&amp;b&#x2F;c&#47;d') === 'a&b/c/d', 'HTML entity decoding failed');

const html = `<!doctype html><html><body>
<a href="/ru/list?page=2">Следующая</a>
<a href="https://evil.example/export.csv">csv</a>
<a href="javascript:alert(1)">csv</a>
<a class="download" href="?status%5B%5D=0&amp;format=csv"><span>(csv)</span></a>
<a href="?format=csv&amp;status%5B%5D=0">CSV</a>
</body></html>`;
const discovered = discoverViasnaCsvExport(html, 'https://prisoners.spring96.org/ru/list');
assert(discovered.selected_url === 'https://prisoners.spring96.org/ru/list?format=csv&status%5B%5D=0', `Unexpected selected URL: ${discovered.selected_url}`);
assert(discovered.candidate_count === 1, `Expected deduplicated candidate, got ${discovered.candidate_count}`);
assert(discovered.selected_score >= 200, 'CSV candidate score unexpectedly low');

let missingFailed = false;
try {
  discoverViasnaCsvExport('<a href="/ru/list?page=2">Дальше</a>', 'https://prisoners.spring96.org/ru/list');
} catch (error) {
  missingFailed = error.message === 'VIASNA_CSV_EXPORT_LINK_NOT_FOUND';
}
assert(missingFailed, 'Missing export link did not fail closed');

let ambiguousFailed = false;
try {
  discoverViasnaCsvExport('<a href="?format=csv">csv</a><a href="?download=csv">csv</a>', 'https://prisoners.spring96.org/ru/list');
} catch (error) {
  ambiguousFailed = error.message.startsWith('VIASNA_CSV_EXPORT_LINK_AMBIGUOUS:');
}
assert(ambiguousFailed, 'Ambiguous export links did not fail closed');

const response = (body, contentType, status = 200) => new Response(body, { status, headers: { 'content-type': contentType } });
const env = { VIASNA_DATA_REUSE_GATE: 'PASS', FETCHER_SECURITY_GATE: 'PASS' };
const dnsCheck = async () => [{ address: '1.1.1.1', family: 4 }];
const htmlFetch = await fetchViasnaDiscoveryResource('https://prisoners.spring96.org/ru/list', {
  kind: 'html', env, dnsCheck, fetchImpl: async () => response('<html><body><a href="?format=csv">csv</a></body></html>', 'text/html; charset=utf-8')
});
assert(htmlFetch.bytes > 0 && htmlFetch.sha256.length === 64, 'HTML fetch metadata invalid');

const csvFetch = await fetchViasnaDiscoveryResource('https://prisoners.spring96.org/ru/list?format=csv', {
  kind: 'csv', env, dnsCheck, fetchImpl: async () => response('Name and surname,Status\nSynthetic Person,Political prisoner\n', 'application/vnd.ms-excel')
});
assert(csvFetch.text.includes('Synthetic Person'), 'CSV fetch failed');

let gateFailed = false;
try {
  await fetchViasnaDiscoveryResource('https://prisoners.spring96.org/ru/list', {
    kind: 'html', env: {}, dnsCheck, fetchImpl: async () => response('<html></html>', 'text/html')
  });
} catch (error) {
  gateFailed = error.message === 'VIASNA_DATA_REUSE_GATE_NOT_PASS';
}
assert(gateFailed, 'Network gate did not fail closed');

let htmlAsCsvFailed = false;
try {
  await fetchViasnaDiscoveryResource('https://prisoners.spring96.org/ru/list?format=csv', {
    kind: 'csv', env, dnsCheck, fetchImpl: async () => response('<html><body>Error</body></html>', 'text/plain')
  });
} catch (error) {
  htmlAsCsvFailed = error.message === 'VIASNA_EXPORT_RETURNED_HTML';
}
assert(htmlAsCsvFailed, 'HTML masquerading as CSV was accepted');

console.log('VIASNA_EXPORT_DISCOVERY_TEST=PASS');
