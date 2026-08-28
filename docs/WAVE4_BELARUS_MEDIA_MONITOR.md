# Wave 4 — Belarus media monitor

Status: **IMPLEMENTED FOR SAFE DEVELOPMENT / LIVE AUTOMATIC SOURCE POLLING STILL GATED**

## Core rule

`MEDIA_REPORT != POLITICAL_PRISONER_DESIGNATION`

No media source — independent, commercial, state, foreign or specialist — can create `POLITICAL_PRISONER` by itself.

A media report may create only:

1. a private source observation;
2. a private repression candidate;
3. provenance for later editorial/human-rights verification.

## Registry coverage

`source-registry/media-sources/` is a **broad discovery registry**, not a claim to be a complete legal census of every media outlet ever registered in Belarus.

The initial Wave 4 registry contains 108 discovered current, historical or needs-recheck source identities, including national and regional independent media, investigative and specialist projects, foreign Belarus-focused services, commercial domestic news media, business/thematic media, state national/regional media and historical successor identities.

Sources discovered but lacking a confidently verified current website are retained with monitoring disabled instead of inventing an endpoint.

The research baseline includes the Belarusian Association of Journalists Media Assembly registry (2026), BAJ media-sector and regional-press materials, current Belarus media guides, and public media-monitoring references.

## Eligibility vs automatic polling

`candidate_discovery_enabled=true` means reports from that outlet may be accepted into the private discovery pipeline. It does **not** mean the scheduler may scrape the outlet.

Automatic scheduled fetching additionally requires:

- `endpoint_verified=true`;
- an explicit HTTPS `discovery_endpoint`;
- the endpoint host to belong to the source allowlist;
- source legal/reuse state to be cleared;
- `MEDIA_MONITOR_NETWORK_GATE=PASS`;
- `FETCHER_SECURITY_GATE=PASS`;
- `MEDIA_SOURCE_REUSE_GATE=PASS`.

Wave 4 intentionally ships with no guessed feed endpoints, therefore scheduled live polling remains disabled until endpoint verification.

## Classifier

The classifier supports Russian and Belarusian discovery signals for detention/arrest, search, criminal cases, political trials/sentences, transfer, release, torture/conditions and high-risk death/health/disappearance signals.

Classification values:

- `POLITICAL_REPRESSION_CANDIDATE`
- `ORDINARY_CRIME`
- `UNKNOWN`
- `HUMAN_RIGHTS_RELEVANT`
- `FOREIGN_JURISDICTION`
- `FALSE_POSITIVE`

Keywords are discovery signals only.

## Source independence

`SOURCE_COUNT != INDEPENDENT_CONFIRMATION_COUNT`

Four media articles that all relay one МВД announcement are one independent origin, not four confirmations.

Wave 4 stores `upstream_source`, `origin_claim_id`, `independence_group`, `source_count` and `independent_origin_count`. Grouping is intentionally conservative: uncertain independence lowers confidence instead of raising it.

## Private candidate boundary

Candidate data must never enter the public Git repository.

`CHRC_PRIVATE_REVIEW_DIR` must resolve to a directory **outside** the repository. The writer rejects repository-local paths even if they are gitignored.

Candidate records always carry `publication_blocked=true` and `private_record=true`. They do not contain a political-prisoner designation field.

## Fetcher security

The generic media fetcher accepts only pre-registered source domains, requires HTTPS, blocks URL credentials, resolves DNS before fetching and blocks private/loopback/link-local addresses, blocks redirects, limits response size, accepts only text/HTML/XML/RSS-like content, and never executes source JavaScript or embedded resources.

## High-risk rule

Death, suicide, torture, sexual violence, serious health claims, disappearance, minors, identity conflicts and sensitive locations never become public automatically.

`HIGH_RISK_NEWS_AUTOPUBLISH=false`
`HIGH_RISK_DATABASE_AUTOPUBLISH=false`

## Runtime privacy

The visitor browser does not contact any monitored media source.

`THIRD_PARTY_RUNTIME_REQUESTS=ZERO`

All monitoring happens outside visitor runtime.

## Synthetic tests

Wave 4 test fixtures contain invented names and test URLs only. They verify that ordinary-crime reports are not treated as political repression, rewrites of one official claim do not inflate corroboration, independent origin counting works, high-risk claims stay blocked, repository-local candidate storage is rejected, and the network fetcher remains fail-closed without gates.
