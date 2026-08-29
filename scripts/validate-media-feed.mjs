import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson } from './lib/fs.mjs';
import { loadMediaRegistry } from './lib/media-registry.mjs';
import { mediaMaterialsToNews, validateMediaFeedSnapshot } from './lib/media-feed.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const registry=await loadMediaRegistry();
const snapshot=await readJson(join(root,'data','public','media-feed.json'));
const report=validateMediaFeedSnapshot(snapshot,registry);
const news=mediaMaterialsToNews(snapshot,registry);
if(news.length!==report.material_count)throw new Error('MEDIA_FEED_NEWS_COUNT_MISMATCH');
console.log(`MEDIA_FEED_VALIDATION=PASS materials=${report.material_count} news=${news.length} metadata_only=true`);
