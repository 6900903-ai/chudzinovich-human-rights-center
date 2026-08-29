import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadTelegramRegistry, telegramSourceByHandle } from '../scripts/lib/telegram-registry.mjs';
import { parseTelegramPublicPreview } from '../scripts/adapters/telegram-public.mjs';
import { validateTelegramFeedSnapshot, telegramMaterialsToNews } from '../scripts/lib/telegram-feed.mjs';
import { publicNewsItems } from '../scripts/lib/news.mjs';

const root=new URL('../',import.meta.url).pathname;
const registry=await loadTelegramRegistry();
const source=telegramSourceByHandle(registry,'Z690002');
const fixture=`<div class="tgme_widget_message_wrap"><div class="tgme_widget_message" data-post="Z690002/123"><div class="tgme_widget_message_text">Тестовый пост CHUDO<br>Вторая строка</div><time datetime="2026-08-29T12:00:00+00:00"></time></div></div>`;
const parsed=parseTelegramPublicPreview(fixture,source);
assert.equal(parsed.length,1);assert.equal(parsed[0].post_id,'123');assert.equal(parsed[0].assessment.publication_allowed,true);
const privateFixture=fixture.replace('Тестовый пост CHUDO','Телефон: +375 29 123 45 67');
assert.equal(parseTelegramPublicPreview(privateFixture,source)[0].assessment.publication_allowed,false);
const stored=JSON.parse(await readFile(join(root,'data/public/telegram.json'),'utf8'));
const report=validateTelegramFeedSnapshot(stored,registry);
const news=publicNewsItems(telegramMaterialsToNews(stored,registry));
assert.equal(news.length,report.material_count);
for(const item of news){assert.equal(item.source_kind,'TELEGRAM');assert.equal(item.source_claim_only,true);assert.equal(item.publication_state,'PUBLIC_SOURCE_ATTRIBUTED');}
console.log(`TELEGRAM_LIVE_FEED_TEST=PASS materials=${report.material_count} parser=PASS private_data_block=PASS news_conversion=PASS`);
