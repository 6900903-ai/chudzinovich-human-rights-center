# CHUDO HUMAN RIGHTS CENTER

Public Russian-language name: **Правозащитный центр CHUDO**.

Production-oriented, static-first human-rights portal scaffold for `https://chudzinovich.pp.ua`.

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

The project owner has explicitly authorized using publicly available Viasna data and the required Telegram channels as discovery/publication sources. This project authorization does not itself grant third-party copyright/database rights, so third-party material remains attribution-first and legal/reuse gates stay separate.

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

Synthetic parser/test data lives only under `tests/fixtures/` and carries explicit synthetic/test semantics.

## Implemented through Wave 5 development

The repository now contains:

- CHUDO-branded multi-page static UI shell;
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
- live Viasna fetch fail-closed behind legal-reuse and fetcher-security gates;
- anomaly detection for future dates, mass record loss, source-count mismatch and prison-field degradation;
- immutable snapshot integrity helpers with SHA-256 verification;
- current/former/repressed public catalogs with strict status separation;
- immutable-ID multilingual person profiles with provenance and correction history;
- prison catalog and institution detail pages;
- local client-side search/filtering over a compact same-origin index;
- disputed-profile noindex policy and synthetic Wave 3 integration tests;
- broad Belarus media discovery registry with 126 discovered source identities;
- 62 candidate-eligible active media sources;
- source-origin independence accounting (`source_count != independent_origin_count`);
- private-only candidate queue writer that rejects any path inside the public repository;
- hardened allowlisted media article fetcher with live-network and legal gates;
- audited Wave 5 source-endpoint registry with RSS/HTML/pending states;
- required Telegram source registry for `@Z690002`, `@phoenixosintvirus`, `@dw_belarus`, `@shtabonoshko`, `@statkevichm`, `@oshorg`, and `@doska_pozora_lida`;
- Telegram publication policy: attributed summaries/short quotes by default, never automatic political-prisoner designation, never doxxing/private-data republication;
- public/private boundary validation;
- smoke tests.

## Commands

```bash
npm run validate
npm run build
npm test
npm run wave5:check
```

The build output is `_site/`.

## Planned order

1. Public shell + canonical data schema — COMPLETE.
2. Viasna parser + anomaly/snapshot foundation — COMPLETE FOR DEVELOPMENT; LIVE INGESTION GATED.
3. Public database/search/prison views — COMPLETE FOR DEVELOPMENT; REAL DATA GATED.
4. Broad Belarus media discovery registry/classifier/private candidate boundary — COMPLETE FOR DEVELOPMENT.
5. Verified source endpoints + Telegram source policy + editorial integration — IN PROGRESS.
6. Legal/privacy/image/source-attribution/release gates, real snapshots, final production audit and launch.
