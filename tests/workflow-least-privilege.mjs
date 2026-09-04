import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const workflows = ['telegram-sync.yml','media-sync.yml','youtube-sync.yml'];

for (const name of workflows) {
  const text = await readFile(join(root,'.github','workflows',name),'utf8');
  assert.match(text,/^permissions:\n  contents: read$/m, `${name}: top-level permissions must be read-only`);
  assert.doesNotMatch(text,/actions:\s*write/, `${name}: actions:write is unnecessary`);
  assert.doesNotMatch(text,/gh workflow run/, `${name}: Pages must be triggered by the validated main push`);
  assert.match(text,/group: public-source-sync/, `${name}: shared promotion serialization missing`);
  assert.match(text,/persist-credentials:\s*false/, `${name}: fetch checkout retains credentials`);
  assert.match(text,/actions\/upload-artifact@[a-f0-9]{40}/, `${name}: upload action is not commit-pinned`);
  assert.match(text,/actions\/download-artifact@[a-f0-9]{40}/, `${name}: download action is not commit-pinned`);
  assert.match(text,/sha256sum[^\n]*> SHA256SUMS/, `${name}: candidate digest missing`);
  assert.match(text,/sha256sum -c SHA256SUMS/, `${name}: candidate digest verification missing`);

  const fetchStart = text.indexOf('\n  fetch:');
  const promoteStart = text.indexOf('\n  promote:');
  assert.ok(fetchStart >= 0 && promoteStart > fetchStart, `${name}: fetch/promote boundary missing`);
  const fetch = text.slice(fetchStart,promoteStart);
  const promote = text.slice(promoteStart);
  assert.match(fetch,/permissions:\n      contents: read/, `${name}: fetch job is not read-only`);
  assert.doesNotMatch(fetch,/git push|contents:\s*write/, `${name}: untrusted network job can mutate repository`);
  assert.match(promote,/permissions:\n      contents: write/, `${name}: promotion job lacks explicit narrow write permission`);
  assert.doesNotMatch(promote,/TELEGRAM_NETWORK_GATE|MEDIA_MONITOR_NETWORK_GATE|sync-youtube\.mjs|telegram:sync|media:sync/, `${name}: promotion job contains source-network acquisition`);
  assert.match(promote,/git add -- data\/public\//, `${name}: commit scope is not explicitly bounded`);
}

console.log(`WORKFLOW_LEAST_PRIVILEGE_TEST=PASS workflows=${workflows.length} fetch_read_only=PASS sealed_artifact=PASS promotion_bounded=PASS actions_write=ZERO`);
