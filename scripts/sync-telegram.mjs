import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTelegramRegistry } from './lib/telegram-registry.mjs';
import { fetchTelegramPreview, parseTelegramPublicPreview } from './adapters/telegram-public.mjs';
import { TELEGRAM_FEED_SCHEMA, validateTelegramFeedSnapshot } from './lib/telegram-feed.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const outPath=join(root,'data','public','telegram.json');
const registry=await loadTelegramRegistry();
let previous={schema_version:TELEGRAM_FEED_SCHEMA,fetched_at:null,materials:[]};
try{previous=JSON.parse(await readFile(outPath,'utf8'));validateTelegramFeedSnapshot(previous,registry);}catch(error){if(error.code!=='ENOENT')throw error;}

function clean(value=''){return String(value||'').replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();}
function safeMaterial(source,item){
  if(item.assessment?.publication_allowed!==true||item.assessment?.private_data===true)return null;
  const full=source.full_republication_allowed===true;
  const raw=clean(item.text);const max=full?8000:520;const text=raw.length<=max?raw:`${raw.slice(0,max-1).trim()}…`;
  if(!text)return null;
  return {
    material_id:item.material_id,source_id:source.source_id,handle:source.handle,post_id:String(item.post_id),post_url:item.post_url,
    text,published_at:item.published_at||null,publication_allowed:true,private_data:false,
    full_republication_allowed:full,source_claim_only:true
  };
}
function time(item){const n=Date.parse(item.published_at||0);return Number.isNaN(n)?0:n;}

const previousBySource=new Map();
for(const item of previous.materials||[]){const list=previousBySource.get(item.source_id)||[];list.push(item);previousBySource.set(item.source_id,list);}
let successful=0;const failures=[];const combined=[];
for(const source of registry.channels.filter(x=>x.publication_enabled===true)){
  let current=[];
  try{
    const html=await fetchTelegramPreview(source);
    current=parseTelegramPublicPreview(html,source).map(x=>safeMaterial(source,x)).filter(Boolean);
    successful++;
    console.log(`TELEGRAM_SOURCE_SYNC=PASS handle=@${source.handle} materials=${current.length}`);
  }catch(error){
    failures.push({handle:source.handle,error:String(error?.message||error)});
    console.warn(`TELEGRAM_SOURCE_SYNC=STALE_FALLBACK handle=@${source.handle} error=${String(error?.message||error)}`);
  }
  const merged=new Map();
  for(const item of [...current,...(previousBySource.get(source.source_id)||[])])if(!merged.has(item.material_id))merged.set(item.material_id,item);
  combined.push(...[...merged.values()].sort((a,b)=>time(b)-time(a)).slice(0,20));
}
if(successful===0)throw new Error(`TELEGRAM_SYNC_ALL_SOURCES_FAILED:${JSON.stringify(failures)}`);
combined.sort((a,b)=>time(b)-time(a)||a.material_id.localeCompare(b.material_id));
const same=JSON.stringify(combined)===JSON.stringify(previous.materials||[]);
if(same){console.log(`TELEGRAM_SYNC=NO_CHANGE materials=${combined.length} successful_sources=${successful} failed_sources=${failures.length}`);process.exit(0);}
const snapshot={schema_version:TELEGRAM_FEED_SCHEMA,fetched_at:new Date().toISOString(),materials:combined};
validateTelegramFeedSnapshot(snapshot,registry);
await writeFile(outPath,JSON.stringify(snapshot,null,2)+'\n');
console.log(`TELEGRAM_SYNC=PASS materials=${combined.length} successful_sources=${successful} failed_sources=${failures.length}`);
