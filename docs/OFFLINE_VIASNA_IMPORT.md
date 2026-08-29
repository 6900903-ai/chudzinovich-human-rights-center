# Offline Viasna intake

This path exists so CHUDO can stage an exact Viasna CSV export for private editorial review without bypassing source-side HTTP protections and without putting real source data into the public Git repository.

## Boundary

The source CSV and the private review directory must live outside this public repository. The staging command refuses a real input file located inside the repository. Synthetic fixtures remain allowed only in tests.

The command never changes `data/public/current` and never grants political-prisoner status. Every parsed row remains `STAGING_OBSERVATION_ONLY` and source-attributed.

## Required environment

- `VIASNA_SOURCE_FILE` — path to the exact CSV file saved from the public Viasna interface.
- `CHRC_PRIVATE_REVIEW_DIR` — private review root outside the public repository.
- `VIASNA_SOURCE_PAGE_URL` — public Viasna page from which the file was obtained; defaults to `https://prisoners.spring96.org/ru/list`.
- `VIASNA_SOURCE_LOCALE` — `ru`, `be`, or `en`; defaults to `ru`.

Run:

```bash
npm run viasna:stage-file
```

## Evidence written privately

Each immutable run directory contains:

- `source.csv` — exact source bytes;
- `source.json` — SHA-256, acquisition mode, source page, parser version and import time;
- `observations.json` — source observations only;
- `diagnostics.json` — parser diagnostics;
- `anomalies.json` — anomaly findings;
- `metrics.json` — source metrics;
- `decision.json` — quarantine/private-review decision.

All files are created with private-file intent and the run is never promoted automatically.

## Publication rule

`SOURCE != FACT`

`VIASNA_ROW != CHUDO_EDITORIAL_DESIGNATION`

A staged source observation may only reach the public canonical snapshot after identity resolution, editorial review, source-attribution validation, image-rights review where applicable, and the final release gates.
