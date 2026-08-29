import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const tempRoot = await mkdtemp(join(tmpdir(), 'chudo-hrc-tests-'));
const work = join(tempRoot, basename(root));
const excluded = new Set(['.git', '_site', 'node_modules']);

try {
  await cp(root, work, {
    recursive: true,
    force: false,
    errorOnExist: true,
    preserveTimestamps: false,
    filter(source) {
      if (source === root) return true;
      const rel = source.slice(root.length + 1).replaceAll('\\', '/');
      const first = rel.split('/', 1)[0];
      return !excluded.has(first);
    }
  });

  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npm, ['run', 'test:in-place'], {
    cwd: work,
    env: { ...process.env, CHRC_ISOLATED_TEST_ROOT: work },
    stdio: 'inherit'
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  else console.log(`ISOLATED_TEST_SUITE=PASS workspace=${work}`);
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
