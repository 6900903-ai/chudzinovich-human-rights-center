export const YOUTUBE_SOURCE_ID = 'youtube-chudzinovich-yura';
export const YOUTUBE_CHANNEL_ID = 'UCTXAwovvaec4w9ztbggWMEQ';
export const YOUTUBE_CHANNEL_URL = `https://www.youtube.com/channel/${YOUTUBE_CHANNEL_ID}`;
export const YOUTUBE_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;
export const YOUTUBE_MAX_FEED_BYTES = 2_000_000;
export const YOUTUBE_MAX_VIDEOS = 30;

function decodeXml(value = '') {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

function tag(block, name) {
  const match = String(block).match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return match ? decodeXml(match[1]).trim() : '';
}

function normalizeFeedChannelId(value) {
  const raw = String(value || '').trim();
  if (raw === YOUTUBE_CHANNEL_ID) return raw;
  if (/^[A-Za-z0-9_-]{22}$/.test(raw) && `UC${raw}` === YOUTUBE_CHANNEL_ID) return `UC${raw}`;
  return raw;
}

function safeDate(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) throw new Error(`YOUTUBE_INVALID_DATE:${text}`);
  return date.toISOString();
}

export function validateYoutubeSnapshot(snapshot) {
  if (!snapshot || snapshot.schema_version !== '1.0.0') throw new Error('YOUTUBE_SCHEMA_INVALID');
  if (snapshot.source_id !== YOUTUBE_SOURCE_ID) throw new Error('YOUTUBE_SOURCE_ID_INVALID');
  if (snapshot.channel_id !== YOUTUBE_CHANNEL_ID) throw new Error('YOUTUBE_CHANNEL_ID_INVALID');
  if (snapshot.channel_url !== YOUTUBE_CHANNEL_URL) throw new Error('YOUTUBE_CHANNEL_URL_INVALID');
  if (snapshot.feed_url !== YOUTUBE_FEED_URL) throw new Error('YOUTUBE_FEED_URL_INVALID');
  if (!Array.isArray(snapshot.videos) || snapshot.videos.length > YOUTUBE_MAX_VIDEOS) throw new Error('YOUTUBE_VIDEO_LIST_INVALID');
  const seen = new Set();
  for (const video of snapshot.videos) {
    const id = String(video?.video_id || '');
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error(`YOUTUBE_VIDEO_ID_INVALID:${id}`);
    if (seen.has(id)) throw new Error(`YOUTUBE_DUPLICATE_VIDEO:${id}`);
    seen.add(id);
    if (!String(video.title || '').trim() || String(video.title).length > 500) throw new Error(`YOUTUBE_TITLE_INVALID:${id}`);
    if (video.url !== `https://www.youtube.com/watch?v=${id}`) throw new Error(`YOUTUBE_VIDEO_URL_INVALID:${id}`);
    if (video.published_at) safeDate(video.published_at);
    if (video.updated_at) safeDate(video.updated_at);
  }
  return { video_count:snapshot.videos.length, fetched_at:snapshot.fetched_at || null };
}

export function parseYoutubeAtom(xml, fetchedAt = new Date().toISOString()) {
  const text = String(xml || '');
  if (!text || Buffer.byteLength(text, 'utf8') > YOUTUBE_MAX_FEED_BYTES) throw new Error('YOUTUBE_FEED_SIZE_INVALID');
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('YOUTUBE_FEED_DTD_FORBIDDEN');
  const rawChannelId = tag(text, 'yt:channelId');
  const channelId = normalizeFeedChannelId(rawChannelId);
  if (channelId !== YOUTUBE_CHANNEL_ID) throw new Error(`YOUTUBE_FEED_CHANNEL_MISMATCH:${rawChannelId}`);
  const channelTitle = tag(text, 'title') || 'ТОЧКА НЕВОЗВРАТА Чудинович Юра';
  const entries = [...text.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)].slice(0, YOUTUBE_MAX_VIDEOS);
  const videos = [];
  const seen = new Set();
  for (const [, block] of entries) {
    const videoId = tag(block, 'yt:videoId');
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId) || seen.has(videoId)) continue;
    const title = tag(block, 'title');
    if (!title) continue;
    seen.add(videoId);
    videos.push({
      video_id:videoId,
      title:title.slice(0,500),
      published_at:safeDate(tag(block, 'published')),
      updated_at:safeDate(tag(block, 'updated')),
      url:`https://www.youtube.com/watch?v=${videoId}`
    });
  }
  const snapshot = {
    schema_version:'1.0.0',
    source_id:YOUTUBE_SOURCE_ID,
    channel_id:YOUTUBE_CHANNEL_ID,
    channel_title:channelTitle,
    channel_url:YOUTUBE_CHANNEL_URL,
    feed_url:YOUTUBE_FEED_URL,
    fetched_at:safeDate(fetchedAt),
    videos
  };
  validateYoutubeSnapshot(snapshot);
  return snapshot;
}
