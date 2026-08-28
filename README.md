# CHUDZINOVICH HUMAN RIGHTS CENTER

Production-oriented, static-first scaffold for `https://chudzinovich.pp.ua`.

## Current authorization state

- Development: **AUTHORIZED**
- Public UI implementation: **AUTHORIZED**
- Canonical database implementation: **AUTHORIZED**
- Source adapters implementation: **AUTHORIZED**
- Political-prisoner auto-designation: **FORBIDDEN**
- High-risk database autopublish: **FORBIDDEN**
- High-risk news autopublish: **FORBIDDEN**
- Sensitive submission form: **DISABLED**
- Public production release: **BLOCKED** until all legal/privacy/security/release gates pass.

## Public/private boundary

This repository is intended to be **public**. It must never receive unverified editorial review data.

Forbidden here:

- detention candidate queues;
- identity conflicts and internal matching notes;
- unpublished health claims or death reports;
- data about minors awaiting review;
- rejected candidates;
- private editorial notes;
- sensitive admin/review reports.

Synthetic parser/test data lives only under `tests/fixtures/` and carries `fixture: true`.

## Implemented through Wave 3

The repository now contains:

- branded multi-page static UI shell;
- mobile-first fixed header, horizontal navigation, accessible side menu;
- canonical public data model and JSON schemas;
- immutable `person_id` rule;
- empty public snapshot (no invented prisoners);
- local client-side search architecture;
- snapshot-derived statistics;
- same-origin-only runtime policy;
- security headers template;
- source adapter registry;
- Viasna structured-data parser with RU/BE/EN header normalization;
- live Viasna fetch fail-closed behind both legal-reuse and fetcher-security gates;
- anomaly detection for future dates, mass record loss, source-count mismatch and prison-field degradation;
- immutable snapshot integrity helpers with SHA-256 verification;
- current/former/repressed public catalogs with strict status separation;
- immutable-ID multilingual person profiles with provenance and correction history;
- prison catalog and institution detail pages;
- local client-side search/filtering over a compact same-origin index;
- disputed-profile noindex policy and synthetic Wave 3 integration tests;
- public/private boundary validation;
- smoke tests.

## Commands

```bash
npm run validate
npm run build
npm test
```

The build output is `_site/`.

## Planned order

1. Public shell + canonical data schema — COMPLETE.
2. Viasna structured adapter + synthetic parser fixtures + anomaly/snapshot foundation — COMPLETE FOR DEVELOPMENT; LIVE INGESTION GATED.
3. Search, prisoner/prison pages backed by an approved snapshot — COMPLETE FOR DEVELOPMENT; REAL DATA GATED.
4. Belarus media discovery adapters and private candidate queue boundary.
5. Editorial review integration.
6. Production release only after all gates pass.
