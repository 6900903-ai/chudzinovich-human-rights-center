import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root=new URL('../',import.meta.url).pathname;
const work=await mkdtemp(join(tmpdir(),'chudo-viasna-official-import-'));
const input=join(work,'viasna-export.csv');
const importRoot=join(work,'import-root');
const publicManifest=join(root,'data/public/current/manifest.json');
const before=await readFile(publicManifest);
const csv=[
  'Имя и фамилия,Статус,Дата рождения,Пол,Дата задержания,Предъявлены обвинения,Дата приговора,Решение суда,Вид наказания,Судья,Прокурор,Место заключения',
  'Иванов Иван,Политзаключенный,1988-04-12,Мужчина,12 мая 2025,ст. 342 Уголовного кодекса,2 января 2026,3 года,лишение свободы,,,ИК № 1',
  'Петрова Анна,Бывшая политзаключённая,1990-03-10,Женщина,10 марта 2021,ст. 342 Уголовного кодекса,15 апреля 2022,2 года,ограничение свободы,,,освобождена'
].join('\n')+'\n';
await writeFile(input,csv,'utf8');

try{
  const run=spawnSync(process.execPath,[join(root,'scripts/import-viasna-official-file.mjs')],{
    encoding:'utf8',
    env:{
      ...process.env,
      CHRC_TEST_MODE:'1',
      VIASNA_SOURCE_FILE:input,
      CHRC_VIASNA_IMPORT_ROOT:importRoot,
      VIASNA_SOURCE_PAGE_URL:'https://prisoners.spring96.org/ru/list',
      VIASNA_SOURCE_LOCALE:'ru',
      VIASNA_EXPECTED_MIN_ROWS:'2',
      VIASNA_EXPECTED_MAX_ROWS:'10',
      VIASNA_MAX_QUARANTINE_RATIO:'1',
      CHRC_AS_OF:'2026-08-30T08:00:00.000Z'
    }
  });
  assert.equal(run.status,0,run.stderr||run.stdout);
  assert.match(run.stdout,/VIASNA_OFFICIAL_IMPORT=PASS/);
  assert.match(run.stdout,/state=PREPARED_FOR_PRIVATE_REVIEW_NOT_PUBLISHED/);
  const receipts=await readdir(join(importRoot,'receipts'));
  assert.equal(receipts.length,1);
  const receipt=JSON.parse(await readFile(join(importRoot,'receipts',receipts[0]),'utf8'));
  assert.equal(receipt.parsed_rows,2);
  assert.equal(receipt.public_repo_mutated,false);
  assert.equal(receipt.production_published,false);
  assert.equal(receipt.next_gate,'PRIVATE_EDITORIAL_REVIEW_AND_EXPLICIT_SNAPSHOT_PROMOTION');
  assert.match(receipt.source_sha256,/^[a-f0-9]{64}$/);
  assert.match(receipt.candidate_snapshot_manifest_sha256,/^[a-f0-9]{64}$/);
  assert.ok(receipt.candidate_snapshot_id);
  assert.ok(receipt.people>=1);
  const stageRuns=await readdir(join(importRoot,'staging','viasna-sync'));
  assert.equal(stageRuns.length,1);
  const preparedRuns=await readdir(join(importRoot,'prepared'));
  assert.equal(preparedRuns.length,1);
  const after=await readFile(publicManifest);
  assert.ok(before.equals(after),'official import must not mutate public manifest');

  const tooLow=spawnSync(process.execPath,[join(root,'scripts/import-viasna-official-file.mjs')],{
    encoding:'utf8',
    env:{...process.env,CHRC_TEST_MODE:'1',VIASNA_SOURCE_FILE:input,CHRC_VIASNA_IMPORT_ROOT:join(work,'too-low'),VIASNA_EXPECTED_MIN_ROWS:'3',VIASNA_EXPECTED_MAX_ROWS:'10'}
  });
  assert.notEqual(tooLow.status,0);
  assert.match((tooLow.stderr||'')+(tooLow.stdout||''),/VIASNA_IMPORT_ROW_COUNT_TOO_LOW/);

  const wrongSha=spawnSync(process.execPath,[join(root,'scripts/import-viasna-official-file.mjs')],{
    encoding:'utf8',
    env:{...process.env,CHRC_TEST_MODE:'1',VIASNA_SOURCE_FILE:input,CHRC_VIASNA_IMPORT_ROOT:join(work,'wrong-sha'),VIASNA_EXPECTED_MIN_ROWS:'2',VIASNA_EXPECTED_MAX_ROWS:'10',VIASNA_EXPECTED_SOURCE_SHA256:'0'.repeat(64)}
  });
  assert.notEqual(wrongSha.status,0);
  assert.match((wrongSha.stderr||'')+(wrongSha.stdout||''),/VIASNA_SOURCE_SHA256_MISMATCH/);

  console.log('VIASNA_OFFICIAL_IMPORT_TEST=PASS one_command=true immutable_candidate=true public_mutation=false fail_closed=true');
}finally{
  await rm(work,{recursive:true,force:true});
}
