import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { prepareViasnaSnapshot } from '../scripts/lib/viasna-snapshot-preparer.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const work=await mkdtemp(join(tmpdir(),'chudo-viasna-build-audit-'));
const preparedRoot=join(work,'prepared');
const auditReceipt=join(work,'candidate-audit.json');
const buildReceipt=join(work,'candidate-build-audit.json');
const site=join(root,'_site');
const sentinel=join(site,'WAVE43_PUBLIC_SITE_SENTINEL.txt');
let siteExisted=true;
try{await stat(site);}catch(error){if(error?.code==='ENOENT'){siteExisted=false;await mkdir(site,{recursive:true});}else throw error;}
await writeFile(sentinel,'PUBLIC_SITE_MUST_BE_RESTORED\n','utf8');

try{
  const prepared=await prepareViasnaSnapshot({
    sourceFile:join(root,'tests/fixtures/viasna.synthetic.csv'),
    outputRoot:preparedRoot,
    currentPublicDir:join(root,'data/public/current'),
    sourcePageUrl:'https://prisoners.spring96.org/en/list',
    locale:'en',
    asOf:'2026-08-29T12:00:00Z'
  });

  const audit=spawnSync(process.execPath,[join(root,'scripts/audit-viasna-candidate.mjs')],{
    encoding:'utf8',
    env:{
      ...process.env,
      CHRC_TEST_MODE:'1',
      CHRC_VIASNA_CANDIDATE_DIR:prepared.snapshotDir,
      CHRC_VIASNA_AUDIT_RECEIPT_FILE:auditReceipt,
      VIASNA_EXPECTED_PEOPLE:'3',
      VIASNA_EXPECTED_PRISONS:'1',
      VIASNA_EXPECTED_CANDIDATE_ACTIVE:'1',
      VIASNA_EXPECTED_CANDIDATE_FORMER:'1',
      VIASNA_EXPECTED_CANDIDATE_NP:'1'
    }
  });
  assert.equal(audit.status,0,audit.stderr||audit.stdout);
  assert.match(audit.stdout,/REAL_VIASNA_CANDIDATE_AUDIT=PASS/);

  const run=spawnSync(process.execPath,[join(root,'scripts/audit-viasna-candidate-build.mjs')],{
    encoding:'utf8',
    maxBuffer:64*1024*1024,
    env:{
      ...process.env,
      CHRC_TEST_MODE:'1',
      CHRC_VIASNA_CANDIDATE_DIR:prepared.snapshotDir,
      CHRC_VIASNA_AUDIT_RECEIPT_FILE:auditReceipt,
      CHRC_VIASNA_BUILD_AUDIT_RECEIPT_FILE:buildReceipt,
      CHRC_CANDIDATE_MAX_SITE_BYTES:'200000000',
      CHRC_CANDIDATE_MAX_BUILD_SECONDS:'240',
      CHRC_CANDIDATE_MAX_TOTAL_AUDIT_SECONDS:'300',
      CHRC_CANDIDATE_MAX_SINGLE_FILE_BYTES:'25000000'
    }
  });
  assert.equal(run.status,0,run.stderr||run.stdout);
  assert.match(run.stdout,/REAL_VIASNA_CANDIDATE_BUILD_AUDIT=PASS/);
  assert.match(run.stdout,/render_state=PUBLISHED/);
  assert.match(run.stdout,/restored=true preview_removed=true published=false deploy=false/);

  const receipt=JSON.parse(await readFile(buildReceipt,'utf8'));
  assert.equal(receipt.state,'REAL_VIASNA_CANDIDATE_BUILD_AUDIT_PASS_NOT_PUBLISHED');
  assert.equal(receipt.snapshot_id,prepared.snapshotId);
  assert.equal(receipt.candidate_publication_state,'CANDIDATE_REVIEW');
  assert.equal(receipt.rendered_publication_state,'PUBLISHED');
  assert.equal(receipt.published_preview_ephemeral,true);
  assert.equal(receipt.preview_removed,true);
  assert.equal(receipt.people,3);
  assert.equal(receipt.artifact_contract_pass,true);
  assert.equal(receipt.private_file_leaks,0);
  assert.equal(receipt.workspace_site_restored,true);
  assert.equal(receipt.public_repo_mutated,false);
  assert.equal(receipt.deployment_performed,false);
  assert.equal(receipt.production_published,false);
  assert.ok(receipt.html_files>0);
  assert.ok(receipt.total_files>=receipt.html_files);
  assert.ok(receipt.site_bytes>0);
  assert.ok(receipt.sitemap_urls>0);
  assert.ok(receipt.sitemap_shards>=1);

  assert.equal(await readFile(sentinel,'utf8'),'PUBLIC_SITE_MUST_BE_RESTORED\n','pre-existing _site must be restored after private candidate build');
  const publicPeople=JSON.parse(await readFile(join(root,'data/public/current/people.json'),'utf8'));
  assert.equal(publicPeople.length,0,'candidate build audit must not mutate public current snapshot');

  const badReceipt=join(work,'bad-build-audit.json');
  const bad=spawnSync(process.execPath,[join(root,'scripts/audit-viasna-candidate-build.mjs')],{
    encoding:'utf8',
    env:{
      ...process.env,
      CHRC_TEST_MODE:'1',
      CHRC_VIASNA_CANDIDATE_DIR:prepared.snapshotDir,
      CHRC_VIASNA_AUDIT_RECEIPT_FILE:auditReceipt,
      CHRC_VIASNA_BUILD_AUDIT_RECEIPT_FILE:badReceipt,
      CHRC_CANDIDATE_MAX_BUILD_SECONDS:'1',
      CHRC_CANDIDATE_MAX_TOTAL_AUDIT_SECONDS:'2'
    }
  });
  assert.notEqual(bad.status,0);
  assert.match((bad.stderr||'')+(bad.stdout||''),/VIASNA_CANDIDATE_BUILD_TIME_BUDGET_EXCEEDED|VIASNA_CANDIDATE_TOTAL_TIME_BUDGET_EXCEEDED/);
  await assert.rejects(readFile(badReceipt,'utf8'));
  assert.equal(await readFile(sentinel,'utf8'),'PUBLIC_SITE_MUST_BE_RESTORED\n','failed audit must also restore pre-existing _site');

  console.log('VIASNA_CANDIDATE_BUILD_AUDIT_TEST=PASS published_preview=PASS full_build=PASS artifact_contract=PASS private_leak=ZERO workspace_restore=PASS preview_cleanup=PASS public_mutation=ZERO deployment=ZERO');
}finally{
  await rm(sentinel,{force:true});
  if(!siteExisted)await rm(site,{recursive:true,force:true});
  await rm(work,{recursive:true,force:true});
}

await import('./viasna-release-rehearsal.mjs');
