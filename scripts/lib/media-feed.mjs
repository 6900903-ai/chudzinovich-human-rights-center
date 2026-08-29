import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { publicNewsItems } from './news.mjs';
import { normalizeHost, sourceById } from './media-registry.mjs';

export const MEDIA_FEED_SCHEMA='1.0.0';
export const MEDIA_FEED_MAX_MATERIALS=180;
export const MEDIA_FEED_MAX_TITLE=500;

function clean(value=''){return String(value||'').replace(/\s+/g,' ').trim();}
function dateOrNull(value){if(!value)return null;const d=new Date(value);if(Number.isNaN(d.getTime()))throw new Error(`MEDIA_FEED_DATE_INVALID:${value}`);return d.toISOString();}
function slugPart(value=''){return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');}
function sourceUrlAllowed(source,input){const url=new URL(input);if(url.protocol!=='https:')return false;const host=normalizeHost(url.hostname);return (source.canonical_domains||[]).some(domain=>{const d=normalizeHost(domain);return host===d||host.endsWith(`.${d}`);});}

export function mediaMaterialId(sourceId,articleUrl){return 'mfm-'+createHash('sha256').update(`${sourceId}|${articleUrl}`).digest('hex').slice(0,16);}

export function validateMediaFeedSnapshot(snapshot,registry){
  if(!snapshot||snapshot.schema_version!==MEDIA_FEED_SCHEMA)throw new Error('MEDIA_FEED_SCHEMA_INVALID');
  if(snapshot.fetched_at)dateOrNull(snapshot.fetched_at);
  if(!Array.isArray(snapshot.materials)||snapshot.materials.length>MEDIA_FEED_MAX_MATERIALS)throw new Error('MEDIA_FEED_MATERIALS_INVALID');
  const seen=new Set();
  for(const item of snapshot.materials){
    if(!/^mfm-[a-f0-9]{16}$/.test(item.material_id||''))throw new Error(`MEDIA_FEED_ID_INVALID:${item.material_id}`);
    if(seen.has(item.material_id))throw new Error(`MEDIA_FEED_DUPLICATE:${item.material_id}`);seen.add(item.material_id);
    const source=sourceById(registry,item.source_id);if(!source)throw new Error(`MEDIA_FEED_SOURCE_UNKNOWN:${item.source_id}`);
    if(item.source_name!==source.name)throw new Error(`MEDIA_FEED_SOURCE_NAME_MISMATCH:${item.material_id}`);
    if(!sourceUrlAllowed(source,item.source_url))throw new Error(`MEDIA_FEED_SOURCE_URL_INVALID:${item.material_id}`);
    if(!clean(item.title)||clean(item.title).length>MEDIA_FEED_MAX_TITLE)throw new Error(`MEDIA_FEED_TITLE_INVALID:${item.material_id}`);
    if(item.published_at)dateOrNull(item.published_at);
    if(item.metadata_only!==true)throw new Error(`MEDIA_FEED_METADATA_ONLY_REQUIRED:${item.material_id}`);
    if('body' in item||'article_text' in item||'summary' in item)throw new Error(`MEDIA_FEED_FULLTEXT_FORBIDDEN:${item.material_id}`);
  }
  return {material_count:snapshot.materials.length};
}

export function mediaMaterialsToNews(snapshot,registry){
  return (snapshot?.materials||[]).map(material=>{
    const source=sourceById(registry,material.source_id);if(!source)return null;
    const suffix=material.material_id.slice(4);
    const base=`media-${slugPart(source.source_id.replace(/^src-/,''))}-${suffix}`;
    return {
      news_id:`news-${base}`,
      slug:base,
      title:{ru:clean(material.title)},
      summary:{ru:`Заголовок из публичной RSS-ленты ${source.name}. Полный материал доступен по ссылке на первоисточник.`},
      published_at:material.published_at||snapshot.fetched_at,
      source_kind:'MEDIA',
      source_id:source.source_id,
      source_name:source.name,
      source_url:material.source_url,
      source_published_at:material.published_at||null,
      publication_state:'PUBLIC_SOURCE_ATTRIBUTED',
      source_claim_only:true,
      editorial_reviewed:false,
      high_risk_flags:[],
      category:'СМИ',
      metadata_only:true
    };
  }).filter(Boolean);
}

async function optionalJson(path,fallback){try{return JSON.parse(await readFile(path,'utf8'));}catch(error){if(error.code==='ENOENT')return fallback;throw error;}}

export async function loadMediaFeed(root,registry){
  const snapshot=await optionalJson(join(root,'data','public','media-feed.json'),{schema_version:MEDIA_FEED_SCHEMA,fetched_at:null,materials:[]});
  validateMediaFeedSnapshot(snapshot,registry);
  return snapshot;
}

export async function loadCombinedPublicNewsWithMedia(root,dataDir,telegramRegistry,mediaRegistry,telegramFeedApi){
  const canonical=await optionalJson(join(dataDir,'news.json'),[]);
  const telegram=await telegramFeedApi.loadTelegramFeed(root,telegramRegistry);
  const media=await loadMediaFeed(root,mediaRegistry);
  return publicNewsItems([...canonical,...telegramFeedApi.telegramMaterialsToNews(telegram,telegramRegistry),...mediaMaterialsToNews(media,mediaRegistry)]);
}
