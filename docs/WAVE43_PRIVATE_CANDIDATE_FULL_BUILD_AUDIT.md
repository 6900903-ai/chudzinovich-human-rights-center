# Wave 43 — Private candidate full build audit

Status: `IMPLEMENTED_ON_REVIEW_BRANCH`

Wave 43 adds the missing pre-publication rehearsal for a real Viasna candidate. It performs the same full static build and final Pages artifact validation used by the site, but reads the immutable candidate from an external private directory and never promotes or deploys it.

## Required private inputs

```text
CHRC_VIASNA_CANDIDATE_DIR=<external candidate snapshot>
CHRC_VIASNA_AUDIT_RECEIPT_FILE=<external Wave 39/42 candidate audit receipt>
CHRC_VIASNA_BUILD_AUDIT_RECEIPT_FILE=<external new receipt path>
```

In real mode the candidate, candidate audit receipt and build-audit receipt must remain outside the public repository.

The build is bound to exact operator-provided SHA-256 values:

```text
CHRC_EXPECTED_VIASNA_CANDIDATE_MANIFEST_SHA256=<64 hex>
CHRC_EXPECTED_VIASNA_AUDIT_RECEIPT_SHA256=<64 hex>
```

## What the audit runs

1. verifies immutable candidate integrity and requires `CANDIDATE_REVIEW`;
2. verifies the existing candidate audit receipt and its binding to the same snapshot;
3. executes the complete `npm run build` using the external candidate as the data source;
4. executes `scripts/validate-pages-artifact.mjs` against that exact build;
5. measures build duration, total audit duration, artifact bytes, file count, HTML count, largest file, sitemap URL count and sitemap shard count;
6. rejects any CSV/private-review/quarantine/identity-resolution material found in `_site`;
7. writes a private immutable build-audit receipt only after all checks pass.

## Default budgets

```text
CHRC_CANDIDATE_MAX_SITE_BYTES=900000000
CHRC_CANDIDATE_MAX_BUILD_SECONDS=480
CHRC_CANDIDATE_MAX_TOTAL_AUDIT_SECONDS=600
CHRC_CANDIDATE_MAX_SINGLE_FILE_BYTES=25000000
```

All budgets are fail-closed and may be tightened for a release run.

## Workspace restoration

The audit temporarily moves any pre-existing `_site` out of the way before building the candidate. The candidate-generated `_site` is always deleted in a `finally` path. The previous `_site` is restored before a PASS receipt or PASS line can be emitted.

Therefore a failed or successful private candidate rehearsal cannot leave real candidate pages in the normal deployment workspace.

## PASS state

A successful receipt has:

```text
state=REAL_VIASNA_CANDIDATE_BUILD_AUDIT_PASS_NOT_PUBLISHED
artifact_contract_pass=true
private_file_leaks=0
workspace_site_restored=true
public_repo_mutated=false
deployment_performed=false
production_published=false
next_gate=EXPLICIT_SNAPSHOT_PROMOTION
```

Wave 43 adds the mechanism and regression coverage only. It does not publish the real Viasna database. The real 2026-08-30 candidate must still be built with the external private snapshot after identity review and candidate audit are complete.
