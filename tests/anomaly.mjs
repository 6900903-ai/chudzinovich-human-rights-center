import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseViasnaCsv } from '../scripts/adapters/viasna.mjs';
import {
  compareSnapshotMetrics,
  deriveMetrics,
  detectObservationAnomalies,
  shouldBlockPublication
} from '../scripts/lib/anomaly.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const csv = await readFile(join(root, 'tests/fixtures/viasna.synthetic.csv'), 'utf8');
const parsed = parseViasnaCsv(csv, { fetchedAt: '2026-08-28T19:00:00Z', observedAt: '2026-08-28T19:00:00Z' });
const anomalies = detectObservationAnomalies(parsed.observations, { asOf: '2026-08-28T23:59:59Z' });

if (!anomalies.some(item => item.code === 'FUTURE_EVENT_DATE' && item.field === 'detention_date')) {
  throw new Error('Future event date was not detected');
}
if (!shouldBlockPublication(anomalies)) throw new Error('High-risk anomaly must block publication');

const metrics = deriveMetrics(parsed.observations);
if (metrics.total !== 3 || metrics.current_political_prisoner_claims !== 1) throw new Error('Metric derivation failed');

const compare = compareSnapshotMetrics(
  { total: 8696, current_missing_prison_rate: 0.05 },
  { total: 7000, current_missing_prison_rate: 0.40 }
);
if (!compare.some(item => item.code === 'ANOMALOUS_TOTAL_DROP')) throw new Error('Large source drop not detected');
if (!compare.some(item => item.code === 'MISSING_PRISON_RATE_SPIKE')) throw new Error('Prison null spike not detected');

console.log('ANOMALY_TEST=PASS');
