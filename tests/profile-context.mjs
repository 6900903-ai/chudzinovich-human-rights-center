import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { profileRelativePath } from '../scripts/lib/catalog.mjs';

const root=new URL('../',import.meta.url).pathname;
const env={...process.env,CHRC_TEST_MODE:'1',CHRC_PUBLIC_DATA_DIR:'tests/fixtures/public-snapshot'};
const people=JSON.parse(await readFile(join(root,'tests/fixtures/public-snapshot/people.json'),'utf8'));
const manifest=JSON.parse(await readFile(join(root,'tests/fixtures/public-snapshot/manifest.json'),'utf8'));

try{
  execFileSync(process.execPath,[join(root,'scripts/build.mjs')],{stdio:'inherit',env});
  execFileSync(process.execPath,[join(root,'scripts/build-person-directory.mjs')],{stdio:'inherit',env});
  execFileSync(process.execPath,[join(root,'scripts/enhance-person-profiles.mjs')],{stdio:'inherit',env});

  const path=profileRelativePath(people[0],'ru');
  const html=await readFile(join(root,'_site',path.replace(/^\//,'').replace(/\/$/,''),'index.html'),'utf8');
  assert.ok(html.includes('CHUDO_PROFILE_CONTEXT_V1'));
  assert.ok(html.includes('profile-breadcrumbs'));
  assert.ok(html.includes('href="/database/"'));
  assert.ok(html.includes('href="/prisoners/"'));
  assert.ok(html.includes('data-copy-current'));
  assert.ok(html.includes('/assets/js/profile-tools.js'));
  assert.ok(html.includes('Совпадение места заключения или статьи УК не означает связи между людьми'));
  assert.ok(html.includes(`Snapshot: ${manifest.snapshot_id}`));
  assert.equal((html.match(/CHUDO_PROFILE_CONTEXT_V1/g)||[]).length,1);

  const enPath=profileRelativePath(people[0],'en').replace(/^\//,'').replace(/\/$/,'');
  const en=await readFile(join(root,'_site','en',enPath,'index.html'),'utf8');
  assert.ok(en.includes('People database'));
  assert.ok(en.includes('COPY LINK'));

  const js=await readFile(join(root,'_site/assets/js/profile-tools.js'),'utf8');
  assert.ok(js.includes('navigator.clipboard'));
  assert.ok(!/https?:\/\//.test(js));

  console.log('PROFILE_CONTEXT_TEST=PASS breadcrumbs=PASS copy_link=PASS snapshot_context=PASS relationship_disclaimer=PASS runtime_external=ZERO');
}finally{
  execFileSync(process.execPath,[join(root,'scripts/build.mjs')],{stdio:'inherit',env:process.env});
}
