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
- `@evanews25`
- `@narodnireporter`

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

Selected Telegram channels are configured as **automatic source feeds**.

Default publication mode:

`AUTO_PUBLISH_ATTRIBUTED_SOURCE_MATERIAL`

For Telegram source materials:

- CHUDO fact-check is not required before publication;
- manual editorial approval is not required before publication;
- allegations and high-risk statements may appear automatically as statements of the named source;
- every item must retain the channel name/handle, original post link and source timestamp when available;
- Telegram material remains `SOURCE_CLAIM_ONLY` and does not silently become an independently verified CHUDO fact;
- Telegram posts cannot directly grant `POLITICAL_PRISONER` status or mutate the canonical person database.

Full verbatim republication of third-party posts is not assumed licensed by default. The system may reproduce full text only for a source where reuse rights are explicitly recorded; otherwise the public item must use the permitted representation while preserving the original-source link.

## Minimum privacy boundary

Automatic publication does not include non-public personal data or doxxing material. The following remain excluded from automatic republication:

- private phone numbers;
- home addresses;
- private emails or private contacts;
- passport/identity-document data;
- other non-public identifying data that materially increases risk.

This boundary is not a fact-check or political/editorial filter; it is a privacy and safety boundary.

## Absolute semantics

`MEDIA_REPORT != POLITICAL_PRISONER_DESIGNATION`

`TELEGRAM_POST != CHUDO_VERIFIED_FACT`

`SOURCE != FACT`

`TELEGRAM_SOURCE_CLAIM_AUTOPUBLISH=true`

`TELEGRAM_FACT_CHECK_REQUIRED=false`

`TELEGRAM_EDITORIAL_REVIEW_REQUIRED=false`

`HIGH_RISK_DATABASE_AUTOPUBLISH=false`

`PRIVATE_DATA_REPUBLICATION=false`
