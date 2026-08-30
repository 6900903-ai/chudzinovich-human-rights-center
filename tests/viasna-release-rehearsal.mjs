import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const work=await mkdtemp(join(tmpdir(),'chudo-viasna-release-rehearsal-test-'));
const source=join(root,'tests/fixtures/viasna.machine-export.synthetic.csv');
const raw=await readFile(source);const sourceSha=createHash('sha256').update(raw).digest('hex');
const profilePath=join(work,'profile.json');
const rehearsalRoot=join(work,'rehearsals');
const publicManifest=join(root,'data/public/current/manifest.json');
const before=await readFile(publicManifest);
const profile={
  profile_id:'viasna-synthetic-release-rehearsal',source_id:'src-viasna',source_page_url:'https://prisoners.spring96.org/ru/list',source_locale:'ru',source_sha256:sourceSha,source_bytes:raw.byteLength,parsed_rows:4,
  source_status_counts:{active:1,former:1,np:2},review_required_findings:1,
  identity_collision:{components:0,rows:0,baseline_policy:'QUARANTINE_UNRESOLVED_NO_AUTOMATIC_DECISIONS'},
  candidate_without_identity_resolution:{people:4,prisons:1,quarantined_rows:0,active:1,former:1,np:2},
  candidate_audit_budgets:{sitemap_url_reserve:5000,max_core_urls:45000,max_search_index_bytes_per_lang:16777216},
  full_build_budgets:{max_site_bytes:200000000,max_build_seconds:240,max_total_audit_seconds:300,max_single_file_bytes:25000000},
  publication_authorized:false
};
await writeFile(profilePath,JSON.stringify(profile,null,2)+'\n','utf8');

try{
  const run=spawnSync(process.execPath,[join(root,'scripts/rehearse-viasna-release.mjs')],{
    encoding:'utf8',maxBuffer:64*1024*1024,
    env:{...process.env,CHRC_TEST_MODE:'1',VIASNA_SOURCE_FILE:source,CHRC_VIASNA_REHEARSAL_DIR:rehearsalRoot,CHRC_VIASNA_RELEASE_PROFILE:profilePath,CHRC_AS_OF:'2026-08-30T17:00:00.000Z'}
  });
  assert.equal(run.status,0,run.stderr||run.stdout);
  assert.match(run.stdout,/VIASNA_RELEASE_REHEARSAL=PASS/);
  assert.match(run.stdout,/rows=4 people=4 quarantined=0 identity_components=0 automatic_decisions=0/);
  assert.match(run.stdout,/published=false deploy=false/);
  const receiptPath=run.stdout.match(/VIASNA_RELEASE_REHEARSAL_RECEIPT=(.+)/)?.[1]?.trim();
  const runDir=run.stdout.match(/VIASNA_RELEASE_REHEARSAL_RUN_DIR=(.+)/)?.[1]?.trim();
  assert.ok(receiptPath&&runDir);
  const receipt=JSON.parse(await readFile(receiptPath,'utf8'));
  assert.equal(receipt.state,'REAL_VIASNA_RELEASE_REHEARSAL_PASS_NOT_PUBLISHED');
  assert.equal(receipt.profile_id,profile.profile_id);
  assert.equal(receipt.source_sha256,sourceSha);
  assert.equal(receipt.parsed_rows,4);
  assert.equal(receipt.candidate_people,4);
  assert.equal(receipt.candidate_quarantined_rows,0);
  assert.equal(receipt.identity_components,0);
  assert.equal(receipt.identity_automatic_decisions,0);
  assert.equal(receipt.identity_policy,'QUARANTINE_UNRESOLVED_NO_AUTOMATIC_DECISIONS');
  assert.match(receipt.identity_review_receipt_sha256,/^[a-f0-9]{64}$/);
  assert.match(receipt.import_receipt_sha256,/^[a-f0-9]{64}$/);
  assert.match(receipt.candidate_manifest_sha256,/^[a-f0-9]{64}$/);
  assert.match(receipt.candidate_audit_receipt_sha256,/^[a-f0-9]{64}$/);
  assert.match(receipt.candidate_build_audit_receipt_sha256,/^[a-f0-9]{64}$/);
  assert.ok(receipt.build_metrics.html_files>0);
  assert.ok(receipt.build_metrics.site_bytes>0);
  assert.equal(receipt.public_repo_mutated,false);
  assert.equal(receipt.deployment_performed,false);
  assert.equal(receipt.production_published,false);
  assert.equal(receipt.promotion_authorized,false);
  assert.equal(receipt.next_gate,'HUMAN_PRIVATE_IDENTITY_REVIEW_OR_OWNER_DECISION_ON_QUARANTINED_SUBSET');
  await stat(join(runDir,'candidate-audit.json'));
  await stat(join(runDir,'candidate-build-audit.json'));

  const after=await readFile(publicManifest);assert.ok(before.equals(after),'release rehearsal must not mutate repository public current manifest');

  const wrongProfile={...profile,source_sha256:'0'.repeat(64)};const wrongProfilePath=join(work,'wrong-profile.json');await writeFile(wrongProfilePath,JSON.stringify(wrongProfile,null,2)+'\n','utf8');
  const wrong=spawnSync(process.execPath,[join(root,'scripts/rehearse-viasna-release.mjs')],{encoding:'utf8',env:{...process.env,CHRC_TEST_MODE:'1',VIASNA_SOURCE_FILE:source,CHRC_VIASNA_REHEARSAL_DIR:join(work,'wrong'),CHRC_VIASNA_RELEASE_PROFILE:wrongProfilePath}});
  assert.notEqual(wrong.status,0);assert.match((wrong.stderr||'')+(wrong.stdout||''),/VIASNA_REHEARSAL_SOURCE_SHA256_MISMATCH/);

  console.log('VIASNA_RELEASE_REHEARSAL_TEST=PASS one_command=PASS identity_packet=PASS import=PASS candidate_audit=PASS published_preview_build=PASS public_mutation=ZERO deploy=ZERO promotion=ZERO');
}finally{await rm(work,{recursive:true,force:true});}
