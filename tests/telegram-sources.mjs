import assert from 'node:assert/strict';
import { loadTelegramRegistry, telegramSourceByHandle } from '../scripts/lib/telegram-registry.mjs';
import { parseTelegramPublicPreview, fetchTelegramPreview, TELEGRAM_PUBLICATION_POLICY } from '../scripts/adapters/telegram-public.mjs';

const registry = await loadTelegramRegistry();
assert.equal(registry.channels.length, 7);
for (const handle of ['Z690002','phoenixosintvirus','dw_belarus','shtabonoshko','statkevichm','oshorg','doska_pozora_lida']) {
  const source = telegramSourceByHandle(registry, handle);
  assert.ok(source, `missing ${handle}`);
  assert.equal(source.publication_enabled, true);
}

const safeHtml = `<div class="tgme_widget_message_wrap js-widget_message_wrap" data-post="dw_belarus/101">
<div class="tgme_widget_message_text js-message_text">В Беларуси прошёл публичный судебный процесс. Подробности в материале.</div>
<time datetime="2026-08-29T08:00:00+00:00"></time></div>`;
const safe = parseTelegramPublicPreview(safeHtml, telegramSourceByHandle(registry,'dw_belarus'));
assert.equal(safe.length,1);
assert.equal(safe[0].assessment.state,'PUBLIC_SUMMARY_ELIGIBLE');
assert.equal(safe[0].full_republication_allowed,false);
assert.equal(safe[0].source_claim_only,true);

const allegationHtml = `<div class="tgme_widget_message_wrap" data-post="phoenixosintvirus/202">
<div class="tgme_widget_message_text">Этот человек агент и работает на КГБ.</div><time datetime="2026-08-29T08:10:00Z"></time></div>`;
const allegation = parseTelegramPublicPreview(allegationHtml, telegramSourceByHandle(registry,'phoenixosintvirus'));
assert.equal(allegation[0].assessment.state,'PRIVATE_REVIEW_REQUIRED');
assert.equal(allegation[0].assessment.publication_allowed,false);

const privateDataHtml = `<div class="tgme_widget_message_wrap" data-post="doska_pozora_lida/303">
<div class="tgme_widget_message_text">Номер телефона: +375 29 123 45 67. Адрес проживания указан в сообщении.</div></div>`;
const privateData = parseTelegramPublicPreview(privateDataHtml, telegramSourceByHandle(registry,'doska_pozora_lida'));
assert.equal(privateData[0].assessment.state,'BLOCK_PRIVATE_DATA');
assert.equal(privateData[0].assessment.publication_allowed,false);

assert.equal(TELEGRAM_PUBLICATION_POLICY.political_prisoner_autodesignation,false);
assert.equal(TELEGRAM_PUBLICATION_POLICY.high_risk_autopublish,false);
assert.equal(TELEGRAM_PUBLICATION_POLICY.private_data_republication,false);

await assert.rejects(
  fetchTelegramPreview(telegramSourceByHandle(registry,'dw_belarus')),
  /TELEGRAM_NETWORK_GATE_NOT_PASS/
);

console.log('TELEGRAM_SOURCE_TEST=PASS channels=7 safe_summary=1 allegation_review=PASS private_data_block=PASS');
