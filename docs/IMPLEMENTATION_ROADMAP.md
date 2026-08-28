# Implementation roadmap

## Wave 1 — public foundation
- static multi-page shell;
- canonical schema;
- immutable identity;
- empty last-known-good development snapshot;
- local search surface;
- runtime privacy boundary;
- public/private Git guard.

## Wave 2 — Viasna adapter — DEVELOPMENT IMPLEMENTATION COMPLETE
- parser and source-observation normalization implemented;
- synthetic multilingual parser fixtures implemented;
- partial-date precision preservation implemented;
- anomaly detection and immutable snapshot integrity implemented;
- live fetch remains fail-closed until legal/reuse and fetcher-security gates pass;
- exact production structured endpoint remains intentionally unfrozen pending review;
- Viasna source status never becomes an autonomous CHUDZINOVICH designation.

## Wave 3 — public database views — DEVELOPMENT IMPLEMENTATION COMPLETE
- current/former/repressed catalog separation implemented;
- immutable-ID multilingual profile pages implemented;
- prison catalog and current-placement linkage implemented;
- public event/fact provenance guard implemented;
- correction history and disputed noindex behavior implemented;
- pagination, cards/table modes, local search/filter index implemented;
- only synthetic fixture data used for integration testing; real production data remains gated.

## Wave 4 — Belarus media discovery — DEVELOPMENT IMPLEMENTATION COMPLETE
- broad discovery registry implemented; it is explicitly not an exhaustive legal census of every registered Belarusian publication;
- current registry contains 126 discovered source identities and 62 candidate-eligible active sources across independent national, regional, investigative, specialist, minority, commercial, state, foreign Belarus-focused, social/video and historical media/project classes;
- media reports remain source claims and never create a political-prisoner designation;
- multilingual discovery classifier separates political-repression candidates from ordinary-crime signals;
- upstream-origin grouping prevents multiple rewrites of one police/government claim from inflating corroboration;
- candidate queue records can be written only to a private directory outside the public repository;
- high-risk candidates remain publication-blocked;
- allowlisted HTTPS fetcher blocks redirects, private/loopback/link-local destinations and oversized/non-text responses;
- automatic polling requires a separately verified discovery endpoint for each source; no endpoint is guessed or activated by default;
- initial schedulable live source count remains zero until those per-source legal/technical gates are closed.

## Wave 5 — editorial integration and release gates
- verified per-source feeds/endpoints and rate-limit policy;
- private editorial review storage and UI;
- legal data reuse;
- DPIA/privacy;
- fetcher security independent review;
- CI supply chain;
- image rights;
- source attribution;
- full release tests.
