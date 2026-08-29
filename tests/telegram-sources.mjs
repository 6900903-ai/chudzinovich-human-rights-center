import assert from 'node:assert/strict';
import { loadTelegramRegistry, telegramSourceByHandle } from '../scripts/lib/telegram-registry.mjs';
import { parseTelegramPublicPreview, fetchTelegramPreview, TELEGRAM_PUBLICATION_POLICY } from '../scripts/adapters/telegram-public.mjs';
import { telegramMaterialToNewsItem, TELEGRAM_NEWS_CONVERSION_POLICY } from '../scripts/lib/telegram-news.mjs';

const registry = await loadTelegramRegistry();
assert.equal(registry.channels.length, 9);
assert.equal(registry.policy.fact_check_required,false);
assert.equal(registry.policy.editorial_review_required,false);
assert.equal(registry.policy.telegram_source_claim_autopublish,true);

for (const handle of ['Z690002','phoenixosintvirus','dw_belarus','shtabonoshko','statkevichm','oshorg','doska_pozora_lida','evanews25','narodnireporter']) {
  const source = telegramSourceByHandle(registry, handle);
  assert.ok(source, `missing ${handle}`);
  assert.equal(source.publication_enabled, true);
  assert.match(source.publication_policy,/^AUTO_PUBLISH_ATTRIBUTED/);
}

const safeHtml = `<div class="tgme_widget_message_wrap js-widget_message_wrap" data-post="dw_belarus/101">
<div class="tgme_widget_message_text js-message_text">В Беларуси прошёл публичный судебный процесс. Подробности в материале.</div>
<time datetime="2026-08-29T08:00:00+00:00"></time></div>`;
const safe = parseTelegramPublicPreview(safeHtml, telegramSourceByHandle(registry,'dw_belarus'));
assert.equal(safe.length,1);
assert.equal(safe[0].assessment.state,'PUBLIC_SOURCE_MATERIAL_ELIGIBLE');
assert.equal(safe[0].assessment.publication_allowed,true);
assert.equal(safe[0].fact_check_required,false);
assert.equal(safe[0].editorial_review_required,false);
assert.equal(safe[0].full_republication_allowed,false);
assert.equal(safe[0].source_claim_only,true);

const safeNews = telegramMaterialToNewsItem(telegramSourceByHandle(registry,'dw_belarus'),safe[0]);
assert.equal(safeNews.publication_state,'PUBLIC_SOURCE_ATTRIBUTED');
assert.equal(safeNews.source_claim_only,true);
assert.equal(safeNews.editorial_reviewed,false);
assert.equal(safeNews.source_url,'https://t.me/dw_belarus/101');

for (const [handle,post,text] of [
  ['phoenixosintvirus','202','Этот человек агент и работает на КГБ.'],
  ['evanews25','404','Сообщается, что человек является агентом и работает на КГБ.'],
  ['narodnireporter','505','Автор утверждает, что человек является доносчиком.']
]) {
  const html = `<div class="tgme_widget_message_wrap" data-post="${handle}/${post}"><div class="tgme_widget_message_text">${text}</div><time datetime="2026-08-29T08:30:00Z"></time></div>`;
  const material = parseTelegramPublicPreview(html, telegramSourceByHandle(registry,handle));
  assert.equal(material[0].assessment.state,'PUBLIC_SOURCE_MATERIAL_ELIGIBLE');
  assert.equal(material[0].assessment.publication_allowed,true);
  assert.equal(material[0].assessment.allegation,true);
  const item = telegramMaterialToNewsItem(telegramSourceByHandle(registry,handle),material[0]);
  assert.equal(item.publication_state,'PUBLIC_SOURCE_ATTRIBUTED');
  assert.equal(item.editorial_reviewed,false);
}

const highRiskHtml = `<div class="tgme_widget_message_wrap" data-post="dw_belarus/606"><div class="tgme_widget_message_text">Источник сообщает о пытках задержанного.</div><time datetime="2026-08-29T08:40:00Z"></time></div>`;
const highRisk = parseTelegramPublicPreview(highRiskHtml, telegramSourceByHandle(registry,'dw_belarus'));
assert.equal(highRisk[0].assessment.state,'PUBLIC_SOURCE_MATERIAL_ELIGIBLE');
assert.equal(highRisk[0].assessment.publication_allowed,true);
assert.ok(highRisk[0].assessment.classification.high_risk_flags.length > 0);
const highRiskNews = telegramMaterialToNewsItem(telegramSourceByHandle(registry,'dw_belarus'),highRisk[0]);
assert.ok(highRiskNews.high_risk_flags.length > 0);
assert.equal(highRiskNews.editorial_reviewed,false);

const privateDataHtml = `<div class="tgme_widget_message_wrap" data-post="doska_pozora_lida/303"><div class="tgme_widget_message_text">Номер телефона: +375 29 123 45 67. Адрес проживания указан в сообщении.</div></div>`;
const privateData = parseTelegramPublicPreview(privateDataHtml, telegramSourceByHandle(registry,'doska_pozora_lida'));
assert.equal(privateData[0].assessment.state,'BLOCK_PRIVATE_DATA');
assert.equal(privateData[0].assessment.publication_allowed,false);
assert.equal(telegramMaterialToNewsItem(telegramSourceByHandle(registry,'doska_pozora_lida'),privateData[0]),null);

const ownerSource = telegramSourceByHandle(registry,'Z690002');
const ownerHtml = `<div class="tgme_widget_message_wrap" data-post="Z690002/707"><div class="tgme_widget_message_text">Полный текст собственного канала CHUDO для теста.</div><time datetime="2026-08-29T08:50:00Z"></time></div>`;
const ownerMaterial = parseTelegramPublicPreview(ownerHtml,ownerSource)[0];
assert.equal(ownerMaterial.full_republication_allowed,true);
const ownerNews = telegramMaterialToNewsItem(ownerSource,ownerMaterial);
assert.equal(ownerNews.summary.ru,ownerMaterial.text);

assert.equal(TELEGRAM_PUBLICATION_POLICY.political_prisoner_autodesignation,false);
assert.equal(TELEGRAM_PUBLICATION_POLICY.source_claim_autopublish,true);
assert.equal(TELEGRAM_PUBLICATION_POLICY.fact_check_required,false);
assert.equal(TELEGRAM_PUBLICATION_POLICY.editorial_review_required,false);
assert.equal(TELEGRAM_PUBLICATION_POLICY.private_data_republication,false);
assert.equal(TELEGRAM_NEWS_CONVERSION_POLICY.manual_editorial_approval_required,false);
assert.equal(TELEGRAM_NEWS_CONVERSION_POLICY.fact_check_required,false);
assert.equal(TELEGRAM_NEWS_CONVERSION_POLICY.full_text_requires_source_reuse_rights,true);

await assert.rejects(
  fetchTelegramPreview(telegramSourceByHandle(registry,'dw_belarus')),
  /TELEGRAM_NETWORK_GATE_NOT_PASS/
);

console.log('TELEGRAM_SOURCE_TEST=PASS channels=9 auto_publish=PASS fact_check=OFF editorial_review=OFF private_data_block=PASS conversion=PASS');
