import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson } from './lib/fs.mjs';
import { validateYoutubeSnapshot, YOUTUBE_CHANNEL_ID, YOUTUBE_CHANNEL_URL, YOUTUBE_FEED_URL, YOUTUBE_SOURCE_ID } from './lib/youtube.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const registry=await readJson(join(root,'source-registry','youtube-sources.json'));
if(registry?.registry_version!=='1.0.0'||!Array.isArray(registry.sources)||registry.sources.length!==1)throw new Error('YOUTUBE_REGISTRY_INVALID');
const source=registry.sources[0];
if(source.source_id!==YOUTUBE_SOURCE_ID||source.platform!=='YOUTUBE'||source.channel_id!==YOUTUBE_CHANNEL_ID)throw new Error('YOUTUBE_REGISTRY_SOURCE_INVALID');
if(source.canonical_url!==YOUTUBE_CHANNEL_URL||source.feed_url!==YOUTUBE_FEED_URL)throw new Error('YOUTUBE_REGISTRY_URL_INVALID');
if(source.publication_enabled!==true||source.auto_sync_enabled!==true||source.runtime_embed_enabled!==false)throw new Error('YOUTUBE_REGISTRY_POLICY_INVALID');
if(source.sync_interval_minutes!==60)throw new Error('YOUTUBE_SYNC_INTERVAL_INVALID');
const snapshot=await readJson(join(root,'data','public','youtube.json'));
const summary=validateYoutubeSnapshot(snapshot);
console.log(`YOUTUBE_VALIDATION=PASS channel=${source.channel_id} videos=${summary.video_count} runtime_embed=ZERO`);
