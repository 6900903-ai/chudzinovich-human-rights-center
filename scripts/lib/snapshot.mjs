import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';

export function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

async function fileEntry(path, relativePath) {
  const data = await readFile(path);
  return { path: relativePath.replaceAll('\\', '/'), sha256: sha256(data), bytes: data.byteLength };
}

export async function verifySnapshot(snapshotDir) {
  const manifest = JSON.parse(await readFile(join(snapshotDir, 'manifest.json'), 'utf8'));
  const failures = [];
  for (const entry of manifest.files || []) {
    const path = join(snapshotDir, entry.path);
    try {
      const actual = await fileEntry(path, entry.path);
      if (actual.sha256 !== entry.sha256) failures.push({ code: 'SNAPSHOT_HASH_MISMATCH', path: entry.path });
      if (actual.bytes !== entry.bytes) failures.push({ code: 'SNAPSHOT_SIZE_MISMATCH', path: entry.path });
    } catch {
      failures.push({ code: 'SNAPSHOT_FILE_MISSING', path: entry.path });
    }
  }

  try {
    const people = JSON.parse(await readFile(join(snapshotDir, 'people.json'), 'utf8'));
    if (manifest.counts?.people !== people.length) failures.push({ code: 'SNAPSHOT_PEOPLE_COUNT_MISMATCH' });
  } catch {
    failures.push({ code: 'SNAPSHOT_PEOPLE_UNREADABLE' });
  }
  return { ok: failures.length === 0, manifest, failures };
}

export async function createImmutableSnapshot({
  inputDir,
  outputRoot,
  createdAt,
  publicationState = 'DEVELOPMENT_EMPTY',
  counts,
  sourceSnapshots = []
}) {
  const names = ['people.json', 'prisons.json', 'news.json', 'reports.json'];
  const normalizedCreatedAt = new Date(createdAt).toISOString();
  const staging = join(outputRoot, `.tmp-${process.pid}-${Date.now()}`);
  await mkdir(staging, { recursive: true });

  const entries = [];
  try {
    for (const name of names) {
      const src = join(inputDir, name);
      const data = await readFile(src);
      await writeFile(join(staging, name), data);
      entries.push({ path: name, sha256: sha256(data), bytes: data.byteLength });
    }
    entries.sort((a, b) => a.path.localeCompare(b.path));
    const identityMaterial = JSON.stringify({ created_at: normalizedCreatedAt, files: entries });
    const suffix = sha256(Buffer.from(identityMaterial)).slice(0, 8);
    const stamp = normalizedCreatedAt.replace(/[-:]/g, '').replace('.000', '');
    const snapshotId = `snap-${stamp}-${suffix}`;
    const manifest = {
      snapshot_id: snapshotId,
      created_at: normalizedCreatedAt,
      publication_state: publicationState,
      counts,
      source_snapshots: sourceSnapshots,
      files: entries
    };
    await writeFile(join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    const sums = entries.map(entry => `${entry.sha256}  ${entry.path}`).join('\n') + '\n';
    await writeFile(join(staging, 'SHA256SUMS'), sums);

    const finalDir = join(outputRoot, snapshotId);
    try {
      await stat(finalDir);
      throw new Error('SNAPSHOT_ALREADY_EXISTS');
    } catch (error) {
      if (error.message === 'SNAPSHOT_ALREADY_EXISTS') throw error;
      if (error.code !== 'ENOENT') throw error;
    }
    await rename(staging, finalDir);
    return { snapshotId, snapshotDir: finalDir, manifest };
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

export async function manifestForExistingDirectory(snapshotDir, {
  snapshotId,
  createdAt,
  publicationState,
  counts,
  sourceSnapshots = []
}) {
  const names = ['people.json', 'prisons.json', 'news.json', 'reports.json'];
  const files = [];
  for (const name of names) files.push(await fileEntry(join(snapshotDir, name), name));
  files.sort((a, b) => a.path.localeCompare(b.path));
  return {
    snapshot_id: snapshotId,
    created_at: new Date(createdAt).toISOString(),
    publication_state: publicationState,
    counts,
    source_snapshots: sourceSnapshots,
    files
  };
}
