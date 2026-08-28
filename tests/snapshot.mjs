import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createImmutableSnapshot, verifySnapshot } from '../scripts/lib/snapshot.mjs';

const temp = await mkdtemp(join(tmpdir(), 'chudzinovich-snapshot-test-'));
const input = join(temp, 'input');
const output = join(temp, 'snapshots');
await mkdir(input, { recursive: true });
await mkdir(output, { recursive: true });
for (const name of ['people.json', 'prisons.json', 'news.json', 'reports.json']) {
  await writeFile(join(input, name), '[]\n', 'utf8');
}

try {
  const created = await createImmutableSnapshot({
    inputDir: input,
    outputRoot: output,
    createdAt: '2026-08-28T20:00:00Z',
    publicationState: 'DEVELOPMENT_EMPTY',
    counts: { people: 0, political_prisoners_current: 0, former_political_prisoners: 0, repressed_total: 0 },
    sourceSnapshots: []
  });
  if (!/^snap-20260828T200000Z-[a-f0-9]{8}$/.test(created.snapshotId)) throw new Error(`Unexpected snapshot ID: ${created.snapshotId}`);
  const verified = await verifySnapshot(created.snapshotDir);
  if (!verified.ok) throw new Error(`Snapshot verification failed: ${JSON.stringify(verified.failures)}`);
  const sums = await readFile(join(created.snapshotDir, 'SHA256SUMS'), 'utf8');
  if (!sums.includes('people.json')) throw new Error('SHA256SUMS missing people.json');

  await writeFile(join(created.snapshotDir, 'people.json'), '[{"tampered":true}]\n', 'utf8');
  const tampered = await verifySnapshot(created.snapshotDir);
  if (tampered.ok || !tampered.failures.some(item => item.code === 'SNAPSHOT_HASH_MISMATCH')) {
    throw new Error('Tampered snapshot was not rejected');
  }
} finally {
  await rm(temp, { recursive: true, force: true });
}

console.log('SNAPSHOT_TEST=PASS');
