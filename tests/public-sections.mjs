import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
for (const script of ['build.mjs','build-news.mjs','build-policy-pages.mjs','build-sources-page.mjs','build-public-sections.mjs']) {
  execFileSync(process.execPath,[join(root,'scripts',script)],{stdio:'inherit'});
}

const ruHome = await readFile(join(root,'_site/index.html'),'utf8');
const enHome = await readFile(join(root,'_site/en/index.html'),'utf8');
const ruAbout = await readFile(join(root,'_site/about/index.html'),'utf8');
const ruHelp = await readFile(join(root,'_site/help/index.html'),'utf8');
const ruMonitoring = await readFile(join(root,'_site/monitoring/index.html'),'utf8');
const ruReports = await readFile(join(root,'_site/reports/index.html'),'utf8');

assert.ok(ruHome.includes('<span class="holo-text">CHUDO</span><br>HUMAN RIGHTS CENTER'));
assert.ok(!ruHome.includes('<span class="holo-text">CHUDZINOVICH</span>'));
assert.ok(ruHome.includes('/sources/'));
assert.ok(ruHome.includes('/methodology/'));
assert.ok(ruHome.includes('Последние материалы'));
assert.ok(enHome.includes('Latest materials'));
assert.ok(enHome.includes('CHUDO HUMAN RIGHTS CENTER'));

assert.ok(ruAbout.includes('независимый информационный и документирующий проект'));
assert.ok(ruHelp.includes('Помощь начинается'));
assert.ok(ruMonitoring.includes('Новые задержания и уголовные дела'));
assert.ok(ruReports.includes('Доклады CHUDO формируются'));
for (const html of [ruAbout,ruHelp,ruMonitoring,ruReports]) {
  assert.ok(!html.includes('Публичная база ещё не опубликована.</p></div></section>'));
}

console.log('PUBLIC_SECTIONS_TEST=PASS home=PASS about=PASS help=PASS monitoring=PASS reports=PASS brand=CHUDO');
