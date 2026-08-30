import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { prisonRelativePath } from '../scripts/lib/catalog.mjs';

const root=new URL('../',import.meta.url).pathname;
const env={...process.env,CHRC_TEST_MODE:'1',CHRC_PUBLIC_DATA_DIR:'tests/fixtures/public-snapshot'};
const prisons=JSON.parse(await readFile(join(root,'tests/fixtures/public-snapshot/prisons.json'),'utf8'));
const manifest=JSON.parse(await readFile(join(root,'tests/fixtures/public-snapshot/manifest.json'),'utf8'));

try{
  execFileSync(process.execPath,[join(root,'scripts/build.mjs')],{stdio:'inherit',env});
  execFileSync(process.execPath,[join(root,'scripts/build-detention-directory.mjs')],{stdio:'inherit',env});
  const ru=await readFile(join(root,'_site/prisons/index.html'),'utf8');
  const en=await readFile(join(root,'_site/en/prisons/index.html'),'utf8');
  assert.ok(ru.includes('Места заключения в Беларуси'));
  assert.ok(en.includes('Detention places in Belarus'));
  assert.ok(ru.includes('data-detention-directory'));
  assert.ok(ru.includes('data-detention-card'));
  assert.ok(ru.includes('СИЗО № TEST'));
  assert.ok(ru.includes('Тестовый публичный адрес учреждения'));
  assert.ok(ru.includes('>1<'));
  assert.ok(ru.includes('/assets/js/prison-directory.js'));
  assert.ok(!ru.includes('name="robots" content="noindex'));
  assert.ok(ru.includes(`Snapshot: ${manifest.snapshot_id}`));

  const detailPath=prisonRelativePath(prisons[0],'ru');
  const detail=await readFile(join(root,'_site',detailPath.replace(/^\//,'').replace(/\/$/,''),'index.html'),'utf8');
  assert.ok(detail.includes('CHUDO_DETENTION_DIRECTORY_V1'));
  assert.ok(detail.includes('prison-breadcrumbs'));
  assert.ok(detail.includes('href="/database/"'));
  assert.ok(detail.includes('href="/prisons/"'));
  assert.ok(detail.includes('Список людей ниже — навигация'));
  assert.ok(detail.includes('https://example.invalid/prison/source'));

  const js=await readFile(join(root,'_site/assets/js/prison-directory.js'),'utf8');
  assert.ok(js.includes('data-detention-card'));
  assert.ok(!/https?:\/\//.test(js));

  execFileSync(process.execPath,[join(root,'scripts/build.mjs')],{stdio:'inherit',env:process.env});
  execFileSync(process.execPath,[join(root,'scripts/build-detention-directory.mjs')],{stdio:'inherit',env:process.env});
  const empty=await readFile(join(root,'_site/prisons/index.html'),'utf8');
  assert.ok(empty.includes('name="robots" content="noindex,follow"'));
  assert.ok(empty.includes('Реальный справочник учреждений станет доступен'));

  console.log('DETENTION_DIRECTORY_TEST=PASS locales=4 filters=PASS detail_context=PASS empty_noindex=PASS runtime_external=ZERO');
}finally{
  execFileSync(process.execPath,[join(root,'scripts/build.mjs')],{stdio:'inherit',env:process.env});
}
