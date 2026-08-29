# Wave 32 — live Viasna export discovery

## Purpose

Wave 32 closes the technical gap between the public Viasna list page and the already implemented private snapshot-preparation pipeline. It discovers the first-party CSV link from the current list page instead of guessing an undocumented endpoint.

## Boundaries

- The workflow has `contents: read` only.
- It stores no CSV artifact and commits no personal data.
- It prints only endpoint/integrity/parser metrics.
- URL validation remains HTTPS-only and restricted to the approved Viasna domains.
- Redirects, private DNS destinations, oversized responses, wrong content types, access interstitials and HTML masquerading as CSV fail closed.
- Multiple equally strong export links fail as ambiguous.
- A live export must parse at least 5,000 observations with at least 75% canonical header coverage.
- Source status remains attributed to Viasna; CHUDO political-prisoner autodesignation remains disabled.

## Workflow

`CHUDO Viasna Export Discovery` runs its synthetic fail-closed test on pull requests. On `main`, on manual dispatch and every six hours it additionally:

1. fetches `https://prisoners.spring96.org/ru/list`;
2. discovers the explicit CSV anchor;
3. downloads the first-party export under the same network boundary;
4. parses it with the existing multilingual Viasna adapter;
5. verifies minimum record count, header coverage and column integrity;
6. emits only a non-personal summary with SHA-256 values.

A successful run authorizes the next engineering step: prepare a private immutable snapshot and review quarantined rows before any public database mutation.
