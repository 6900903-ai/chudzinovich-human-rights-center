# Wave 37 — Viasna identity collision gate

Status: `IMPLEMENTED_ON_REVIEW_BRANCH`

Purpose: prevent the first real Viasna candidate snapshot from publishing multiple CHUDO person records when the source export contains structurally ambiguous identity mappings.

## Fail-closed rules

A Viasna `source_record_id` remains the source-record identity and is never replaced by a CHUDO `person_id`.

Before promotion, all rows in either of these collision classes are treated as structural `HIGH` findings and quarantined for private editorial identity review:

1. multiple distinct `source_record_id` values resolve to the same validated `source_person_url`;
2. multiple distinct `source_record_id` values share the same normalized name and the same fully parsed day-precision birth date.

The importer MUST NOT auto-merge these records. It also MUST NOT publish an arbitrary first record while quarantining only later duplicates. Every row participating in a structural identity collision is withheld until identity resolution is complete.

Field-level review remains separate. A death claim or future event date is still withheld as a field-level `REVIEW` finding and does not by itself remove the person from the candidate.

## Real export audit, 2026-08-30

Source SHA-256:

`0c0b5eeb9108e850a3d021a41913726824d0ba1fe2a43a545af2fa084c22b661`

Aggregate findings only; no private identity-conflict details are stored in this public repository.

- parsed rows: `8696`
- source status counts: `active=889`, `former=3953`, `np=3854`
- CSV column mismatches: `0`
- duplicate source record IDs: `0`
- invalid source person URLs: `0`
- repeated source person URL groups: `20`
- rows participating in repeated source person URLs: `50`
- strong name + exact birth-date collision groups outside those URL groups: `2`
- additional rows in strong-signature collisions: `4`
- total structural identity quarantine: `54`
- field-level review findings: `11`
- expected clean candidate people before private identity resolution: `8642`
- clean candidate status counts: `active=889`, `former=3952`, `np=3801`
- unique prison facilities after structural quarantine: `40`

## Publication rule

`REAL_VIASNA_CANDIDATE_AUDIT` cannot pass while structural identity collisions are unresolved.

The public `data/public/current` snapshot must remain unchanged until a bounded candidate audit and explicit snapshot promotion are completed.
