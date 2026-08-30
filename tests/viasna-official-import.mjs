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
const csv=await readFile(join(root,'tests/fixtures/viasna.machine-export.synthetic.csv'),'utf8');
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
      VIASNA_EXPECTED_MIN_ROWS:'4',
      VIASNA_EXPECTED_MAX_ROWS:'10',
      VIASNA_EXPECTED_ACTIVE:'1',
      VIASNA_EXPECTED_FORMER:'1',
      VIASNA_EXPECTED_NP:'2',
      VIASNA_EXPECTED_REVIEW_FINDINGS:'1',
      VIASNA_EXPECTED_QUARANTINED:'0',
      VIASNA_EXPECTED_PEOPLE:'4',
      VIASNA_EXPECTED_PRISONS:'1',
      VIASNA_MAX_QUARANTINE_RATIO:'1',
      CHRC_AS_OF:'2026-08-30T08:00:00.000Z'
    }
  });
  assert.equal(run.status,0,run.stderr||run.stdout);
  assert.match(run.stdout,/VIASNA_OFFICIAL_IMPORT=PASS/);
  assert.match(run.stdout,/state=PREPARED_FOR_PRIVATE_REVIEW_NOT_PUBLISHED/);
  assert.match(run.stdout,/active=1 former=1 np=2/);
  assert.match(run.stdout,/people=4 prisons=1 quarantined=0 review=1 structural=0/);
  const receipts=await readdir(join(importRoot,'receipts'));
  assert.equal(receipts.length,1);
  const receipt=JSON.parse(await readFile(join(importRoot,'receipts',receipts[0]),'utf8'));
  assert.equal(receipt.parsed_rows,4);
  assert.deepEqual(receipt.source_status_counts,{active:1,former:1,np:2,other:0});
  assert.equal(receipt.review_required_findings,1);
  assert.deepEqual(receipt.review_required_codes,{SOURCE_DEATH_CLAIM_WITHHELD:1});
  assert.equal(receipt.structural_findings,0);
  assert.deepEqual(receipt.structural_codes,{});
  assert.equal(receipt.public_repo_mutated,false);
  assert.equal(receipt.production_published,false);
  assert.equal(receipt.next_gate,'PRIVATE_EDITORIAL_REVIEW_AND_EXPLICIT_SNAPSHOT_PROMOTION');
  assert.match(receipt.source_sha256,/^[a-f0-9]{64}$/);
  assert.match(receipt.candidate_snapshot_manifest_sha256,/^[a-f0-9]{64}$/);
  assert.ok(receipt.candidate_snapshot_id);
  assert.equal(receipt.people,4,'review-only field must not remove the person');
  assert.equal(receipt.prisons,1);
  assert.equal(receipt.quarantined_rows,0);
  const stageRuns=await readdir(join(importRoot,'staging','viasna-sync'));
  assert.equal(stageRuns.length,1);
  const preparedRuns=await readdir(join(importRoot,'prepared'));
  assert.equal(preparedRuns.length,1);
  const review=JSON.parse(await readFile(join(importRoot,'prepared',preparedRuns[0],'private-review','review-required.json'),'utf8'));
  assert.equal(review.count,1);
  assert.equal(review.findings[0].code,'SOURCE_DEATH_CLAIM_WITHHELD');
  const after=await readFile(publicManifest);
  assert.ok(before.equals(after),'official import must not mutate public manifest');

  const tooLow=spawnSync(process.execPath,[join(root,'scripts/import-viasna-official-file.mjs')],{
    encoding:'utf8',
    env:{...process.env,CHRC_TEST_MODE:'1',VIASNA_SOURCE_FILE:input,CHRC_VIASNA_IMPORT_ROOT:join(work,'too-low'),VIASNA_EXPECTED_MIN_ROWS:'5',VIASNA_EXPECTED_MAX_ROWS:'10'}
  });
  assert.notEqual(tooLow.status,0);
  assert.match((tooLow.stderr||'')+(tooLow.stdout||''),/VIASNA_IMPORT_ROW_COUNT_TOO_LOW/);

  const wrongStatus=spawnSync(process.execPath,[join(root,'scripts/import-viasna-official-file.mjs')],{
    encoding:'utf8',
    env:{...process.env,CHRC_TEST_MODE:'1',VIASNA_SOURCE_FILE:input,CHRC_VIASNA_IMPORT_ROOT:join(work,'wrong-status'),VIASNA_EXPECTED_MIN_ROWS:'4',VIASNA_EXPECTED_MAX_ROWS:'10',VIASNA_EXPECTED_ACTIVE:'2'}
  });
  assert.notEqual(wrongStatus.status,0);
  assert.match((wrongStatus.stderr||'')+(wrongStatus.stdout||''),/VIASNA_SOURCE_STATUS_COUNT_MISMATCH:active/);

  const wrongReview=spawnSync(process.execPath,[join(root,'scripts/import-viasna-official-file.mjs')],{
    encoding:'utf8',
    env:{...process.env,CHRC_TEST_MODE:'1',VIASNA_SOURCE_FILE:input,CHRC_VIASNA_IMPORT_ROOT:join(work,'wrong-review'),VIASNA_EXPECTED_MIN_ROWS:'4',VIASNA_EXPECTED_MAX_ROWS:'10',VIASNA_EXPECTED_REVIEW_FINDINGS:'2'}
  });
  assert.notEqual(wrongReview.status,0);
  assert.match((wrongReview.stderr||'')+(wrongReview.stdout||''),/VIASNA_REVIEW_FINDING_COUNT_MISMATCH/);

  const wrongQuarantine=spawnSync(process.execPath,[join(root,'scripts/import-viasna-official-file.mjs')],{
    encoding:'utf8',
    env:{...process.env,CHRC_TEST_MODE:'1',VIASNA_SOURCE_FILE:input,CHRC_VIASNA_IMPORT_ROOT:join(work,'wrong-quarantine'),VIASNA_EXPECTED_MIN_ROWS:'4',VIASNA_EXPECTED_MAX_ROWS:'10',VIASNA_EXPECTED_QUARANTINED:'1'}
  });
  assert.notEqual(wrongQuarantine.status,0);
  assert.match((wrongQuarantine.stderr||'')+(wrongQuarantine.stdout||''),/VIASNA_CANDIDATE_QUARANTINE_COUNT_MISMATCH/);

  const wrongPeople=spawnSync(process.execPath,[join(root,'scripts/import-viasna-official-file.mjs')],{
    encoding:'utf8',
    env:{...process.env,CHRC_TEST_MODE:'1',VIASNA_SOURCE_FILE:input,CHRC_VIASNA_IMPORT_ROOT:join(work,'wrong-people'),VIASNA_EXPECTED_MIN_ROWS:'4',VIASNA_EXPECTED_MAX_ROWS:'10',VIASNA_EXPECTED_PEOPLE:'3'}
  });
  assert.notEqual(wrongPeople.status,0);
  assert.match((wrongPeople.stderr||'')+(wrongPeople.stdout||''),/VIASNA_CANDIDATE_PEOPLE_COUNT_MISMATCH/);

  const wrongPrisons=spawnSync(process.execPath,[join(root,'scripts/import-viasna-official-file.mjs')],{
    encoding:'utf8',
    env:{...process.env,CHRC_TEST_MODE:'1',VIASNA_SOURCE_FILE:input,CHRC_VIASNA_IMPORT_ROOT:join(work,'wrong-prisons'),VIASNA_EXPECTED_MIN_ROWS:'4',VIASNA_EXPECTED_MAX_ROWS:'10',VIASNA_EXPECTED_PRISONS:'2'}
  });
  assert.notEqual(wrongPrisons.status,0);
  assert.match((wrongPrisons.stderr||'')+(wrongPrisons.stdout||''),/VIASNA_CANDIDATE_PRISON_COUNT_MISMATCH/);

  const wrongSha=spawnSync(process.execPath,[join(root,'scripts/import-viasna-official-file.mjs')],{
    encoding:'utf8',
    env:{...process.env,CHRC_TEST_MODE:'1',VIASNA_SOURCE_FILE:input,CHRC_VIASNA_IMPORT_ROOT:join(work,'wrong-sha'),VIASNA_EXPECTED_MIN_ROWS:'4',VIASNA_EXPECTED_MAX_ROWS:'10',VIASNA_EXPECTED_SOURCE_SHA256:'0'.repeat(64)}
  });
  assert.notEqual(wrongSha.status,0);
  assert.match((wrongSha.stderr||'')+(wrongSha.stdout||''),/VIASNA_SOURCE_SHA256_MISMATCH/);

  console.log('VIASNA_OFFICIAL_IMPORT_TEST=PASS machine_export=true status_attestation=true field_review=true candidate_attestation=true public_mutation=false fail_closed=true');
}finally{
  await rm(work,{recursive:true,force:true});
}
