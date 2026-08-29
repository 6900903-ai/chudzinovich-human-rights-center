import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson } from './lib/fs.mjs';
import { verifySnapshot } from './lib/snapshot.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const dataDir=join(root,'data/public/current');
const snapshot=await verifySnapshot(dataDir);
const names=['people.json','prisons.json','news.json','reports.json'];
const datasets=Object.fromEntries(await Promise.all(names.map(async name=>[name,await readJson(join(dataDir,name))])));

const arraysEmpty=names.every(name=>Array.isArray(datasets[name])&&datasets[name].length===0);
const counts=snapshot.manifest?.counts||{};
const countsEmpty=['people','political_prisoners_current','former_political_prisoners','repressed_total'].every(key=>Number(counts[key]||0)===0);
const shellSafe=snapshot.ok&&snapshot.manifest?.publication_state==='DEVELOPMENT_EMPTY'&&arraysEmpty&&countsEmpty;
const forceFull=process.env.CHRC_PAGES_GATE_FORCE_FULL==='1';

if(shellSafe&&!forceFull){
  console.log(JSON.stringify({pages_authorized:true,mode:'PUBLIC_SHELL_ONLY',snapshot_id:snapshot.manifest?.snapshot_id||null,real_people:0,real_news:0,real_prisons:0,real_reports:0},null,2));
  process.exit(0);
}

console.log(JSON.stringify({pages_authorized:false,mode:'FULL_PRODUCTION_GATE_REQUIRED',snapshot_id:snapshot.manifest?.snapshot_id||null,snapshot_ok:snapshot.ok,publication_state:snapshot.manifest?.publication_state||null},null,2));
try{
  execFileSync(process.execPath,[join(root,'scripts/release-status.mjs'),'--enforce'],{stdio:'inherit'});
}catch(error){
  process.exit(Number.isInteger(error.status)?error.status:2);
}
