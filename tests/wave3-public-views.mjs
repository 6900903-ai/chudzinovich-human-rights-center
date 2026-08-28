import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { verifySnapshot } from '../scripts/lib/snapshot.mjs';
import { assertPublicDatasetProvenance } from '../scripts/lib/provenance.mjs';
import { profileRelativePath } from '../scripts/lib/catalog.mjs';

const root = new URL('../',import.meta.url).pathname;
const fixtureDir = join(root,'tests/fixtures/public-snapshot');
const fixtureIntegrity = await verifySnapshot(fixtureDir);
if (!fixtureIntegrity.ok) throw new Error(`Synthetic snapshot integrity failed: ${JSON.stringify(fixtureIntegrity.failures)}`);
const fixturePeople = JSON.parse(await readFile(join(fixtureDir,'people.json'),'utf8'));
assertPublicDatasetProvenance(fixturePeople);

const env = {...process.env, CHRC_TEST_MODE:'1', CHRC_PUBLIC_DATA_DIR:'tests/fixtures/public-snapshot'};
try {
  execFileSync(process.execPath,[join(root,'scripts/build.mjs')],{stdio:'inherit',env});

  const current = await readFile(join(root,'_site/prisoners/index.html'),'utf8');
  const former = await readFile(join(root,'_site/former-prisoners/index.html'),'utf8');
  const repressed = await readFile(join(root,'_site/repressed/index.html'),'utf8');

  if (!current.includes('Тестовый Человек А')) throw new Error('Current prisoners catalog missing current synthetic person');
  if (current.includes('Тестовый Человек Б') || current.includes('Тестовый Человек В')) throw new Error('Current prisoners catalog mixes statuses');
  if (!former.includes('Тестовый Человек Б')) throw new Error('Former-prisoners catalog missing former synthetic person');
  if (former.includes('Тестовый Человек А')) throw new Error('Former-prisoners catalog contains current synthetic person');
  for (const name of ['Тестовый Человек А','Тестовый Человек Б','Тестовый Человек В']) if (!repressed.includes(name)) throw new Error(`Repressed catalog missing ${name}`);

  const profileAPath = profileRelativePath(fixturePeople[0],'ru');
  const profileA = await readFile(join(root,'_site',profileAPath.replace(/^\//,'').replace(/\/$/,''),'index.html'),'utf8');
  if (!profileA.includes('ПОЛИТЗАКЛЮЧЁННЫЙ · ПО ДАННЫМ ИСТОЧНИКА')) throw new Error('Source-attributed political-prisoner label missing');
  if (!profileA.includes('Правозащитный центр «Вясна» — тестовый источник')) throw new Error('Profile source attribution missing');
  if (!profileA.includes('ИСТОРИЯ ИЗМЕНЕНИЙ')) throw new Error('Correction history missing');
  if (!profileA.includes('https://example.invalid/source/a')) throw new Error('Primary source link missing');

  const profileCPath = profileRelativePath(fixturePeople[2],'ru');
  const profileC = await readFile(join(root,'_site',profileCPath.replace(/^\//,'').replace(/\/$/,''),'index.html'),'utf8');
  if (!profileC.includes('name="robots" content="noindex,follow"')) throw new Error('Disputed profile must be noindex');

  const prisonIndex = await readFile(join(root,'_site/prisons/index.html'),'utf8');
  if (!prisonIndex.includes('СИЗО № TEST')) throw new Error('Prison catalog missing synthetic institution');
  const prisonDetail = await readFile(join(root,'_site/prisons/pr-sizo-test-sizo-test/index.html'),'utf8');
  if (!prisonDetail.includes('Тестовый Человек А')) throw new Error('Prison detail missing current resident');
  if (prisonDetail.includes('Тестовый Человек Б')) throw new Error('Prison detail includes former/non-current resident');

  const searchIndex = JSON.parse(await readFile(join(root,'_site/search-index/ru.json'),'utf8'));
  const a = searchIndex.find(record => record.id === 'p-0000001');
  if (!a || !a.categories.includes('prisoners') || !a.categories.includes('repressed')) throw new Error('Search categories missing');
  if (!a.search_text.includes('testovyi chelovek a')) throw new Error('Automatic transliteration missing from search index');
  if (!a.profile_url.startsWith('/prisoners/p-0000001-')) throw new Error('Immutable-id profile URL missing');

  const sitemap = await readFile(join(root,'_site/sitemap.xml'),'utf8');
  if (!sitemap.includes(a.profile_url)) throw new Error('Profile URL missing from sitemap');

  const js = await readFile(join(root,'_site/assets/js/main.js'),'utf8');
  if (/https?:\/\//.test(js)) throw new Error('Runtime JS contains external URL');
  if (!js.includes('/search-index/')) throw new Error('Same-origin search index integration missing');

  const buildManifest = JSON.parse(await readFile(join(root,'_site/build-manifest.json'),'utf8'));
  if (buildManifest.third_party_runtime_requests !== 0) throw new Error('Third-party runtime request policy violated');
  if (buildManifest.people_rendered !== 3) throw new Error('Synthetic Wave 3 build did not render exactly three fixture people');
  if (buildManifest.political_prisoner_autodesignation !== false) throw new Error('Autodesignation guard changed');

  console.log('WAVE3_PUBLIC_VIEWS_TEST=PASS');
} finally {
  execFileSync(process.execPath,[join(root,'scripts/build.mjs')],{stdio:'inherit',env:process.env});
  const clean = await readFile(join(root,'_site/index.html'),'utf8');
  if (clean.includes('Тестовый Человек')) throw new Error('Synthetic data remained in default build output');
}
