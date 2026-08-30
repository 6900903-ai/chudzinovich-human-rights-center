# Wave 45 — One-command real Viasna release rehearsal

Status: `IMPLEMENTED_ON_REVIEW_BRANCH`

Wave 45 combines the existing private import and audit gates into one local command. It prepares and fully builds the real clean candidate but never promotes or deploys it.

## One command

From the repository root on Windows PowerShell:

```powershell
node scripts/rehearse-viasna-release.mjs --source "C:\path\to\export.csv" --output "D:\CHUDO_PRIVATE\viasna-release-rehearsal"
```

The default release profile is:

`config/viasna-release-profile-2026-08-30.json`

It is bound to the verified 2026-08-30 official export SHA-256 and aggregate counts.

Optional arguments:

```text
--profile <profile.json>
--as-of <ISO-8601>
--help
```

Environment variables remain supported for automation, but are not required for the basic local command.

## Baseline policy

This rehearsal deliberately uses:

```text
QUARANTINE_UNRESOLVED_NO_AUTOMATIC_DECISIONS
```

It does not accept an identity-resolution file. For the verified real export this means:

- source rows: `8696`;
- identity collision components: `22`;
- collision rows retained in private quarantine: `54`;
- automatic identity decisions: `0`;
- clean candidate people: `8642`;
- candidate active political-prisoner source claims: `889`;
- candidate former political-prisoner source claims: `3952`;
- candidate `np` / repression-documented records: `3801`;
- prisons: `40`.

The rehearsal therefore measures the site that can be built from the safe non-conflicting subset without pretending that the 54 ambiguous source rows have been resolved.

## Pipeline executed

The command performs, in order:

1. exact source file SHA-256 and byte-size validation;
2. Wave 44 private identity review packet generation;
3. official Viasna import with exact source/count/quarantine attestations;
4. immutable `CANDIDATE_REVIEW` snapshot preparation;
5. candidate integrity/provenance/identity/scale audit;
6. Wave 43 ephemeral `PUBLISHED` preview full site build;
7. exact Pages artifact contract validation;
8. build-size, HTML, sitemap and timing measurement;
9. private aggregate rehearsal receipt creation.

No promotion command is invoked anywhere in the rehearsal.

## Output

A private run directory is created under the supplied `--output` directory. It contains the private identity packet, import receipt, candidate snapshot, candidate audit receipt, full-build audit receipt and:

`REAL_RELEASE_REHEARSAL_RECEIPT.json`

The final receipt binds:

- source SHA-256;
- import receipt SHA-256;
- candidate snapshot ID and manifest SHA-256;
- candidate audit receipt SHA-256;
- candidate full-build audit receipt SHA-256;
- site size, HTML count, sitemap shards/URLs and build timing;
- identity quarantine counts.

## PASS state

A successful rehearsal ends with:

```text
REAL_VIASNA_RELEASE_REHEARSAL_PASS_NOT_PUBLISHED
public_repo_mutated=false
deployment_performed=false
production_published=false
promotion_authorized=false
```

The next gate is explicitly not automatic publication:

```text
HUMAN_PRIVATE_IDENTITY_REVIEW_OR_OWNER_DECISION_ON_QUARANTINED_SUBSET
```

This permits the project to obtain real scale evidence now while keeping ambiguous identities private.

## Fail-closed rules

The command stops if any attested source count changes, the source SHA/size differs, the private identity component count drifts, the candidate counts differ, the candidate audit fails, the full `PUBLISHED` preview build fails, the final Pages artifact contract fails, or `data/public/current/manifest.json` changes during rehearsal.

In real mode the source CSV and rehearsal output directory must both remain outside the public repository.
