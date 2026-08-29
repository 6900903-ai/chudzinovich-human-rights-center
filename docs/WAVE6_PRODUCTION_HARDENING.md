# Wave 6 — production hardening

Status: **IMPLEMENTED FOR DEVELOPMENT / PRODUCTION RELEASE REMAINS FAIL-CLOSED**

Wave 6 adds the last code-level production boundary before real-data publication and hosting activation.

## Added

- public multilingual pages for methodology, sources, corrections, privacy, security, terms and contacts;
- explicit release-gate registry at `release/gates.json`;
- `npm run release:status` and fail-closed `npm run release:gate`;
- production release requires a non-empty immutable `PUBLISHED` snapshot;
- private-only Viasna sync staging command `scripts/sync-viasna.mjs`;
- no Viasna sync can mutate public data directly;
- Viasna staging requires an export URL, legal/reuse gate, fetcher-security gate and private storage outside the public repository;
- source observations are quarantined when high/blocking anomalies appear.

## Production cannot be declared from code alone

The following remain external or operational gates and must not be forged as PASS:

- legal review of systematic third-party data reuse;
- privacy/DPIA review;
- private editorial infrastructure actually provisioned;
- independent fetcher security review;
- real-data source attribution validation;
- image rights validation for every real portrait;
- DNS/HTTPS/hosting validation with production headers;
- final release tests against the exact real immutable snapshot.

`PUBLIC_PRODUCTION_RELEASE` therefore remains blocked until every required gate is genuinely PASS.

## Absolute rules

`SOURCE != FACT`

`MEDIA_REPORT != POLITICAL_PRISONER_DESIGNATION`

`TELEGRAM_POST != VERIFIED_FACT`

`UNVERIFIED_EDITORIAL_DATA_IN_PUBLIC_GIT=FORBIDDEN`

`HIGH_RISK_AUTOPUBLISH=false`
