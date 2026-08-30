# Wave 44 — Private Viasna identity review packet

Status: `IMPLEMENTED_ON_REVIEW_BRANCH`

Wave 44 turns structural identity collisions into a bounded private editorial review packet. It does not decide whether records represent the same person and it does not publish anything.

## Why this exists

The real 2026-08-30 Viasna export contains source-level identity collisions. A shared source person URL or an exact name + day-precision birth signature is evidence that records need review, not permission to merge them automatically.

The public repository must contain only the review mechanism. Names, disputed identity details, reviewer notes and final decisions remain outside the public repository.

## Command

```text
VIASNA_SOURCE_FILE=<external CSV>
CHRC_VIASNA_IDENTITY_REVIEW_DIR=<external private directory>
VIASNA_EXPECTED_SOURCE_SHA256=<exact source SHA-256>
VIASNA_EXPECTED_IDENTITY_COMPONENTS=<expected component count>
VIASNA_EXPECTED_IDENTITY_COLLISION_ROWS=<expected row count>
node scripts/export-viasna-identity-review-packet.mjs
```

In real mode both the source CSV and output root are rejected if they are inside the public repository.

## Output

Each run creates a private directory containing:

- `identity-review-components.json` — evidence needed to compare each complete connected collision component;
- `identity-resolution.template.json` — deliberately non-executable template with `action: null`;
- `IDENTITY_REVIEW_RECEIPT.json` — aggregate hashes and counts only.

Files are created with private permissions where supported.

## Review packet fields

Each component contains:

- complete `source_record_ids` for that connected collision component;
- collision codes;
- source person URL;
- reported and normalized names;
- parsed birth date state;
- known gender signal;
- source status claim;
- detention, verdict and release dates;
- prison facility signal;
- comparison flags and hard merge blockers.

The packet never contains an automatic decision.

```text
automatic_decisions=0
automatic_merge_allowed=false
automatic_keep_distinct_allowed=false
```

## Hard merge blockers

The review packet marks, but does not resolve, conflicts that the executable Wave 40 resolution contract already refuses to merge:

- conflicting exact day-precision birth dates;
- conflicting known genders.

A hard blocker does not automatically mean `KEEP_DISTINCT`; it means `MERGE_SAME_PERSON` is invalid with the current evidence and the component remains an editorial review matter.

## Non-executable template

The generated template intentionally contains:

```json
{
  "action": null,
  "primary_source_record_id": null
}
```

It cannot be passed unchanged to the executable resolution loader. After human private review, each complete component must be explicitly converted to one of:

- `KEEP_DISTINCT`;
- `MERGE_SAME_PERSON` with a valid primary source record.

Partial-component decisions remain invalid.

## Real export attestation target

For the verified 2026-08-30 export, the expected aggregate review boundary is:

```text
VIASNA_EXPECTED_SOURCE_SHA256=0c0b5eeb9108e850a3d021a41913726824d0ba1fe2a43a545af2fa084c22b661
VIASNA_EXPECTED_IDENTITY_COMPONENTS=22
VIASNA_EXPECTED_IDENTITY_COLLISION_ROWS=54
```

These are aggregate technical counts only. Conflict details are not committed to the public repository.

## Next gate

A successful packet means only:

```text
PRIVATE_IDENTITY_REVIEW_PACKET_PREPARED_NOT_PUBLISHED
→ HUMAN_PRIVATE_IDENTITY_REVIEW
```

Only an explicitly reviewed external resolution document may then be used by the existing official import pipeline. Unresolved components remain quarantined.
