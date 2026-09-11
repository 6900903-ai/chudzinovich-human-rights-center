import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root=new URL('../',import.meta.url).pathname;
const out=join(root,'_site');
const npm=process.platform==='win32'?'npm.cmd':'npm';
async function text(path){return readFile(join(out,path),'utf8');}
function tags(html){return html.match(/<meta\s+[^>]*name=["']google-site-verification["'][^>]*>/gi)||[];}

execFileSync(npm,['run','build'],{cwd:root,env:{...process.env,GOOGLE_SITE_VERIFICATION:''},stdio:'inherit'});
for(const path of ['index.html','be/index.html','en/index.html','pl/index.html'])assert.equal(tags(await text(path)).length,0,`Unexpected tag ${path}`);
let report=JSON.parse(await text('search-console-readiness.json'));assert.equal(report.state,'NOT_CONFIGURED');assert.equal(report.token_present,false);assert.equal(report.fabricated_token,false);assert.equal(report.total_verification_tags,0);

const token='google-verification_TEST_20260829_ABCDEF1234567890';
execFileSync(npm,['run','build'],{cwd:root,env:{...process.env,GOOGLE_SITE_VERIFICATION:token},stdio:'inherit'});
for(const path of ['index.html','be/index.html','en/index.html','pl/index.html']){
  const html=await text(path);assert.equal(tags(html).length,1,`Tag count ${path}`);assert.ok(html.includes(`content="${token}"`),`Token mismatch ${path}`);
}
report=JSON.parse(await text('search-console-readiness.json'));assert.equal(report.state,'CONFIGURED_FOR_URL_PREFIX_VERIFICATION');assert.equal(report.token_present,true);assert.equal(report.token_value_exposed_in_report,false);assert.equal(report.localized_homepages_with_tag,4);assert.equal(report.total_verification_tags,4);assert.ok(/^[a-f0-9]{64}$/.test(report.token_sha256));assert.ok(!JSON.stringify(report).includes(token));

const invalid=spawnSync(process.execPath,[join(root,'scripts','apply-google-site-verification.mjs')],{cwd:root,env:{...process.env,GOOGLE_SITE_VERIFICATION:'not valid token!'},encoding:'utf8'});assert.notEqual(invalid.status,0);assert.match(invalid.stderr,/GOOGLE_SITE_VERIFICATION_TOKEN_INVALID/);

execFileSync(npm,['run','build'],{cwd:root,env:{...process.env,GOOGLE_SITE_VERIFICATION:''},stdio:'inherit'});
for(const path of ['index.html','be/index.html','en/index.html','pl/index.html'])assert.equal(tags(await text(path)).length,0,`Stale tag ${path}`);
console.log('GOOGLE_SITE_VERIFICATION_TEST=PASS absent=PASS real_token=PASS four_locales=PASS invalid_blocked=PASS stale_removed=PASS fabricated=ZERO');
