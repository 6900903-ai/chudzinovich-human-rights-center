# Wave 42 — Audited snapshot promotion gate

Status: `IMPLEMENTED_ON_REVIEW_BRANCH`

Wave 42 creates the missing fail-closed boundary between a private `CANDIDATE_REVIEW` Viasna snapshot and the public `data/public/current` snapshot.

## Candidate audit receipt

`scripts/audit-viasna-candidate.mjs` can now write an external audit receipt with:

```text
CHRC_VIASNA_AUDIT_RECEIPT_FILE=<private external path>
```

In real mode the audit receipt is forbidden inside the public repository. It is created as a private file and records the exact candidate snapshot ID, candidate manifest SHA-256, Viasna source SHA-256, counts, provenance checks, URL/search budgets and `private_boundary_leaks=0`.

A successful receipt has:

```text
state=REAL_VIASNA_CANDIDATE_AUDIT_PASS_NOT_PUBLISHED
next_gate=EXPLICIT_SNAPSHOT_PROMOTION
production_published=false
```

## Explicit promotion

The public snapshot can be changed only through `scripts/promote-viasna-snapshot.mjs` with all of the following:

```text
CHRC_VIASNA_PROMOTION_AUTHORIZED=YES_I_AUTHORIZE_PUBLICATION
CHRC_VIASNA_CANDIDATE_DIR=<private candidate snapshot>
CHRC_VIASNA_AUDIT_RECEIPT_FILE=<private audit receipt>
CHRC_EXPECTED_VIASNA_CANDIDATE_MANIFEST_SHA256=<exact candidate manifest SHA-256>
CHRC_EXPECTED_VIASNA_AUDIT_RECEIPT_SHA256=<exact audit receipt SHA-256>
```

The two explicit expected SHA values are mandatory in real mode.

## Promotion checks

Promotion fails closed unless:

- candidate snapshot hashes and sizes verify;
- candidate publication state is exactly `CANDIDATE_REVIEW`;
- candidate manifest SHA matches both the audit receipt and explicit operator-provided SHA;
- audit receipt SHA matches the explicit operator-provided SHA;
- audit state is the exact PASS state above;
- audit snapshot ID, source SHA and counts match the candidate;
- audit reports zero private-boundary leaks;
- the candidate contains exactly the four public snapshot data files;
- canonical `news.json` and `reports.json` have not drifted since candidate preparation.

If support data drifted, the candidate must be prepared and audited again instead of silently rolling public news/reports backward.

## Atomic replacement

The gateway stages the four candidate files and a new `PUBLISHED` manifest in a temporary sibling directory, verifies that staged snapshot, swaps it into `data/public/current`, verifies it again, and restores the previous current directory if the swap fails.

The published manifest records only aggregate/public provenance, including:

- Viasna source SHA-256;
- candidate snapshot ID;
- candidate manifest SHA-256;
- candidate audit receipt SHA-256;
- aggregate parsed/clean/quarantine/review counts when available;
- identity-resolution file SHA only when resolution was applied.

The private audit receipt and private identity-resolution document themselves are never copied into the public repository.

## Important

Wave 42 adds the publication mechanism only. It does not run promotion and does not publish the real Viasna database by itself.
