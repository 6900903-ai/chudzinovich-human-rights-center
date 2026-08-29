import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadMediaRegistry } from '../scripts/lib/media-registry.mjs';
import { loadTelegramRegistry } from '../scripts/lib/telegram-registry.mjs';
import { loadCombinedPublicNewsWithMedia } from '../scripts/lib/media-feed.mjs';
import { resolvePublicDataDir } from '../scripts/lib/public-data.mjs';

const root=new URL('../',import.meta.url).pathname;
const dataDir=resolvePublicDataDir(root);
for(const script of ['build.mjs','build-news.mjs','build-news-indexes.mjs','build-policy-pages.mjs','build-sources-page.mjs','build-public-sections.mjs','build-channel-pages.mjs','build-media-pages.mjs','build-youtube-pages.mjs','build-global-search.mjs','build-topical-authority.mjs','build-help-center.mjs','build-trust-center.mjs','enhance-public-shell.mjs','enhance-seo.mjs','finalize-site.mjs'])execFileSync(process.execPath,[join(root,'scripts',script)],{stdio:'inherit'});

const media=await loadMediaRegistry();
const telegram=await loadTelegramRegistry();
const news=await loadCombinedPublicNewsWithMedia(root,dataDir,telegram,media);
const channels=telegram.channels.filter(x=>x.publication_enabled===true);
const activeMedia=media.sources.filter(x=>x.candidate_discovery_enabled===true);

const ru=await readFile(join(root,'_site/transparency/index.html'),'utf8');
const editorial=await readFile(join(root,'_site/editorial-policy/index.html'),'utf8');
const en=await readFile(join(root,'_site/en/transparency/index.html'),'utf8');
const be=await readFile(join(root,'_site/be/editorial-policy/index.html'),'utf8');
const pl=await readFile(join(root,'_site/pl/transparency/index.html'),'utf8');
const home=await readFile(join(root,'_site/index.html'),'utf8');
const sitemap=await readFile(join(root,'_site/sitemap.xml'),'utf8');

assert.ok(ru.includes('Прозрачность данных'));
assert.ok(ru.includes(`>${media.sources.length}<`));
assert.ok(ru.includes(`>${activeMedia.length}<`));
assert.ok(ru.includes(`>${channels.length}<`));
assert.ok(ru.includes(`>${news.length}<`));
assert.ok(ru.includes('Каноническая база людей ещё не опубликована'));
assert.ok(editorial.includes('Редакционная политика'));
assert.ok(editorial.includes('Источник не равен факту'));
assert.ok(en.includes('Data transparency'));
assert.ok(be.includes('Рэдакцыйная палітыка'));
assert.ok(pl.includes('Przejrzystość danych'));
assert.ok(home.includes('href="/transparency/"'));
assert.ok(home.includes('href="/editorial-policy/"'));
assert.equal((home.match(/CHUDO_PUBLIC_NAV_V11/g)||[]).length,1);
assert.ok(!ru.includes('name="robots" content="noindex'));
assert.ok(sitemap.includes('<loc>https://chudzinovich.pp.ua/transparency/</loc>'));
assert.ok(sitemap.includes('<loc>https://chudzinovich.pp.ua/editorial-policy/</loc>'));
console.log(`TRUST_CENTER_TEST=PASS media=${media.sources.length} active_media=${activeMedia.length} telegram=${channels.length} news=${news.length} locales=4 sitemap=PASS`);
