import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const root=new URL('../',import.meta.url).pathname;
execFileSync('npm',['run','build'],{stdio:'inherit',cwd:root});
const paths={
  mainCss:join(root,'_site/assets/css/main.css'),
  shellCss:join(root,'_site/assets/css/public-shell.css'),
  mainJs:join(root,'_site/assets/js/main.js'),
  searchJs:join(root,'_site/assets/js/global-search.js'),
  home:join(root,'_site/index.html')
};
const sizes={};for(const [key,path] of Object.entries(paths))sizes[key]=(await stat(path)).size;
assert.ok(sizes.mainCss + sizes.shellCss <= 100*1024,`CSS budget exceeded: ${sizes.mainCss+sizes.shellCss}`);
assert.ok(sizes.mainJs + sizes.searchJs <= 100*1024,`JS budget exceeded: ${sizes.mainJs+sizes.searchJs}`);
assert.ok(sizes.home <= 180*1024,`Homepage HTML budget exceeded: ${sizes.home}`);
const home=await readFile(paths.home,'utf8');
assert.ok(!/<script[^>]+src=["']https?:\/\//i.test(home),'External runtime script found on homepage');
assert.ok(!/<link[^>]+href=["']https?:\/\/(?:fonts|fonts\.gstatic|cdn|unpkg|jsdelivr)/i.test(home),'External runtime stylesheet/font found');
assert.ok(!home.includes('google-analytics.com'));
assert.ok(!home.includes('googletagmanager.com'));
assert.ok(!home.includes('<iframe'));
console.log(`PERFORMANCE_BUDGET_TEST=PASS css=${sizes.mainCss+sizes.shellCss} js=${sizes.mainJs+sizes.searchJs} home=${sizes.home} external_runtime=ZERO`);
