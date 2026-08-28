# Security boundaries

## 1. Public Git is publication-adjacent

Assume every committed byte can become permanently public through Git history, forks, caches, CI logs, or artifacts.

`PUBLIC_REPO MUST NEVER RECEIVE PRIVATE_REVIEW_DATA.`

## 2. Runtime privacy

The visitor browser must not contact Viasna, media sites, Telegram, analytics, Google, external font hosts, or external image hosts during normal page rendering.

`THIRD_PARTY_RUNTIME_REQUESTS=ZERO`

Only same-origin assets and same-origin search indexes are permitted.

## 3. Source ingestion

Source fetchers are build/sync-time components and are security critical. Live source fetch is disabled unless the corresponding legal/reuse gate is explicitly `PASS`.

## 4. High-risk publication

The following never autopublish: death, suicide, torture, serious health claims, disappearance, minors, sensitive location, identity conflict, release, detention/re-detention, and political-prisoner status changes.

## 5. Sensitive submission form

No sensitive incident-report submission endpoint is present in this increment.
