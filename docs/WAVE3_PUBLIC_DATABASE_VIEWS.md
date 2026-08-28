# Wave 3 — public database views

Status: **IMPLEMENTED FOR SAFE DEVELOPMENT / REAL PUBLIC DATA STILL GATED**

Wave 3 turns an approved immutable snapshot into public, indexable database views without allowing the browser to contact source websites at runtime.

## Implemented

- `/prisoners/` — current political prisoners based only on an explicit public status event;
- `/former-prisoners/` — former political prisoners, never mixed with the current-status list;
- `/repressed/` — all published people in the canonical public snapshot;
- `/prisons/` and individual prison pages;
- immutable-ID person pages: `/prisoners/p-0000001-name/`;
- multilingual RU/BE/EN/PL profile routes and `hreflang` links;
- card/table catalog views;
- mobile filter bottom sheet and desktop filter column;
- client-side same-origin search index with aliases and generated Cyrillic→Latin transliteration tokens;
- pagination for no-JavaScript browsing;
- fact/event source attribution on person profiles;
- correction/change history;
- disputed-profile `noindex,follow` behavior;
- local-image-only portrait policy;
- sitemap generation from the exact snapshot used by the build.

## Status semantics

`POLITICAL_PRISONER` is rendered only when the canonical public record contains an explicit status event with either:

- `designation=SOURCE_ATTRIBUTED`, or
- `designation=EDITORIAL_CONFIRMED`.

A source-attributed designation is visibly marked as “according to source” and displays the source name. No catalog code infers political-prisoner status from detention, charges, media coverage, or release events.

## Provenance gate

Before a public person record is rendered, Wave 3 checks that:

- source-attributed status events refer to a registered public source;
- public detention/charge/judgment/sentence/prison/release events have source provenance;
- a published birth date has a corresponding provenanced fact;
- photos cannot reference remote hosts and cannot be rendered without `rights_state=PERMITTED`;
- private review states do not enter public correction history.

## Synthetic fixture boundary

Wave 3 tests use a three-person synthetic snapshot under `tests/fixtures/public-snapshot/`.

The normal build cannot use that directory. A data-directory override requires both:

- `CHRC_TEST_MODE=1`, and
- a path inside the fixed synthetic fixture boundary.

The Wave 3 test rebuilds the ordinary empty public snapshot before exit so synthetic people cannot remain in the normal `_site` output.

## Runtime privacy

Search fetches only:

`/search-index/{lang}.json`

from the same origin. Source links are ordinary user-initiated hyperlinks; the page does not hotlink source images, fonts, analytics, scripts, or data endpoints.

`THIRD_PARTY_RUNTIME_REQUESTS=ZERO` remains unchanged.

## Still blocked

Wave 3 does not close:

- `LEGAL_DATA_REUSE_GATE`;
- `PRIVACY_DPIA_GATE`;
- `PRIVATE_EDITORIAL_STORAGE_GATE`;
- `FETCHER_SECURITY_GATE`;
- `IMAGE_RIGHTS_GATE`;
- `SOURCE_ATTRIBUTION_GATE` for real production records;
- `PUBLIC_PRODUCTION_RELEASE`.
