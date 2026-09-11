# Reviewed real-data snapshot release

The public repository must never contain the raw Viasna export, unpublished identity conflicts, private editorial notes or a candidate snapshot that has not passed the release gates.

## Current state

A first-party CSV export has been discovered through the public Viasna list interface and a non-empty candidate snapshot has been prepared outside this repository. Private validation passed the minimum 5,000-person gate, exact manifest hashes and byte counts, unique record IDs, public provenance checks, a full production build and exact Pages-artifact validation.

This evidence establishes technical readiness only. It does not fabricate legal, privacy or editorial approval and does not authorize publication.

## Private audit

Run against the prepared snapshot directory outside the public repository:

```bash
CHRC_REVIEW_SNAPSHOT_DIR=/private/path/to/snapshot \
CHRC_REVIEW_REPORT_FILE=/private/path/to/sanitized-audit.json \
node scripts/audit-reviewed-snapshot.mjs
```

The command:

- requires an exact five-file snapshot (`manifest.json`, `people.json`, `prisons.json`, `news.json`, `reports.json`);
- verifies every manifest SHA-256 and byte count;
- checks manifest counts, identifiers, attribution, public states and high-risk review requirements;
- blocks fixtures, private/editorial fields, uncleared portraits and undeclared event sources;
- performs no network access and does not mutate the repository;
- emits only a sanitized aggregate report.

## Exact gated promotion

Promotion requires all six gates and three immutable identities:

```bash
CHRC_REVIEW_SNAPSHOT_DIR=/private/path/to/snapshot \
EXPECTED_SNAPSHOT_ID=snap-YYYYMMDDTHHMMSSZ-xxxxxxxx \
EXPECTED_MANIFEST_SHA256=<64 lowercase hex> \
EXPECTED_SOURCE_EXPORT_SHA256=<64 lowercase hex> \
LEGAL_DATA_REUSE_GATE=PASS \
PRIVACY_DPIA_GATE=PASS \
EDITORIAL_REVIEW_GATE=PASS \
SOURCE_ATTRIBUTION_GATE=PASS \
IMAGE_RIGHTS_GATE=PASS \
REAL_DATA_RELEASE_AUTHORIZATION=PASS \
node scripts/promote-reviewed-snapshot.mjs
```

The promotion command refuses destination overrides in production, refuses a dirty tracked worktree, validates the source again, verifies that the expected source-export digest is recorded in the snapshot manifest, copies only the exact manifest file set, validates the staged copy, swaps the canonical snapshot atomically and validates the installed copy. It performs no network access.

## Required release order

1. Complete legal reuse review for the exact first-party export and intended public fields.
2. Complete privacy/DPIA review, including necessity and proportionality of every published field.
3. Resolve identity conflicts and high-risk claims in the private editorial boundary.
4. Confirm source attribution and correction procedures.
5. Confirm portrait rights; a snapshot without portraits may pass with zero portraits.
6. Record explicit real-data release authorization tied to the exact snapshot ID, manifest SHA-256 and source-export SHA-256.
7. Run the promotion command from a clean checkout.
8. Run the full test suite, one fresh production build and exact Pages-artifact validation.
9. Review the generated site before merging and deploying.

No gate may be inferred from a successful parser, build, test, source website availability or general project-owner instruction.
