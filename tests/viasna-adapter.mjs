import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyStatusClaim,
  isPublicIp,
  parseViasnaCsv,
  validateViasnaUrl
} from '../scripts/adapters/viasna.mjs';
import { parsePartialDate } from '../scripts/lib/normalization.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const csv = await readFile(join(root, 'tests/fixtures/viasna.synthetic.csv'), 'utf8');
const parsed = parseViasnaCsv(csv, {
  sourceUrl: 'https://prisoners.spring96.org/en/list',
  fetchedAt: '2026-08-28T19:00:00Z',
  observedAt: '2026-08-28T19:00:00Z'
});

if (parsed.observations.length !== 3) throw new Error('Expected 3 synthetic observations');
if (parsed.diagnostics.some(item => item.code === 'CSV_COLUMN_COUNT_MISMATCH')) throw new Error('Synthetic CSV column mismatch');
if (parsed.parser_coverage < 0.9) throw new Error(`Parser header coverage too low: ${parsed.parser_coverage}`);

const alpha = parsed.observations[0];
if (alpha.source_status_claim.claim_type !== 'CURRENT_POLITICAL_PRISONER') throw new Error('Current status claim not recognized');
if (alpha.source_status_claim.auto_designation_allowed !== false) throw new Error('Autodesignation must stay false');
if (alpha.political_prisoner_autodesignation !== false) throw new Error('Observation autodesignation must stay false');
if (alpha.detention_date.value !== '2026-04' || alpha.detention_date.precision !== 'month') throw new Error('Month precision parse failed');
if (!alpha.charge_articles.includes('342') || !alpha.charge_articles.includes('361-4')) throw new Error('Article extraction failed');
if (alpha.prison.facility !== 'Synthetic Detention Center No. 99') throw new Error('Prison facility parse failed');

const beta = parsed.observations[1];
if (beta.source_status_claim.claim_type !== 'FORMER_POLITICAL_PRISONER') throw new Error('Former status claim not recognized');
if (!beta.source_status_claim.recognized_ex_post_facto) throw new Error('Ex post facto marker not recognized');
if (!beta.release_claim) throw new Error('Release claim not recognized');

const ru = parsePartialDate('12 мая 2026');
const be = parsePartialDate('12 траўня 2026');
if (ru.value !== '2026-05-12' || be.value !== '2026-05-12') throw new Error('RU/BE date parsing failed');
if (classifyStatusClaim('Бывший политзаключенный').claim_type !== 'FORMER_POLITICAL_PRISONER') throw new Error('RU status parsing failed');
if (classifyStatusClaim('Палітвязень').claim_type !== 'CURRENT_POLITICAL_PRISONER') throw new Error('BE status parsing failed');

validateViasnaUrl('https://prisoners.spring96.org/en/list');
for (const bad of [
  'http://prisoners.spring96.org/en/list',
  'https://example.com/list',
  'https://user:pass@spring96.org/list',
  'https://spring96.org:8443/list'
]) {
  let failed = false;
  try { validateViasnaUrl(bad); } catch { failed = true; }
  if (!failed) throw new Error(`Unsafe URL accepted: ${bad}`);
}

if (isPublicIp('127.0.0.1') || isPublicIp('10.1.2.3') || isPublicIp('192.168.1.1') || isPublicIp('::1')) {
  throw new Error('Private IP incorrectly allowed');
}
if (!isPublicIp('1.1.1.1') || !isPublicIp('2606:4700:4700::1111')) throw new Error('Public IP incorrectly rejected');

console.log('VIASNA_ADAPTER_TEST=PASS');
