# Wave 2 — Viasna ingestion foundation

Status: **IMPLEMENTED FOR SAFE DEVELOPMENT / LIVE INGESTION STILL BLOCKED**

## Purpose

Wave 2 introduces a parser and validation boundary for a future legally authorized structured sync with the Human Rights Center Viasna.

The public Viasna list currently exposes a table with fields such as name, status, date of birth, detention date, charges, verdict, sentence, judge, prosecutor and prison. The implementation models those fields as **source observations**, not as automatically accepted CHUDZINOVICH facts.

## Absolute rule

`VIASNA_SOURCE_STATUS_CLAIM != CHUDZINOVICH_EDITORIAL_DESIGNATION`

A Viasna row may produce a source-attributed claim that Viasna identifies a person as a current or former political prisoner. The adapter always keeps:

- `canonical_person_id = null`;
- `identity_resolution_state = SOURCE_OBSERVATION_ONLY`;
- `political_prisoner_autodesignation = false`;
- `publication_state = STAGING_OBSERVATION_ONLY`.

No source row can allocate or mutate a canonical person ID by itself.

## Live network gate

Live fetch requires **both**:

- `VIASNA_DATA_REUSE_GATE=PASS`
- `FETCHER_SECURITY_GATE=PASS`

If either is not PASS, the fetcher refuses to run.

No production URL for a CSV endpoint is frozen in this repository until its legal/technical reuse state is reviewed. The parser is tested only against synthetic fixtures.

## Parser behavior

The parser supports Russian, Belarusian and English column labels, quoted multiline CSV cells, partial dates, source status claims, criminal article extraction, release indicators and prison/address splitting.

Partial dates preserve precision:

- `2026-04-12` → day
- `april 2026` → month
- `2026` → year
- unknown/unparseable → explicitly marked unknown/unparsed

It never invents a day when the source only provides a month or year.

## Anomaly gate

Wave 2 detects at least:

- future detention/verdict dates;
- malformed or unparsed dates;
- duplicate source identity fingerprints;
- source count mismatch;
- anomalous total record loss;
- large spikes in missing prison data.

High anomalies block publication by default.

## Snapshot integrity

The snapshot helper creates an immutable directory with:

- `manifest.json`;
- SHA-256 and byte length for each public data file;
- `SHA256SUMS`;
- deterministic snapshot ID based on timestamp + content manifest.

Tampering after creation is detected by `verifySnapshot()`.

## Remaining gates

Wave 2 does **not** close:

- `LEGAL_DATA_REUSE_GATE`;
- `PRIVACY_DPIA_GATE`;
- `FETCHER_SECURITY_GATE` (the code adds defenses, but the formal gate remains pending independent review);
- `SOURCE_ATTRIBUTION_GATE`;
- `PUBLIC_PRODUCTION_RELEASE`.
