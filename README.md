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
- Public production release: **FAIL-CLOSED** until all legal/privacy/security/hosting/real-data/release gates pass.

The project owner has explicitly authorized using publicly available Viasna data and the required Telegram channels as discovery/publication sources. This project authorization does not itself grant third-party copyright/database rights, so third-party material remains attribution-first and legal/reuse gates stay separate.

## Public/private boundary

This repository is public. It must never receive unverified editorial review data.

Forbidden here: detention candidate queues, identity conflicts, unpublished health/death claims, data about minors awaiting review, rejected candidates, private editorial notes, or sensitive review reports.

Synthetic parser/test data lives only under `tests/fixtures/` and carries explicit synthetic/test semantics.

## Implemented through Wave 6 development

The repository contains:

- CHUDO-branded mobile/desktop multi-page static UI;
- RU/BE/EN/PL catalogs, profiles, prisons, search, filters and correction history;
- immutable person IDs and exact-snapshot publication model;
- Viasna CSV parser, source observation normalization, anomaly detection and private-only staging sync;
- broad Belarus media registry and source-independence accounting;
- audited media endpoint registry and required Telegram source registry;
- source-attributed news rendering with high-risk and private-data gates;
- no third-party visitor-runtime search/analytics/media requests;
- public methodology, sources, corrections, privacy, security, terms and contacts pages;
- fail-closed release registry and executable production gate;
- pinned read-only GitHub CI;
- synthetic integration and regression tests across Waves 1–6.

## Core commands

```bash
npm run validate
npm run build
npm test
npm run release:status
npm run release:gate
npm run wave6:check
```

`release:gate` intentionally fails until every production gate is genuinely closed and the public snapshot is non-empty, immutable and `PUBLISHED`.

## Remaining path to production

1. Close external legal/privacy review gates.
2. Provision the private editorial boundary outside this public repository.
3. Identify and legally clear the exact Viasna structured export endpoint.
4. Stage the first real Viasna import privately, resolve identities, review anomalies and approve public records.
5. Build the first non-empty immutable public snapshot and validate source attribution/image rights.
6. Validate hosting, HTTPS, DNS and production security headers for `chudzinovich.pp.ua`.
7. Run the final exact-snapshot release suite and only then set `production_authorized=true`.

No code path is allowed to bypass these steps.
