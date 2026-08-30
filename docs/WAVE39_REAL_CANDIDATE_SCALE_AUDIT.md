# Wave 39 — Real Viasna candidate scale / SEO audit

Status: `IMPLEMENTED_ON_REVIEW_BRANCH`

This wave adds a read-only audit for a prepared immutable `CANDIDATE_REVIEW` snapshot. The auditor never promotes a snapshot and never writes to `data/public/current`.

## Checks

The audit fails closed on:

- snapshot hash or file-size mismatch;
- publication state other than `CANDIDATE_REVIEW`;
- fixture or non-public person objects in the candidate;
- public provenance errors;
- duplicate or malformed CHUDO `person_id`;
- one source identity key being owned by multiple CHUDO people;
- duplicate or malformed prison IDs;
- private-review / quarantine fields leaking into public candidate objects;
- manifest count drift;
- Viasna source SHA drift when an expected SHA is configured;
- duplicate generated core routes;
- projected core URL count exceeding the configured budget;
- projected sitemap count leaving insufficient headroom below 50,000 URLs;
- per-language local search indexes exceeding the configured byte budget.

## Real 2026-08-30 candidate expectations before private identity resolution

```text
VIASNA_EXPECTED_SOURCE_SHA256=0c0b5eeb9108e850a3d021a41913726824d0ba1fe2a43a545af2fa084c22b661
VIASNA_EXPECTED_PEOPLE=8642
VIASNA_EXPECTED_PRISONS=40
VIASNA_EXPECTED_CANDIDATE_ACTIVE=889
VIASNA_EXPECTED_CANDIDATE_FORMER=3952
VIASNA_EXPECTED_CANDIDATE_NP=3801
CHRC_CANDIDATE_SITEMAP_URL_RESERVE=5000
CHRC_CANDIDATE_MAX_CORE_URLS=45000
CHRC_CANDIDATE_MAX_SEARCH_INDEX_BYTES_PER_LANG=16777216
```

For 8,642 clean candidate people, the core generator projects:

- person profile pages: `34,568` across RU/BE/EN/PL;
- category pagination pages: `1,132` across RU/BE/EN/PL;
- prison detail pages: `160`;
- core hub/static pages: `28`;
- projected core URLs: `35,888`.

With a 5,000-URL reserve for news, guides, sources and other generated sections, the projected sitemap occupancy is `40,888`, leaving 9,112 URLs below the single-sitemap 50,000 URL ceiling.

## Invocation

Run against the private candidate snapshot directory, not the raw CSV and not the public repository:

```text
CHRC_VIASNA_CANDIDATE_DIR=<private snapshot dir> node scripts/audit-viasna-candidate.mjs
```

For the real snapshot, supply the exact expected values above in the environment. A PASS means only:

`REAL_VIASNA_CANDIDATE_AUDIT_PASS_NOT_PUBLISHED`

It does not authorize publication. Identity conflicts remain a separate private editorial gate, followed by explicit snapshot promotion.
