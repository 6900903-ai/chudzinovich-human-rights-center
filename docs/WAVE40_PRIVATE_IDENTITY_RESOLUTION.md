# Wave 40 — Private Viasna identity resolution

Status: `IMPLEMENTED_ON_REVIEW_BRANCH`

Wave 40 adds an explicit, private, fail-closed identity-resolution contract for structural collisions found in the real Viasna export.

## Public/private boundary

The resolution JSON is editorial review data and MUST remain outside the public repository.

In real mode the loader rejects a resolution file located anywhere inside the repository with:

`VIASNA_IDENTITY_RESOLUTION_INSIDE_PUBLIC_REPO`

The resolution file is bound to the exact Viasna source export by `source_sha256`. A decision file for another export cannot be reused silently.

## Resolution document

```json
{
  "version": 1,
  "source_id": "src-viasna",
  "source_sha256": "<exact 64-hex source SHA-256>",
  "decisions": [
    {
      "decision_id": "review-001",
      "action": "KEEP_DISTINCT",
      "source_record_ids": ["123", "456"]
    },
    {
      "decision_id": "review-002",
      "action": "MERGE_SAME_PERSON",
      "source_record_ids": ["789", "790"],
      "primary_source_record_id": "790"
    }
  ]
}
```

## Allowed actions

### `KEEP_DISTINCT`

The reviewer explicitly confirms that the source records represent different people even though structural source evidence collides. Each record retains its own CHUDO person identity.

### `MERGE_SAME_PERSON`

The reviewer explicitly confirms that all records in the collision component represent the same person. The primary source record determines the canonical public name, birth fact and canonical latest source-attributed status; non-primary names become aliases and events from all member records remain attached to the one CHUDO person.

A merge fails closed when member records contain conflicting fully parsed day-precision birth dates or conflicting known genders.

## No partial decisions

A decision must cover one complete connected identity-collision component. A subset of a collision group is rejected. A source record cannot appear in more than one decision.

Unresolved components remain structurally quarantined. The pipeline never interprets absence of a decision as permission to publish.

## Stable CHUDO identity

When records are merged, all member `source_identity_key` values are retained on the resulting CHUDO person. After publication, future imports can therefore map any of those Viasna source records back to the same stable `person_id`.

## Real 2026-08-30 export baseline

Source SHA-256:

`0c0b5eeb9108e850a3d021a41913726824d0ba1fe2a43a545af2fa084c22b661`

Aggregate identity-review baseline:

- structural collision components: `22`
- rows participating in those components: `54`
- unresolved rows remain private until explicitly reviewed
- no collision decision is inferred automatically from a shared URL, shared name or source record ordering

Identity-conflict details and the actual decision file are not stored in this public repository.

## Import invocation

The official importer accepts an optional external resolution file:

```text
CHRC_VIASNA_IDENTITY_RESOLUTION_FILE=<private external JSON path>
```

Optional exact attestations:

```text
VIASNA_EXPECTED_IDENTITY_COMPONENTS=22
VIASNA_EXPECTED_IDENTITY_RESOLVED_COMPONENTS=<reviewed component count>
VIASNA_EXPECTED_IDENTITY_UNRESOLVED_COMPONENTS=<remaining component count>
```

A successful import still produces only a private `CANDIDATE_REVIEW` snapshot. It does not mutate `data/public/current` and does not authorize publication.
