import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { publicNewsItems } from './news.mjs';

export const TELEGRAM_FEED_SCHEMA = '1.0.0';
export const TELEGRAM_MAX_MATERIALS = 180;

function clean(value=''){return String(value||'').replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();}
function slugPart(value=''){return clean(value).toLowerCase().replace(/_/g,'-').replace(/[^a-z0-9-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');}
function titleFor(text){const value=clean(text);const first=value.split('\n').find(Boolean)||value;return first.length<=170?first:`${first.slice(0,167).trim()}…`;}
function excerptFor(text,full){const value=clean(text);const max=full?8000:520;return value.length<=max?value:`${value.slice(0,max-1).trim()}…`;}
function dateOrNull(value){if(!value)return null;const d=new Date(value);if(Number.isNaN(d.getTime()))throw new Error(`TELEGRAM_FEED_DATE_INVALID:${value}`);return d.toISOString();}

export function validateTelegramFeedSnapshot(snapshot,registry){
  if(!snapshot||snapshot.schema_version!==TELEGRAM_FEED_SCHEMA)throw new Error('TELEGRAM_FEED_SCHEMA_INVALID');
  if(snapshot.fetched_at)dateOrNull(snapshot.fetched_at);
  if(!Array.isArray(snapshot.materials)||snapshot.materials.length>TELEGRAM_MAX_MATERIALS)throw new Error('TELEGRAM_FEED_MATERIALS_INVALID');
  const sources=new Map((registry?.channels||[]).map(x=>[x.source_id,x]));
  const seen=new Set();
  for(const item of snapshot.materials){
    if(!/^tgm-[a-f0-9]{16}$/.test(item.material_id||''))throw new Error(`TELEGRAM_FEED_ID_INVALID:${item.material_id}`);
    if(seen.has(item.material_id))throw new Error(`TELEGRAM_FEED_DUPLICATE:${item.material_id}`);seen.add(item.material_id);
    const source=sources.get(item.source_id);if(!source)throw new Error(`TELEGRAM_FEED_SOURCE_UNKNOWN:${item.source_id}`);
    if(item.handle!==source.handle)throw new Error(`TELEGRAM_FEED_HANDLE_MISMATCH:${item.material_id}`);
    if(!/^\d+$/.test(String(item.post_id||'')))throw new Error(`TELEGRAM_FEED_POST_ID_INVALID:${item.material_id}`);
    if(item.post_url!==`https://t.me/${source.handle}/${item.post_id}`)throw new Error(`TELEGRAM_FEED_POST_URL_INVALID:${item.material_id}`);
    if(!clean(item.text)||clean(item.text).length>8000)throw new Error(`TELEGRAM_FEED_TEXT_INVALID:${item.material_id}`);
    if(item.published_at)dateOrNull(item.published_at);
    if(item.private_data===true||item.publication_allowed!==true)throw new Error(`TELEGRAM_FEED_BLOCKED_MATERIAL:${item.material_id}`);
    if(item.full_republication_allowed!==Boolean(source.full_republication_allowed))throw new Error(`TELEGRAM_FEED_REUSE_MISMATCH:${item.material_id}`);
  }
  return {material_count:snapshot.materials.length};
}

export function telegramMaterialsToNews(snapshot,registry){
  const sources=new Map((registry?.channels||[]).map(x=>[x.source_id,x]));
  return (snapshot?.materials||[]).map(material=>{
    const source=sources.get(material.source_id);if(!source)return null;
    const base=`tg-${slugPart(source.handle)}-${material.post_id}`;
    const text=clean(material.text);
    return {
      news_id:`news-${base}`,
      slug:base,
      title:{ru:titleFor(text)},
      summary:{ru:excerptFor(text,source.full_republication_allowed===true)},
      published_at:material.published_at||snapshot.fetched_at,
      source_kind:'TELEGRAM',
      source_id:source.source_id,
      source_name:source.display_name,
      source_url:material.post_url,
      source_published_at:material.published_at||null,
      publication_state:'PUBLIC_SOURCE_ATTRIBUTED',
      source_claim_only:true,
      editorial_reviewed:false,
      high_risk_flags:[],
      category:'Telegram',
      full_republication_allowed:source.full_republication_allowed===true
    };
  }).filter(Boolean);
}

async function optionalJson(path,fallback){try{return JSON.parse(await readFile(path,'utf8'));}catch(error){if(error.code==='ENOENT')return fallback;throw error;}}

export async function loadCombinedPublicNews(root,dataDir,registry){
  const canonical=await optionalJson(join(dataDir,'news.json'),[]);
  const telegram=await optionalJson(join(root,'data','public','telegram.json'),{schema_version:TELEGRAM_FEED_SCHEMA,fetched_at:null,materials:[]});
  validateTelegramFeedSnapshot(telegram,registry);
  return publicNewsItems([...canonical,...telegramMaterialsToNews(telegram,registry)]);
}
