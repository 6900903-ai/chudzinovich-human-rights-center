import assert from 'node:assert/strict';
import { publicNewsItems } from '../scripts/lib/news.mjs';

const safeTelegram = {
  news_id:'news-test-telegram-safe', slug:'test-telegram-safe',
  title:{ru:'Тестовый материал'}, summary:{ru:'Краткий собственный пересказ CHUDO.'},
  published_at:'2026-08-29T09:00:00Z', source_kind:'TELEGRAM', source_id:'tg-dw-belarus',
  source_name:'DW Беларусь', source_url:'https://t.me/dw_belarus/1', source_published_at:'2026-08-29T08:50:00Z',
  publication_state:'PUBLIC_SOURCE_ATTRIBUTED', source_claim_only:true, editorial_reviewed:false, high_risk_flags:[], category:'Права человека'
};
assert.equal(publicNewsItems([safeTelegram]).length,1);

const highRisk = {...safeTelegram, news_id:'news-test-high-risk', slug:'test-high-risk', high_risk_flags:['TORTURE']};
assert.throws(() => publicNewsItems([highRisk]),/HIGH_RISK_NEWS_NOT_REVIEWED/);
assert.equal(publicNewsItems([{...highRisk,editorial_reviewed:true}]).length,1);

const invalidTelegram = {...safeTelegram, news_id:'news-test-unattributed', slug:'test-unattributed', source_claim_only:false};
assert.throws(() => publicNewsItems([invalidTelegram]),/TELEGRAM_NEWS_MUST_BE_SOURCE_CLAIM/);

console.log('NEWS_PUBLICATION_TEST=PASS attributed_summary=PASS high_risk_gate=PASS');
