import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('../', import.meta.url).pathname;
const work = await mkdtemp(join(tmpdir(),'chudo-viasna-offline-'));
const input = join(work,'viasna.csv');
const privateDir = join(work,'private-review');
const publicManifest = join(root,'data/public/current/manifest.json');
const beforeManifest = await readFile(publicManifest,'utf8');

const csv = [
  'Имя и фамилия,Статус,Дата рождения,Пол,Дата задержания,Предъявлены обвинения,Дата приговора,Решение суда,Вид наказания,Судья,Прокурор,Место заключения',
  'Иванов Иван,Политзаключенный,1988-04-12,Мужчина,2025,ст. 342 Уголовного кодекса,2026,3 года,лишение свободы,,,ИК № 1',
  'Петрова Анна,Бывшая политзаключённая,1990-03-10,Женщина,2021,ст. 342 Уголовного кодекса,2022,2 года,ограничение свободы,,,освобождена'
].join('\n')+'\n';
await writeFile(input,csv,'utf8');

try {
  const run = spawnSync(process.execPath,[join(root,'scripts/stage-viasna-file.mjs')],{
    encoding:'utf8',
    env:{
      ...process.env,
      VIASNA_SOURCE_FILE:input,
      VIASNA_SOURCE_PAGE_URL:'https://prisoners.spring96.org/ru/list',
      VIASNA_SOURCE_LOCALE:'ru',
      CHRC_PRIVATE_REVIEW_DIR:privateDir
    }
  });
  assert.equal(run.status,0,run.stderr || run.stdout);
  assert.match(run.stdout,/VIASNA_FILE_STAGED=PASS/);

  const syncRoot = join(privateDir,'viasna-sync');
  const runs = await readdir(syncRoot);
  assert.equal(runs.length,1);
  const runDir = join(syncRoot,runs[0]);
  const source = JSON.parse(await readFile(join(runDir,'source.json'),'utf8'));
  const observations = JSON.parse(await readFile(join(runDir,'observations.json'),'utf8'));
  const decision = JSON.parse(await readFile(join(runDir,'decision.json'),'utf8'));
  const rawCopy = await readFile(join(runDir,'source.csv'),'utf8');

  assert.equal(source.acquisition_mode,'MANUAL_FILE_IMPORT');
  assert.equal(source.source_page_url,'https://prisoners.spring96.org/ru/list');
  assert.equal(observations.length,2);
  assert.equal(observations[0].publication_state,'STAGING_OBSERVATION_ONLY');
  assert.equal(observations[0].political_prisoner_autodesignation,false);
  assert.equal(decision.public_database_mutated,false);
  assert.equal(decision.promotion_requires_editorial_review,true);
  assert.equal(rawCopy,csv);

  const afterManifest = await readFile(publicManifest,'utf8');
  assert.equal(afterManifest,beforeManifest,'offline staging must not mutate public snapshot');

  const bad = spawnSync(process.execPath,[join(root,'scripts/stage-viasna-file.mjs')],{
    encoding:'utf8',
    env:{...process.env,VIASNA_SOURCE_FILE:publicManifest,CHRC_PRIVATE_REVIEW_DIR:join(work,'bad-private')}
  });
  assert.notEqual(bad.status,0);
  assert.match((bad.stderr || '') + (bad.stdout || ''),/REAL_VIASNA_SOURCE_FILE_INSIDE_PUBLIC_REPO/);

  console.log('VIASNA_OFFLINE_STAGING_TEST=PASS private_only=true public_mutation=false');
} finally {
  await rm(work,{recursive:true,force:true});
}
