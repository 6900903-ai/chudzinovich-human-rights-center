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

## First increment

This scaffold contains:

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
- Viasna adapter boundary with live fetch fail-closed behind a legal gate;
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

1. Public shell + canonical data schema — this increment.
2. Viasna structured adapter + parser fixtures.
3. Search, prisoner/prison pages backed by an approved snapshot.
4. Belarus media discovery adapters and private candidate queue boundary.
5. Editorial review integration.
6. Production release only after all gates pass.
