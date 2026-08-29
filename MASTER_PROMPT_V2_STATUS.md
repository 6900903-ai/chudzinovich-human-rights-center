# MASTER PROMPT V2 — frozen implementation status

```text
CHUDO_HUMAN_RIGHTS_CENTER_MASTER_PROMPT_V2=PASS
PUBLIC_BRAND_RU=ПРАВОЗАЩИТНЫЙ_ЦЕНТР_CHUDO
PUBLIC_BRAND_EN=CHUDO_HUMAN_RIGHTS_CENTER
DEVELOPMENT_START=AUTHORIZED

PUBLIC_UI_IMPLEMENTATION=AUTHORIZED
CANONICAL_DATABASE_IMPLEMENTATION=AUTHORIZED
SOURCE_ADAPTERS_IMPLEMENTATION=AUTHORIZED
VIASNA_INGESTION_IMPLEMENTATION=AUTHORIZED
BELARUS_MEDIA_MONITOR_IMPLEMENTATION=AUTHORIZED
TELEGRAM_SOURCE_INGESTION_IMPLEMENTATION=AUTHORIZED
CLIENT_SIDE_SEARCH_IMPLEMENTATION=AUTHORIZED
SNAPSHOT_PIPELINE_IMPLEMENTATION=AUTHORIZED
CORRECTION_HISTORY_IMPLEMENTATION=AUTHORIZED

PROJECT_OWNER_VIASNA_USE_AUTHORIZATION=GRANTED
PROJECT_OWNER_REQUIRED_TELEGRAM_SOURCES=9
TELEGRAM_SOURCE_CLAIM_AUTOPUBLISH=AUTHORIZED
TELEGRAM_FACT_CHECK_REQUIRED=false
TELEGRAM_EDITORIAL_REVIEW_REQUIRED=false

UNVERIFIED_EDITORIAL_DATA_IN_PUBLIC_GIT=FORBIDDEN
POLITICAL_PRISONER_AUTODESIGNATION=FORBIDDEN
HIGH_RISK_DATABASE_AUTOPUBLISH=FORBIDDEN
HIGH_RISK_NEWS_AUTOPUBLISH=FORBIDDEN
PRIVATE_DATA_REPUBLICATION=FORBIDDEN
SENSITIVE_SUBMISSION_FORM=DISABLED

PUBLIC_PRODUCTION_RELEASE=BLOCKED_PENDING:
- LEGAL_DATA_REUSE_GATE
- PRIVACY_DPIA_GATE
- PRIVATE_EDITORIAL_STORAGE_GATE
- FETCHER_SECURITY_GATE
- CI_SUPPLY_CHAIN_GATE
- IMAGE_RIGHTS_GATE
- SOURCE_ATTRIBUTION_GATE
- RELEASE_TESTS
```

## Absolute semantic rules

`MEDIA_REPORT != POLITICAL_PRISONER_DESIGNATION`

`TELEGRAM_POST != CHUDO_VERIFIED_FACT`

`SOURCE != FACT`

Selected Telegram channels are source-attributed publication feeds. Their posts may be published automatically without CHUDO fact-checking or manual editorial approval. The public item must identify the originating channel/post and must remain a source claim; it cannot silently mutate the canonical person database or grant `POLITICAL_PRISONER` status.

The global high-risk database/news gates remain fail-closed for CHUDO-authored or canonical-data changes. The Telegram source-claim exception applies only to clearly attributed Telegram materials. Non-public personal data and doxxing material remain excluded from automatic republication.

Project-owner authorization to use a third-party public source is an implementation instruction; it does not by itself transfer third-party copyright/database rights. Full verbatim republication of third-party material remains subject to source-specific reuse rights.
