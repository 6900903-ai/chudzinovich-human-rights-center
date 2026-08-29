import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTelegramRegistry } from './lib/telegram-registry.mjs';
import { validateTelegramFeedSnapshot, telegramMaterialsToNews } from './lib/telegram-feed.mjs';
import { publicNewsItems } from './lib/news.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const registry=await loadTelegramRegistry();
const snapshot=JSON.parse(await readFile(join(root,'data','public','telegram.json'),'utf8'));
const report=validateTelegramFeedSnapshot(snapshot,registry);
const news=publicNewsItems(telegramMaterialsToNews(snapshot,registry));
if(news.length!==report.material_count)throw new Error('TELEGRAM_FEED_NEWS_COUNT_MISMATCH');
console.log(`TELEGRAM_FEED_VALIDATION=PASS materials=${report.material_count} news=${news.length} channels=${registry.channels.length}`);
