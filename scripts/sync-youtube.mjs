import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeJson } from './lib/fs.mjs';
import { parseYoutubeAtom, YOUTUBE_FEED_URL, YOUTUBE_MAX_FEED_BYTES } from './lib/youtube.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const target=join(root,'data','public','youtube.json');
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),15_000);
try {
  const response=await fetch(YOUTUBE_FEED_URL,{
    method:'GET',
    redirect:'error',
    signal:controller.signal,
    headers:{'user-agent':'CHUDO-HRC-YouTube-Sync/1.0','accept':'application/atom+xml,application/xml,text/xml;q=0.9'}
  });
  if(!response.ok) throw new Error(`YOUTUBE_FEED_HTTP_${response.status}`);
  const type=String(response.headers.get('content-type')||'').toLowerCase();
  if(type && !/(xml|atom|text\/plain)/.test(type)) throw new Error(`YOUTUBE_FEED_CONTENT_TYPE_INVALID:${type}`);
  const text=await response.text();
  if(Buffer.byteLength(text,'utf8')>YOUTUBE_MAX_FEED_BYTES) throw new Error('YOUTUBE_FEED_TOO_LARGE');
  const snapshot=parseYoutubeAtom(text,new Date().toISOString());
  await writeJson(target,snapshot);
  console.log(`YOUTUBE_SYNC=PASS videos=${snapshot.videos.length} fetched_at=${snapshot.fetched_at}`);
} finally {
  clearTimeout(timer);
}
