# Wave 38 — Real Viasna candidate attestation

Status: `IMPLEMENTED_ON_REVIEW_BRANCH`

Wave 38 strengthens the one-command official Viasna import so the first real candidate cannot silently drift after Wave 37 identity-collision quarantine was introduced.

## New optional fail-closed attestations

The importer accepts:

- `VIASNA_EXPECTED_QUARANTINED`
- `VIASNA_EXPECTED_PEOPLE`
- `VIASNA_EXPECTED_PRISONS`

If any configured expected value differs from the prepared candidate, the import fails before any public snapshot mutation.

The private import receipt also records aggregate structural finding counts and codes.

## Attested values for the 2026-08-30 real export

Source SHA-256:

`0c0b5eeb9108e850a3d021a41913726824d0ba1fe2a43a545af2fa084c22b661`

Expected source values:

```text
VIASNA_EXPECTED_MIN_ROWS=8696
VIASNA_EXPECTED_MAX_ROWS=8696
VIASNA_EXPECTED_ACTIVE=889
VIASNA_EXPECTED_FORMER=3953
VIASNA_EXPECTED_NP=3854
VIASNA_EXPECTED_REVIEW_FINDINGS=11
```

Expected Wave 37 candidate values before private identity resolution:

```text
VIASNA_EXPECTED_QUARANTINED=54
VIASNA_EXPECTED_PEOPLE=8642
VIASNA_EXPECTED_PRISONS=40
```

These counts are aggregate technical evidence only. Identity-conflict details remain outside the public repository.

## Publication boundary

A successful official import still means only:

`PREPARED_FOR_PRIVATE_REVIEW_NOT_PUBLISHED`

It does not change `data/public/current`, does not make the real people database public, and does not authorize snapshot promotion.

The next gate remains private identity resolution followed by `REAL_VIASNA_CANDIDATE_AUDIT=PASS` and explicit snapshot promotion.
