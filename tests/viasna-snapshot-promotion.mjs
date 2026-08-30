import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { prepareViasnaSnapshot } from '../scripts/lib/viasna-snapshot-preparer.mjs';
import { verifySnapshot } from '../scripts/lib/snapshot.mjs';

const root=new URL('../',import.meta.url).pathname;
const work=await mkdtemp(join(tmpdir(),'chudo-viasna-promotion-gate-'));
const source=join(root,'tests/fixtures/viasna.synthetic.csv');
const preparedRoot=join(work,'prepared');
const auditReceipt=join(work,'candidate-audit.json');
const buildAuditReceipt=join(work,'candidate-build-audit.json');
const canonicalCurrent=join(root,'data/public/current');

function runPromotion(target,extraEnv={}){
  return spawnSync(process.execPath,[join(root,'scripts/promote-viasna-snapshot.mjs')],{
    encoding:'utf8',
    env:{
      ...process.env,
      CHRC_TEST_MODE:'1',
      CHRC_VIASNA_PROMOTION_AUTHORIZED:'YES_I_AUTHORIZE_PUBLICATION',
      CHRC_VIASNA_CANDIDATE_DIR:prepared.snapshotDir,
      CHRC_VIASNA_AUDIT_RECEIPT_FILE:auditReceipt,
      CHRC_VIASNA_BUILD_AUDIT_RECEIPT_FILE:buildAuditReceipt,
      CHRC_VIASNA_PROMOTION_TARGET_DIR:target,
      CHRC_PROMOTED_AT:'2026-08-30T15:00:00.000Z',
      ...extraEnv
    }
  });
}

let prepared;
try{
  prepared=await prepareViasnaSnapshot({
    sourceFile:source,
    outputRoot:preparedRoot,
    currentPublicDir:canonicalCurrent,
    sourcePageUrl:'https://prisoners.spring96.org/en/list',
    locale:'en',
    asOf:'2026-08-30T12:00:00.000Z'
  });
  assert.equal(prepared.people,3);
  assert.equal(prepared.prisons,1);

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
  const receipt=JSON.parse(await readFile(auditReceipt,'utf8'));
  assert.equal(receipt.state,'REAL_VIASNA_CANDIDATE_AUDIT_PASS_NOT_PUBLISHED');
  assert.equal(receipt.next_gate,'EXPLICIT_SNAPSHOT_PROMOTION');
  assert.equal(receipt.production_published,false);

  const buildAudit=spawnSync(process.execPath,[join(root,'scripts/audit-viasna-candidate-build.mjs')],{
    encoding:'utf8',
    maxBuffer:64*1024*1024,
    env:{
      ...process.env,
      CHRC_TEST_MODE:'1',
      CHRC_VIASNA_CANDIDATE_DIR:prepared.snapshotDir,
      CHRC_VIASNA_AUDIT_RECEIPT_FILE:auditReceipt,
      CHRC_VIASNA_BUILD_AUDIT_RECEIPT_FILE:buildAuditReceipt,
      CHRC_CANDIDATE_MAX_SITE_BYTES:'200000000',
      CHRC_CANDIDATE_MAX_BUILD_SECONDS:'240',
      CHRC_CANDIDATE_MAX_TOTAL_AUDIT_SECONDS:'300'
    }
  });
  assert.equal(buildAudit.status,0,buildAudit.stderr||buildAudit.stdout);
  assert.match(buildAudit.stdout,/REAL_VIASNA_CANDIDATE_BUILD_AUDIT=PASS/);
  const buildReceipt=JSON.parse(await readFile(buildAuditReceipt,'utf8'));
  assert.equal(buildReceipt.state,'REAL_VIASNA_CANDIDATE_BUILD_AUDIT_PASS_NOT_PUBLISHED');
  assert.equal(buildReceipt.artifact_contract_pass,true);
  assert.equal(buildReceipt.workspace_site_restored,true);
  assert.equal(buildReceipt.production_published,false);

  const noAuthTarget=join(work,'no-auth-current');
  await cp(canonicalCurrent,noAuthTarget,{recursive:true});
  const noAuth=spawnSync(process.execPath,[join(root,'scripts/promote-viasna-snapshot.mjs')],{
    encoding:'utf8',
    env:{...process.env,CHRC_TEST_MODE:'1',CHRC_VIASNA_CANDIDATE_DIR:prepared.snapshotDir,CHRC_VIASNA_AUDIT_RECEIPT_FILE:auditReceipt,CHRC_VIASNA_BUILD_AUDIT_RECEIPT_FILE:buildAuditReceipt,CHRC_VIASNA_PROMOTION_TARGET_DIR:noAuthTarget}
  });
  assert.notEqual(noAuth.status,0);
  assert.match((noAuth.stderr||'')+(noAuth.stdout||''),/VIASNA_SNAPSHOT_PROMOTION_NOT_AUTHORIZED/);

  const noBuildTarget=join(work,'no-build-current');
  await cp(canonicalCurrent,noBuildTarget,{recursive:true});
  const noBuild=spawnSync(process.execPath,[join(root,'scripts/promote-viasna-snapshot.mjs')],{
    encoding:'utf8',
    env:{...process.env,CHRC_TEST_MODE:'1',CHRC_VIASNA_PROMOTION_AUTHORIZED:'YES_I_AUTHORIZE_PUBLICATION',CHRC_VIASNA_CANDIDATE_DIR:prepared.snapshotDir,CHRC_VIASNA_AUDIT_RECEIPT_FILE:auditReceipt,CHRC_VIASNA_PROMOTION_TARGET_DIR:noBuildTarget}
  });
  assert.notEqual(noBuild.status,0);
  assert.match((noBuild.stderr||'')+(noBuild.stdout||''),/CHRC_VIASNA_BUILD_AUDIT_RECEIPT_FILE_NOT_CONFIGURED/);

  const target=join(work,'public-current');
  await cp(canonicalCurrent,target,{recursive:true});
  const promotion=runPromotion(target);
  assert.equal(promotion.status,0,promotion.stderr||promotion.stdout);
  assert.match(promotion.stdout,/VIASNA_SNAPSHOT_PROMOTION=PASS/);
  assert.match(promotion.stdout,/build_audit_receipt_sha256=[a-f0-9]{64}/);
  assert.match(promotion.stdout,/publication_state=PUBLISHED/);
  const publishedManifest=JSON.parse(await readFile(join(target,'manifest.json'),'utf8'));
  assert.equal(publishedManifest.publication_state,'PUBLISHED');
  assert.equal(publishedManifest.counts.people,3);
  assert.equal(publishedManifest.counts.political_prisoners_current,1);
  assert.equal(publishedManifest.counts.former_political_prisoners,1);
  assert.equal(publishedManifest.source_snapshots[0].candidate_snapshot_id,prepared.snapshotId);
  assert.match(publishedManifest.source_snapshots[0].candidate_manifest_sha256,/^[a-f0-9]{64}$/);
  assert.match(publishedManifest.source_snapshots[0].candidate_audit_receipt_sha256,/^[a-f0-9]{64}$/);
  assert.match(publishedManifest.source_snapshots[0].candidate_build_audit_receipt_sha256,/^[a-f0-9]{64}$/);
  const integrity=await verifySnapshot(target);
  assert.equal(integrity.ok,true,JSON.stringify(integrity.failures));
  const promotedPeople=JSON.parse(await readFile(join(target,'people.json'),'utf8'));
  assert.equal(promotedPeople.length,3);

  const canonicalAfter=JSON.parse(await readFile(join(canonicalCurrent,'people.json'),'utf8'));
  assert.equal(canonicalAfter.length,0,'test promotion must not mutate repository public current');

  const tamperedReceipt=join(work,'candidate-audit-tampered.json');
  await writeFile(tamperedReceipt,JSON.stringify({...receipt,people:99},null,2)+'\n','utf8');
  const tamperedTarget=join(work,'tampered-current');
  await cp(canonicalCurrent,tamperedTarget,{recursive:true});
  const tampered=runPromotion(tamperedTarget,{CHRC_VIASNA_AUDIT_RECEIPT_FILE:tamperedReceipt});
  assert.notEqual(tampered.status,0);
  assert.match((tampered.stderr||'')+(tampered.stdout||''),/VIASNA_PROMOTION_AUDIT_COUNTS_MISMATCH/);

  const tamperedBuildReceipt=join(work,'candidate-build-audit-tampered.json');
  await writeFile(tamperedBuildReceipt,JSON.stringify({...buildReceipt,workspace_site_restored:false},null,2)+'\n','utf8');
  const tamperedBuildTarget=join(work,'tampered-build-current');
  await cp(canonicalCurrent,tamperedBuildTarget,{recursive:true});
  const tamperedBuild=runPromotion(tamperedBuildTarget,{CHRC_VIASNA_BUILD_AUDIT_RECEIPT_FILE:tamperedBuildReceipt});
  assert.notEqual(tamperedBuild.status,0);
  assert.match((tamperedBuild.stderr||'')+(tamperedBuild.stdout||''),/VIASNA_PROMOTION_BUILD_AUDIT_WORKSPACE_NOT_RESTORED/);

  const driftTarget=join(work,'drift-current');
  await cp(canonicalCurrent,driftTarget,{recursive:true});
  await writeFile(join(driftTarget,'reports.json'),'[{"unexpected":"drift"}]\n','utf8');
  const drift=runPromotion(driftTarget);
  assert.notEqual(drift.status,0);
  assert.match((drift.stderr||'')+(drift.stdout||''),/VIASNA_PROMOTION_CANONICAL_SUPPORT_DATA_DRIFT:reports.json/);

  const wrongExpectedTarget=join(work,'wrong-expected-current');
  await cp(canonicalCurrent,wrongExpectedTarget,{recursive:true});
  const wrongExpected=runPromotion(wrongExpectedTarget,{CHRC_EXPECTED_VIASNA_CANDIDATE_MANIFEST_SHA256:'0'.repeat(64)});
  assert.notEqual(wrongExpected.status,0);
  assert.match((wrongExpected.stderr||'')+(wrongExpected.stdout||''),/VIASNA_PROMOTION_CANDIDATE_MANIFEST_SHA256_MISMATCH/);

  const wrongBuildExpectedTarget=join(work,'wrong-build-expected-current');
  await cp(canonicalCurrent,wrongBuildExpectedTarget,{recursive:true});
  const wrongBuildExpected=runPromotion(wrongBuildExpectedTarget,{CHRC_EXPECTED_VIASNA_BUILD_AUDIT_RECEIPT_SHA256:'0'.repeat(64)});
  assert.notEqual(wrongBuildExpected.status,0);
  assert.match((wrongBuildExpected.stderr||'')+(wrongBuildExpected.stdout||''),/VIASNA_PROMOTION_BUILD_AUDIT_RECEIPT_SHA256_MISMATCH/);

  console.log('VIASNA_SNAPSHOT_PROMOTION_TEST=PASS authorization=PASS audit_binding=PASS full_build_binding=PASS candidate_binding=PASS support_data_drift=PASS atomic_target=PASS repository_mutation=ZERO');
}finally{
  await rm(work,{recursive:true,force:true});
}
