import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { walk } from './lib/fs.mjs';

const root = new URL('../', import.meta.url).pathname;
const forbiddenPathParts = [
  '/data/review/', '/private-review/', '/.private/', '/editorial-private/'
];
const forbiddenKeys = [
  'editorial_notes', 'internal_notes', 'identity_conflict_notes',
  'private_contact', 'reviewer_identity', 'rejected_candidate_reason_private'
];

const files = await walk(root);
const violations = [];
for (const file of files) {
  const normalized = file.replaceAll('\\\\', '/');
  if (forbiddenPathParts.some(part => normalized.includes(part))) {
    violations.push(`forbidden path: ${relative(root, file)}`);
    continue;
  }
  if (!file.endsWith('.json')) continue;
  if (normalized.includes('/tests/fixtures/')) continue;
  const text = await readFile(file, 'utf8');
  for (const key of forbiddenKeys) {
    if (text.includes(`"${key}"`)) violations.push(`forbidden key ${key}: ${relative(root, file)}`);
  }
}

if (violations.length) {
  console.error('PUBLIC BOUNDARY FAIL');
  for (const v of violations) console.error(`- ${v}`);
  process.exit(1);
}
console.log('PUBLIC_BOUNDARY=PASS');
