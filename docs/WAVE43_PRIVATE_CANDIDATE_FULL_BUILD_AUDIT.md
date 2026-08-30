# Wave 43 — Private candidate full build audit

Status: `IMPLEMENTED_ON_REVIEW_BRANCH`

Wave 43 adds the missing pre-publication rehearsal for a real Viasna candidate. It performs the same full static build and final Pages artifact validation used by the site, but reads an immutable external candidate, renders it through an ephemeral `PUBLISHED` preview, and never promotes or deploys it.

## Gate chain

The release chain is explicit and fail-closed:

```text
CANDIDATE_REVIEW
→ REAL_VIASNA_CANDIDATE_AUDIT_PASS_NOT_PUBLISHED
→ FULL_CANDIDATE_BUILD_AUDIT
→ REAL_VIASNA_CANDIDATE_BUILD_AUDIT_PASS_NOT_PUBLISHED
→ EXPLICIT_SNAPSHOT_PROMOTION
→ PUBLISHED
```

The ordinary candidate audit no longer hands directly to publication. Its receipt must have:

```text
next_gate=FULL_CANDIDATE_BUILD_AUDIT
```

## Required private inputs

```text
CHRC_VIASNA_CANDIDATE_DIR=<external candidate snapshot>
CHRC_VIASNA_AUDIT_RECEIPT_FILE=<external candidate audit receipt>
CHRC_VIASNA_BUILD_AUDIT_RECEIPT_FILE=<external new receipt path>
```

In real mode the candidate, candidate audit receipt and build-audit receipt must remain outside the public repository.

The build is bound to exact operator-provided SHA-256 values:

```text
CHRC_EXPECTED_VIASNA_CANDIDATE_MANIFEST_SHA256=<64 hex>
CHRC_EXPECTED_VIASNA_AUDIT_RECEIPT_SHA256=<64 hex>
```

## PUBLISHED preview

The immutable candidate itself remains `CANDIDATE_REVIEW`. Wave 43 copies only its four public data files into a temporary private directory and writes an audit-only manifest whose effective render state is `PUBLISHED`.

This is necessary because the future production site must be rehearsed with the same indexing and catalog behavior that will exist after promotion. Building the raw `CANDIDATE_REVIEW` state would leave canonical database sections in pre-publication `noindex` mode and could produce a false PASS.

The temporary preview:

- is created outside the public repository;
- uses the exact audited candidate data files and hashes;
- is verified before the build;
- is never used as `data/public/current`;
- is deleted whether the audit passes or fails;
- never changes the immutable original candidate.

## What the audit runs

1. verifies immutable candidate integrity and requires `CANDIDATE_REVIEW`;
2. verifies the existing candidate audit receipt, requires `next_gate=FULL_CANDIDATE_BUILD_AUDIT`, and binds it to the same snapshot;
3. creates and verifies the ephemeral `PUBLISHED` preview outside the repo;
4. executes the complete `npm run build` using that preview;
5. executes `scripts/validate-pages-artifact.mjs` against that exact build in published behavior;
6. measures build duration, total audit duration, artifact bytes, file count, HTML count, largest file, sitemap URL count and sitemap shard count;
7. rejects any CSV/private-review/quarantine/identity-resolution material found in `_site`;
8. deletes the generated candidate `_site` and preview and restores the pre-existing `_site` before PASS can be emitted;
9. writes a private immutable build-audit receipt only after all checks pass.

## Default budgets

```text
CHRC_CANDIDATE_MAX_SITE_BYTES=900000000
CHRC_CANDIDATE_MAX_BUILD_SECONDS=480
CHRC_CANDIDATE_MAX_TOTAL_AUDIT_SECONDS=600
CHRC_CANDIDATE_MAX_SINGLE_FILE_BYTES=25000000
```

All budgets are fail-closed and may be tightened for a release run.

## Workspace restoration

The audit temporarily moves any pre-existing `_site` out of the way before building the preview. The candidate-generated `_site` is always deleted in a `finally` path. The previous `_site` and cleanup of the temporary preview are completed before a PASS receipt or PASS line can be emitted.

Therefore a failed or successful private candidate rehearsal cannot leave real candidate pages or a temporary published-preview dataset in the normal deployment workspace.

## PASS state

A successful receipt has:

```text
state=REAL_VIASNA_CANDIDATE_BUILD_AUDIT_PASS_NOT_PUBLISHED
candidate_publication_state=CANDIDATE_REVIEW
rendered_publication_state=PUBLISHED
published_preview_ephemeral=true
artifact_contract_pass=true
private_file_leaks=0
workspace_site_restored=true
preview_removed=true
public_repo_mutated=false
deployment_performed=false
production_published=false
next_gate=EXPLICIT_SNAPSHOT_PROMOTION
```

## Promotion is dependent on Wave 43

`scripts/promote-viasna-snapshot.mjs` requires the Wave 43 build receipt in addition to the candidate and ordinary audit receipt:

```text
CHRC_VIASNA_PROMOTION_AUTHORIZED=YES_I_AUTHORIZE_PUBLICATION
CHRC_VIASNA_CANDIDATE_DIR=<external candidate>
CHRC_VIASNA_AUDIT_RECEIPT_FILE=<external candidate audit receipt>
CHRC_VIASNA_BUILD_AUDIT_RECEIPT_FILE=<external build audit receipt>
CHRC_EXPECTED_VIASNA_CANDIDATE_MANIFEST_SHA256=<64 hex>
CHRC_EXPECTED_VIASNA_AUDIT_RECEIPT_SHA256=<64 hex>
CHRC_EXPECTED_VIASNA_BUILD_AUDIT_RECEIPT_SHA256=<64 hex>
```

In real mode all three exact SHA values are mandatory. Promotion verifies that the build receipt is for the same candidate and the same candidate-audit receipt, that `rendered_publication_state=PUBLISHED`, that the preview was ephemeral and removed, that the Pages artifact contract passed, that no private file leaked, that the normal workspace was restored, and that neither deployment nor production publication occurred during the rehearsal.

The eventual public snapshot manifest records the aggregate SHA-256 of both private audit receipts but never copies either private receipt into the public repository.

Wave 43 adds the mechanism and regression coverage only. It does not publish the real Viasna database. The real 2026-08-30 candidate must still be prepared after identity review, audited, fully built in private PUBLISHED-preview mode, and only then explicitly promoted.
