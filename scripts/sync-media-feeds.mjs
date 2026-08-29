import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeJson } from './lib/fs.mjs';
import { loadMediaRegistry, getTechnicallyReadyMediaEndpoints } from './lib/media-registry.mjs';
import { assertPublicDns, validateSourceUrl } from './adapters/media-generic.mjs';
import { parseDiscoveryFeed } from './lib/feed-parser.mjs';
import { MEDIA_FEED_SCHEMA, MEDIA_FEED_MAX_MATERIALS, mediaMaterialId, validateMediaFeedSnapshot } from './lib/media-feed.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const target=join(root,'data','public','media-feed.json');
const MAX_RESPONSE_BYTES=4*1024*1024;
const MAX_PER_SOURCE=30;
const ALLOWED_TYPES=new Set(['application/rss+xml','application/atom+xml','application/xml','text/xml','text/plain']);

if(process.env.MEDIA_MONITOR_NETWORK_GATE!=='PASS')throw new Error('MEDIA_MONITOR_NETWORK_GATE_NOT_PASS');
if(process.env.FETCHER_SECURITY_GATE!=='PASS')throw new Error('FETCHER_SECURITY_GATE_NOT_PASS');
if(process.env.MEDIA_PUBLIC_RSS_METADATA_GATE!=='PASS')throw new Error('MEDIA_PUBLIC_RSS_METADATA_GATE_NOT_PASS');

async function optionalJson(path,fallback){try{return await readJson(path);}catch(error){if(error.code==='ENOENT')return fallback;throw error;}}
async function fetchFeed(source,endpoint){
  const url=validateSourceUrl(source,endpoint.url);
  await assertPublicDns(url.hostname);
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
  try{
    const response=await fetch(url,{redirect:'manual',signal:controller.signal,headers:{'user-agent':'CHUDO-HRC-PublicRSSMetadata/0.27 (+https://chudzinovich.pp.ua)'}});
    if(response.status>=300&&response.status<400)throw new Error(`MEDIA_RSS_REDIRECT_BLOCKED:${response.status}`);
    if(!response.ok)throw new Error(`MEDIA_RSS_HTTP_STATUS:${response.status}`);
    const type=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
    if(type&&!ALLOWED_TYPES.has(type))throw new Error(`MEDIA_RSS_CONTENT_TYPE_BLOCKED:${type}`);
    const declared=Number(response.headers.get('content-length')||0);if(declared>MAX_RESPONSE_BYTES)throw new Error('MEDIA_RSS_RESPONSE_TOO_LARGE');
    let size=0;const chunks=[];for await(const chunk of response.body){size+=chunk.byteLength;if(size>MAX_RESPONSE_BYTES)throw new Error('MEDIA_RSS_RESPONSE_TOO_LARGE');chunks.push(chunk);}
    return Buffer.concat(chunks).toString('utf8');
  }finally{clearTimeout(timer);}
}

const registry=await loadMediaRegistry();
const ready=getTechnicallyReadyMediaEndpoints(registry).filter(({endpoint})=>endpoint.verification_state==='VERIFIED_FIRST_PARTY_RSS');
const previous=await optionalJson(target,{schema_version:MEDIA_FEED_SCHEMA,fetched_at:null,materials:[]});
validateMediaFeedSnapshot(previous,registry);
const previousBySource=new Map();for(const item of previous.materials||[]){if(!previousBySource.has(item.source_id))previousBySource.set(item.source_id,[]);previousBySource.get(item.source_id).push(item);}
const bySource=new Map();for(const pair of ready){if(!bySource.has(pair.source.source_id))bySource.set(pair.source.source_id,{source:pair.source,endpoints:[]});bySource.get(pair.source.source_id).endpoints.push(pair.endpoint);}
const fetchedAt=new Date().toISOString();
const materials=[];let successfulSources=0,failedSources=0;
for(const {source,endpoints} of bySource.values()){
  const fresh=[];let endpointSuccess=0;
  for(const endpoint of endpoints){
    try{
      const xml=await fetchFeed(source,endpoint);const items=parseDiscoveryFeed(xml,endpoint.url);endpointSuccess++;
      for(const item of items){
        const article=validateSourceUrl(source,item.article_url).toString();
        fresh.push({material_id:mediaMaterialId(source.source_id,article),source_id:source.source_id,source_name:source.name,source_url:article,title:String(item.title||'').replace(/\s+/g,' ').trim().slice(0,500),published_at:item.published_at||null,feed_scope:endpoint.scope||'general',endpoint_url:endpoint.url,metadata_only:true});
      }
    }catch(error){console.warn(`MEDIA_RSS_ENDPOINT_SYNC=FAIL source=${source.source_id} endpoint=${endpoint.endpoint_id} reason=${error.message}`);}
  }
  let selected;
  if(endpointSuccess>0){successfulSources++;const unique=new Map();for(const item of fresh){if(item.title&&!unique.has(item.material_id))unique.set(item.material_id,item);}selected=[...unique.values()].sort((a,b)=>String(b.published_at||'').localeCompare(String(a.published_at||''))).slice(0,MAX_PER_SOURCE);}
  else{failedSources++;selected=(previousBySource.get(source.source_id)||[]).slice(0,MAX_PER_SOURCE);}
  materials.push(...selected);
  console.log(`MEDIA_RSS_SOURCE_SYNC=${endpointSuccess>0?'PASS':'FALLBACK'} source=${source.source_id} materials=${selected.length} endpoints_ok=${endpointSuccess}/${endpoints.length}`);
}
const snapshot={schema_version:MEDIA_FEED_SCHEMA,fetched_at:fetchedAt,materials:materials.sort((a,b)=>String(b.published_at||'').localeCompare(String(a.published_at||''))).slice(0,MEDIA_FEED_MAX_MATERIALS)};
validateMediaFeedSnapshot(snapshot,registry);await writeJson(target,snapshot);
console.log(`MEDIA_RSS_SYNC=PASS materials=${snapshot.materials.length} successful_sources=${successfulSources} failed_sources=${failedSources}`);
