import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
execFileSync(npm, ['run', 'build'], { cwd: root, stdio: 'inherit' });

const langs = ['ru','be','en','pl'];
const routes = [
  '/human-rights-belarus/',
  '/political-prisoners-belarus/',
  '/political-repression-belarus/',
  '/research-and-citation-guide/'
];

function outputPath(lang, routePath) {
  const prefix = lang === 'ru' ? '' : lang;
  const clean = routePath.replace(/^\//,'').replace(/\/$/,'');
  return join(root, '_site', prefix, clean, 'index.html');
}
function publicUrl(lang, routePath) {
  return `https://chudzinovich.pp.ua${lang === 'ru' ? '' : `/${lang}`}${routePath}`;
}
function hasNoIndex(html) {
  return /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html);
}

await stat(join(root,'_site','assets','brand','chudo-mark.svg'));
const manifest = JSON.parse(await readFile(join(root,'_site','site.webmanifest'),'utf8'));
assert.equal(manifest.name,'CHUDO Human Rights Center');
assert.ok(manifest.icons.some(icon => icon.src === '/assets/brand/chudo-mark.svg'));

const sitemap = await readFile(join(root,'_site','sitemap.xml'),'utf8');
for (const lang of langs) {
  const home = await readFile(outputPath(lang,'/'),'utf8');
  assert.ok(home.includes('CHUDO_TRUST_SIGNALS_V1'));
  assert.ok(home.includes('data-chudo-trust-schema'));
  assert.ok(home.includes('"@type":"NGO"'));
  assert.ok(home.includes('"@type":"WebSite"'));
  assert.ok(home.includes('/assets/brand/chudo-mark.svg'));
  assert.ok(home.includes('/site.webmanifest'));
  assert.ok(home.includes('authority-hub'));
  const title = home.match(/<title>(.*?)<\/title>/i)?.[1] || '';
  const description = home.match(/<meta name="description" content="([^"]+)"/i)?.[1] || '';
  assert.ok(title.length >= 35 && title.length <= 85, `${lang} home title length ${title.length}`);
  assert.ok(!title.includes('CHUDO HUMAN RIGHTS CENTER | CHUDO HUMAN RIGHTS CENTER'));
  assert.ok(description.length >= 110 && description.length <= 220, `${lang} home description length ${description.length}`);

  for (const routePath of routes) {
    const html = await readFile(outputPath(lang,routePath),'utf8');
    assert.ok(html.includes('data-authority-page="true"'));
    assert.ok(html.includes('data-chudo-trust-schema'));
    assert.ok(html.includes('"@type":"Article"'));
    assert.ok(html.includes('"publisher":{"@id":"https://chudzinovich.pp.ua/#organization"}'));
    assert.ok(!hasNoIndex(html), `${lang}${routePath} unexpectedly noindex`);
    assert.ok(sitemap.includes(`<loc>${publicUrl(lang,routePath)}</loc>`), `${lang}${routePath} missing from sitemap`);
    const paragraphs = (html.match(/<p[ >]/g) || []).length;
    assert.ok(paragraphs >= 9, `${lang}${routePath} too thin: ${paragraphs} paragraphs`);
  }
}

console.log(`AUTHORITY_SEO_TEST=PASS pages=${routes.length * langs.length} organization=PASS article_schema=PASS metadata=PASS sitemap=PASS identity_assets=PASS`);
