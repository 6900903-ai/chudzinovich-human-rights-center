import assert from 'node:assert/strict';
import { publicNewsItems } from '../scripts/lib/news.mjs';

const telegram = {
  news_id:'news-test-telegram-safe', slug:'test-telegram-safe',
  title:{ru:'Материал Telegram'}, summary:{ru:'Материал опубликован как сообщение источника.'},
  published_at:'2026-08-29T09:00:00Z', source_kind:'TELEGRAM', source_id:'tg-dw-belarus',
  source_name:'DW Беларусь', source_url:'https://t.me/dw_belarus/1', source_published_at:'2026-08-29T08:50:00Z',
  publication_state:'PUBLIC_SOURCE_ATTRIBUTED', source_claim_only:true, editorial_reviewed:false, high_risk_flags:[], category:'Источник'
};
assert.equal(publicNewsItems([telegram]).length,1);

const highRiskTelegram = {...telegram, news_id:'news-test-telegram-high-risk', slug:'test-telegram-high-risk', high_risk_flags:['TORTURE']};
assert.equal(publicNewsItems([highRiskTelegram]).length,1);

const highRiskMedia = {
  ...telegram,
  news_id:'news-test-media-high-risk', slug:'test-media-high-risk',
  source_kind:'MEDIA', source_id:'src-test', source_name:'Test media', source_url:'https://example.test/article',
  source_claim_only:false, high_risk_flags:['TORTURE']
};
assert.throws(() => publicNewsItems([highRiskMedia]),/HIGH_RISK_NEWS_NOT_REVIEWED/);
assert.equal(publicNewsItems([{...highRiskMedia,editorial_reviewed:true}]).length,1);

const invalidTelegram = {...telegram, news_id:'news-test-unattributed', slug:'test-unattributed', source_claim_only:false};
assert.throws(() => publicNewsItems([invalidTelegram]),/TELEGRAM_NEWS_MUST_BE_SOURCE_CLAIM/);

console.log('NEWS_PUBLICATION_TEST=PASS telegram_auto_publish=PASS attributed_source_claim=PASS non_telegram_high_risk_gate=PASS');
