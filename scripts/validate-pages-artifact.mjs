import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson } from './lib/fs.mjs';
import { resolvePublicDataDir } from './lib/public-data.mjs';
import { loadTelegramRegistry } from './lib/telegram-registry.mjs';
import { loadMediaRegistry } from './lib/media-registry.mjs';
import { loadCombinedPublicNewsWithMedia } from './lib/media-feed.mjs';
import { newsRelativePath } from './lib/news.mjs';
import { validateYoutubeSnapshot } from './lib/youtube.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = join(root, '_site');
const dataDir = resolvePublicDataDir(root);
const SITE = 'https://chudzinovich.pp.ua';
const langs = ['ru', 'be', 'en', 'pl'];

async function exists(path) {
  try { return (await stat(path)).isFile(); }
  catch (error) { if (error?.code === 'ENOENT') return false; throw error; }
}
async function requireFile(path, label) {
  if (!(await exists(path))) throw new Error(`PAGES_ARTIFACT_REQUIRED_FILE_MISSING:${label}:${relative(out, path)}`);
}
function outputPath(lang, routePath) {
  const prefix = lang === 'ru' ? '' : lang;
  const clean = String(routePath || '/').replace(/^\//, '').replace(/\/$/, '');
  return clean ? join(out, prefix, clean, 'index.html') : join(out, prefix, 'index.html');
}
async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(path);
  }
  return files;
}
function hasNoIndex(html) { return /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html); }
function absolute(lang, routePath) { const prefix=lang==='ru'?'':`/${lang}`; return `${SITE}${prefix}${routePath}`; }

const manifest = await readJson(join(dataDir, 'manifest.json'));
const telegramRegistry = await loadTelegramRegistry();
const mediaRegistry = await loadMediaRegistry();
const news = await loadCombinedPublicNewsWithMedia(root, dataDir, telegramRegistry, mediaRegistry);
const youtube = await readJson(join(root, 'data', 'public', 'youtube.json'));
validateYoutubeSnapshot(youtube);

const channels = telegramRegistry.channels.filter(source => source.publication_enabled === true);
const mediaSources = mediaRegistry.sources || [];
const videos = youtube.videos || [];

await requireFile(join(out, 'index.html'), 'home');
await requireFile(join(out, '404.html'), '404');
await requireFile(join(out, 'robots.txt'), 'robots');
await requireFile(join(out, 'sitemap.xml'), 'sitemap');
await requireFile(join(out, 'news-sitemap.xml'), 'news-sitemap');
await requireFile(join(out, 'feed.xml'), 'rss');
await requireFile(join(out, 'build-manifest.json'), 'build-manifest');

const requiredRoutes = ['/news/', '/channels/', '/media/', '/videos/', '/sources/', '/search/', '/help/', '/transparency/', '/editorial-policy/'];
for (const lang of langs) {
  await requireFile(outputPath(lang, '/'), `${lang}:home`);
  for (const routePath of requiredRoutes) await requireFile(outputPath(lang, routePath), `${lang}:${routePath}`);
}

if (news.length > 0) {
  const sample = news[0];
  for (const lang of langs) await requireFile(outputPath(lang, newsRelativePath(sample)), `${lang}:news-sample`);
}
if (channels.length > 0) {
  const sample = channels[0];
  for (const lang of langs) await requireFile(outputPath(lang, `/channels/${sample.handle.toLowerCase()}/`), `${lang}:channel-sample`);
}
if (mediaSources.length > 0) {
  const sample = mediaSources[0];
  const slug = sample.source_id.replace(/^src-/, '');
  for (const lang of langs) await requireFile(outputPath(lang, `/media/${slug}/`), `${lang}:media-sample`);
}
if (videos.length > 0) {
  const sample = videos[0];
  for (const lang of langs) await requireFile(outputPath(lang, `/videos/${sample.video_id}/`), `${lang}:video-sample`);
}

const html = await htmlFiles(out);
const minimumHtml = 28 + langs.length * (news.length + channels.length + mediaSources.length + videos.length);
if (html.length < minimumHtml) throw new Error(`PAGES_ARTIFACT_TRUNCATED:html=${html.length}:minimum=${minimumHtml}:news=${news.length}:channels=${channels.length}:media=${mediaSources.length}:videos=${videos.length}`);

const sitemap = await readFile(join(out, 'sitemap.xml'), 'utf8');
for (const requiredUrl of [`${SITE}/`, `${SITE}/news/`, `${SITE}/channels/`, `${SITE}/media/`, `${SITE}/videos/`, `${SITE}/sources/`, `${SITE}/transparency/`, `${SITE}/editorial-policy/`]) {
  if (!sitemap.includes(`<loc>${requiredUrl}</loc>`)) throw new Error(`PAGES_ARTIFACT_SITEMAP_ROUTE_MISSING:${requiredUrl}`);
}
const robots = await readFile(join(out, 'robots.txt'), 'utf8');
if (!robots.includes(`Sitemap: ${SITE}/sitemap.xml`)) throw new Error('PAGES_ARTIFACT_ROBOTS_MAIN_SITEMAP_MISSING');
if (!robots.includes(`Sitemap: ${SITE}/news-sitemap.xml`)) throw new Error('PAGES_ARTIFACT_ROBOTS_NEWS_SITEMAP_MISSING');

for (const lang of langs) {
  for (const routePath of ['/transparency/','/editorial-policy/']) {
    const page=await readFile(outputPath(lang,routePath),'utf8');
    if(hasNoIndex(page))throw new Error(`TRUST_PAGE_NOT_INDEXABLE:${lang}:${routePath}`);
  }
}

const sourceOnly = news.find(item => item.source_claim_only === true);
if (sourceOnly) {
  const newsSitemap = await readFile(join(out, 'news-sitemap.xml'), 'utf8');
  const sourceUrl = `${SITE}${newsRelativePath(sourceOnly)}`;
  if (newsSitemap.includes(`<loc>${sourceUrl}</loc>`)) throw new Error(`SOURCE_ONLY_ITEM_LEAKED_TO_GOOGLE_NEWS_SITEMAP:${sourceOnly.news_id}`);
  for (const lang of langs) {
    const page = await readFile(outputPath(lang, newsRelativePath(sourceOnly)), 'utf8');
    if (!hasNoIndex(page)) throw new Error(`SOURCE_ONLY_ITEM_INDEXABLE:${lang}:${sourceOnly.news_id}`);
  }
}

if (channels.length) {
  const handle=channels[0].handle.toLowerCase();
  for (const lang of langs) {
    const routePath=`/channels/${handle}/`;
    const page=await readFile(outputPath(lang,routePath),'utf8');
    if(!hasNoIndex(page))throw new Error(`DERIVATIVE_CHANNEL_PAGE_INDEXABLE:${lang}:${handle}`);
    if(sitemap.includes(`<loc>${absolute(lang,routePath)}</loc>`))throw new Error(`DERIVATIVE_CHANNEL_PAGE_IN_SITEMAP:${lang}:${handle}`);
  }
}
if (mediaSources.length) {
  const slug=mediaSources[0].source_id.replace(/^src-/,'');
  for (const lang of langs) {
    const routePath=`/media/${slug}/`;
    const page=await readFile(outputPath(lang,routePath),'utf8');
    if(!hasNoIndex(page))throw new Error(`DERIVATIVE_MEDIA_PAGE_INDEXABLE:${lang}:${slug}`);
    if(sitemap.includes(`<loc>${absolute(lang,routePath)}</loc>`))throw new Error(`DERIVATIVE_MEDIA_PAGE_IN_SITEMAP:${lang}:${slug}`);
  }
}
for (const lang of langs) {
  for (const routePath of ['/news/archive/','/news/kind/telegram/','/news/kind/media/']) {
    const page=await readFile(outputPath(lang,routePath),'utf8');
    if(!hasNoIndex(page))throw new Error(`DERIVATIVE_NEWS_INDEX_INDEXABLE:${lang}:${routePath}`);
    if(sitemap.includes(`<loc>${absolute(lang,routePath)}</loc>`))throw new Error(`DERIVATIVE_NEWS_INDEX_IN_SITEMAP:${lang}:${routePath}`);
  }
}

if (manifest.publication_state !== 'PUBLISHED') {
  for (const lang of langs) {
    for (const routePath of ['/prisoners/', '/former-prisoners/', '/repressed/', '/prisons/', '/case-index/', '/judges/', '/prosecutors/', '/criminal-code/']) {
      const page = await readFile(outputPath(lang, routePath), 'utf8');
      if (!hasNoIndex(page)) throw new Error(`EMPTY_CANONICAL_DATABASE_PAGE_INDEXABLE:${lang}:${routePath}`);
    }
  }
}

console.log(`PAGES_ARTIFACT_CONTRACT=PASS html=${html.length} minimum=${minimumHtml} news=${news.length} channels=${channels.length} media=${mediaSources.length} videos=${videos.length} trust=PASS index_quality=PASS publication_state=${manifest.publication_state}`);
