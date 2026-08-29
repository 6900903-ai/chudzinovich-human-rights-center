# CHUDO HUMAN RIGHTS CENTER — source and reuse policy

## Project-owner authorization

The project owner has explicitly directed CHUDO HUMAN RIGHTS CENTER to use publicly available information from Human Rights Center Viasna and to publish materials sourced from these Telegram channels:

- `@Z690002`
- `@phoenixosintvirus`
- `@dw_belarus`
- `@shtabonoshko`
- `@statkevichm`
- `@oshorg`
- `@doska_pozora_lida`

This is an internal project authorization to build the ingestion/publication functionality. It does **not** by itself establish ownership of third-party copyright/database rights or close a third-party legal-reuse gate.

## Viasna

CHUDO may ingest and normalize publicly available factual data from Viasna with explicit provenance. The canonical database keeps fact-level source references and does not silently convert a source claim into an independently verified CHUDO fact.

Default content rule:

- factual observations: reusable with attribution subject to legal review;
- long article text: do not copy wholesale;
- photos: do not mirror unless image rights are cleared;
- political-prisoner status from Viasna: display as source-attributed unless CHUDO separately performs its own approved editorial designation.

`PROJECT_OWNER_VIASNA_USE_AUTHORIZATION=GRANTED`

`LEGAL_DATA_REUSE_GATE` remains a separate release gate because the project owner cannot grant third-party rights on behalf of Viasna.

## Telegram publication

Default mode:

`ATTRIBUTED_SUMMARY_AND_SHORT_QUOTE`

Every Telegram-derived public item should preserve:

- channel handle/name;
- source post URL;
- source publication time when available;
- CHUDO publication time;
- label indicating that the information comes from the named source.

Full verbatim republication of third-party posts is **not** assumed permitted by default.

## Safety/editorial rules

Telegram reports can become public news materials, but they cannot directly grant `POLITICAL_PRISONER` status or silently mutate a person's canonical record.

The following require editorial review before public publication:

- allegations of crime, corruption, collaboration, agency or wrongdoing about an identifiable person;
- death, suicide, torture, sexual violence, serious health claims, disappearance or minors;
- identity conflicts;
- sensitive locations;
- claims that materially change a person's legal/human-rights status.

The following must not be republished from Telegram:

- private phone numbers;
- home addresses;
- private emails or private contacts;
- passport/identity-document data;
- doxxing material;
- other non-public personal information that creates additional risk.

## Absolute semantics

`MEDIA_REPORT != POLITICAL_PRISONER_DESIGNATION`

`TELEGRAM_POST != VERIFIED_FACT`

`SOURCE != FACT`

`HIGH_RISK_NEWS_AUTOPUBLISH=false`

`HIGH_RISK_DATABASE_AUTOPUBLISH=false`

`PRIVATE_DATA_REPUBLICATION=false`
