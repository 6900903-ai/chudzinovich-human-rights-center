import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeJson } from './lib/fs.mjs';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const out = join(root, '_site');
const SITE = 'https://chudzinovich.pp.ua';
const REQUIRED_LOCALES = ['ru', 'be', 'en', 'pl'];
const REQUIRED_PATHS = [
  'index.html', '404.html', 'sitemap.xml', 'robots.txt', 'feed.xml', 'news-sitemap.xml',
  'assets/css/main.css', 'assets/js/main.js', 'build-manifest.json',
  'news/index.html', 'sources/index.html', 'search/index.html', 'videos/index.html',
  'privacy/index.html', 'security/index.html', 'terms/index.html', 'contacts/index.html',
  'methodology/index.html', 'corrections/index.html', 'media/index.html', 'channels/index.html'
];
const MIN_TOTAL_FILES = 1200;
const MIN_HTML_FILES = 1000;
const MIN_INDEXABLE_URLS = 500;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function relPath(path) {
  return relative(out, path).split(sep).join('/');
}

function htmlUrlPath(rel) {
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function extractAttributeTags(html, tag, attribute) {
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedAttribute = attribute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<${escapedTag}\\b[^>]*\\b${escapedAttribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'gi');
  return [...html.matchAll(pattern)].map(match => match[1] ?? match[2] ?? '');
}

function localTarget(fromRel, raw) {
  const value = String(raw || '').trim();
  if (!value || value.startsWith('#') || /^(?:mailto|tel|javascript|data):/i.test(value)) return null;
  let url;
  try {
    const fromUrl = new URL(htmlUrlPath(fromRel), SITE);
    url = new URL(value, fromUrl);
  } catch {
    return { invalid: value };
  }
  if (url.origin !== SITE) return null;
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { pathname = url.pathname; }
  const clean = posix.normalize(pathname).replace(/^\/+/, '');
  if (!clean || clean === '.') return 'index.html';
  if (pathname.endsWith('/')) return `${clean.replace(/\/$/, '')}/index.html`;
  if (extname(clean)) return clean;
  return `${clean}/index.html`;
}

function sitemapLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
}

function canonicalUrl(html) {
  return html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1]
    || html.match(/<link\s+href="([^"]+)"\s+rel="canonical"/i)?.[1]
    || null;
}

function hasNoIndex(html) {
  return /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html);
}

const outInfo = await stat(out).catch(() => null);
if (!outInfo?.isDirectory()) throw new Error('PAGES_ARTIFACT_DIRECTORY_MISSING');

const files = await walk(out);
const byRel = new Map(files.map(file => [relPath(file), file]));
const failures = [];
for (const required of REQUIRED_PATHS) if (!byRel.has(required)) failures.push(`REQUIRED_PATH_MISSING:${required}`);
for (const lang of REQUIRED_LOCALES.filter(lang => lang !== 'ru')) {
  for (const section of ['index.html', 'news/index.html', 'sources/index.html', 'search/index.html', 'videos/index.html', 'privacy/index.html', 'methodology/index.html']) {
    const required = `${lang}/${section}`;
    if (!byRel.has(required)) failures.push(`LOCALE_PATH_MISSING:${required}`);
  }
}
if (files.length < MIN_TOTAL_FILES) failures.push(`ARTIFACT_FILE_COUNT_TOO_LOW:${files.length}<${MIN_TOTAL_FILES}`);

const htmlFiles = files.filter(file => file.endsWith('.html'));
if (htmlFiles.length < MIN_HTML_FILES) failures.push(`ARTIFACT_HTML_COUNT_TOO_LOW:${htmlFiles.length}<${MIN_HTML_FILES}`);

const indexable = [];
let jsonLdPages = 0;
let checkedLinks = 0;
for (const file of htmlFiles) {
  const rel = relPath(file);
  const html = await readFile(file, 'utf8');
  if (!/<html\s+lang="(?:ru|be|en|pl)"/i.test(html)) failures.push(`HTML_LANG_MISSING:${rel}`);
  if (!/<title>[^<]+<\/title>/i.test(html)) failures.push(`TITLE_MISSING:${rel}`);
  if (!/<meta\s+name="description"\s+content="[^"]+"/i.test(html)) failures.push(`DESCRIPTION_MISSING:${rel}`);
  if (!/<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(html)) failures.push(`H1_MISSING:${rel}`);
  const canonical = canonicalUrl(html);
  if (!canonical) failures.push(`CANONICAL_MISSING:${rel}`);
  else {
    const expected = `${SITE}${htmlUrlPath(rel)}`;
    if (canonical !== expected) failures.push(`CANONICAL_MISMATCH:${rel}:${canonical}:${expected}`);
  }
  if (rel !== '404.html') {
    const alternates = countMatches(html, /<link\s+rel="alternate"\s+hreflang="(?:ru|be|en|pl|x-default)"/gi);
    if (alternates < 5) failures.push(`HREFLANG_INCOMPLETE:${rel}:${alternates}`);
  }
  if (/application\/ld\+json/i.test(html)) jsonLdPages += 1;
  if (!hasNoIndex(html) && !rel.endsWith('404.html')) indexable.push(`${SITE}${htmlUrlPath(rel)}`);

  for (const raw of [...extractAttributeTags(html, 'a', 'href'), ...extractAttributeTags(html, 'link', 'href'), ...extractAttributeTags(html, 'script', 'src'), ...extractAttributeTags(html, 'img', 'src')]) {
    const target = localTarget(rel, raw);
    if (target == null) continue;
    checkedLinks += 1;
    if (typeof target === 'object' && target.invalid) failures.push(`INVALID_LOCAL_URL:${rel}:${target.invalid}`);
    else if (!byRel.has(target)) failures.push(`BROKEN_LOCAL_REFERENCE:${rel}:${raw}->${target}`);
  }
}

if (indexable.length < MIN_INDEXABLE_URLS) failures.push(`INDEXABLE_URL_COUNT_TOO_LOW:${indexable.length}<${MIN_INDEXABLE_URLS}`);
if (jsonLdPages < 10) failures.push(`JSON_LD_COVERAGE_TOO_LOW:${jsonLdPages}<10`);

const sitemap = await readFile(join(out, 'sitemap.xml'), 'utf8').catch(() => '');
const sitemapUrls = sitemapLocs(sitemap).sort();
const expectedUrls = [...new Set(indexable)].sort();
if (sitemapUrls.length !== expectedUrls.length) failures.push(`SITEMAP_COUNT_MISMATCH:${sitemapUrls.length}:${expectedUrls.length}`);
const sitemapSet = new Set(sitemapUrls);
const expectedSet = new Set(expectedUrls);
for (const url of expectedUrls) if (!sitemapSet.has(url)) failures.push(`SITEMAP_URL_MISSING:${url}`);
for (const url of sitemapUrls) if (!expectedSet.has(url)) failures.push(`SITEMAP_URL_ORPHAN:${url}`);

if (failures.length) {
  console.error(failures.slice(0, 100).join('\n'));
  if (failures.length > 100) console.error(`... ${failures.length - 100} more failures`);
  throw new Error(`PAGES_ARTIFACT_VALIDATION_FAIL:${failures.length}`);
}

const manifestFiles = [];
for (const file of files.sort((a, b) => relPath(a).localeCompare(relPath(b)))) {
  const rel = relPath(file);
  const bytes = await readFile(file);
  manifestFiles.push({ path: rel, bytes: bytes.byteLength, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const manifest = {
  schema_version: '1.0.0',
  generated_at: new Date().toISOString(),
  artifact_mode: 'GITHUB_PAGES_STATIC_SITE',
  total_files: files.length,
  html_files: htmlFiles.length,
  indexable_urls: expectedUrls.length,
  json_ld_pages: jsonLdPages,
  internal_references_checked: checkedLinks,
  sitemap_urls: sitemapUrls.length,
  files: manifestFiles
};
await writeJson(join(out, 'release-artifact.json'), manifest);
console.log(`PAGES_ARTIFACT_VALIDATION=PASS files=${files.length} html=${htmlFiles.length} indexable=${expectedUrls.length} jsonld=${jsonLdPages} links=${checkedLinks}`);
