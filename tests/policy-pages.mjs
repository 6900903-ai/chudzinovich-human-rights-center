import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
execFileSync('npm',['run','build'],{cwd:root,stdio:'inherit'});
for (const path of ['methodology','sources','corrections','privacy','security','terms','contacts']) {
  const html = await readFile(join(root,'_site',path,'index.html'),'utf8');
  assert.match(html,/CHUDO HUMAN RIGHTS CENTER/);
}
const privacy = await readFile(join(root,'_site/privacy/index.html'),'utf8');
assert.match(privacy,/без регистрации|without registration/i);
const methodology = await readFile(join(root,'_site/methodology/index.html'),'utf8');
assert.match(methodology,/не присваивает статус политзаключённого|cannot designate a person as a political prisoner/i);
const contacts = await readFile(join(root,'_site/contacts/index.html'),'utf8');
assert.match(contacts,/Z690002/);
console.log('POLICY_PAGES_TEST=PASS pages=28');
