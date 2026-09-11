# Wave 46 — Public database provenance transparency

Status: `IMPLEMENTED_ON_REVIEW_BRANCH`

Wave 46 makes the public `/transparency/` pages explain the difference between source rows, published people, structural quarantine, and field-level review findings once the canonical database is actually `PUBLISHED`.

## Publication behavior

The provenance block is generated only when:

```text
manifest.publication_state=PUBLISHED
source_snapshots contains source_id=src-viasna
```

The current `DEVELOPMENT_EMPTY` shell is unchanged and does not display real-database figures before publication.

## Public aggregate fields

For a published Viasna-backed snapshot the four localized transparency pages show:

- source rows processed (`parsed_rows`);
- public CHUDO person profiles (`manifest.counts.people` / `clean_rows`);
- source rows withheld for structural or identity conflicts (`quarantined_rows`);
- individual high-risk fields withheld for separate review (`review_required_findings`);
- current source-attributed political-prisoner profiles;
- former source-attributed political-prisoner profiles;
- other repression-documented profiles;
- current CHUDO snapshot ID;
- source page and observation time;
- full source-file SHA-256;
- aggregate candidate manifest / candidate audit / full-build audit receipt SHA-256 values when present.

## Semantics

The page explicitly states:

```text
SOURCE ROW != PERSON
QUARANTINED SOURCE ROW != PUBLIC PERSON PROFILE
WITHHELD FIELD != WHOLE PERSON REMOVED
```

A quarantined source row is not represented as a public person until the structural or identity conflict is resolved. Private conflict details, names under dispute, reviewer notes, and the editorial review queue remain outside the public repository and are never rendered by this feature.

A field-level review finding is different: a high-risk field may be withheld while the rest of the person record remains eligible for publication.

## Fail-closed checks

For a `PUBLISHED` Viasna snapshot the build fails if:

- people/current/former counts are negative or inconsistent;
- current + former exceeds total people;
- parsed/clean/quarantine/review aggregate values are missing or invalid;
- `clean_rows` differs from the public person count;
- quarantine exceeds parsed source rows;
- public people exceed parsed source rows;
- source SHA-256 is missing or malformed;
- optional audit hashes are malformed;
- source URL is not a valid HTTPS URL;
- the transparency page cannot be safely enhanced exactly once.

## Verified first-release target

The synthetic Wave 46 regression models the verified 2026-08-30 baseline:

```text
source rows = 8696
public people = 8642
quarantined source rows = 54
withheld review fields = 11
current = 889
former = 3952
other repression records = 3801
```

The regression verifies all four locales, source/snapshot hashes, zero private-detail leakage, and fail-closed behavior for an inconsistent published manifest.

This wave changes public explanation and validation only. It does not publish the real Viasna database.
