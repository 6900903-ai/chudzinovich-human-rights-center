export const GOOGLE_SITEMAP_MAX_URLS=50000;
export const DEFAULT_SITEMAP_SHARD_SIZE=10000;

export function xmlEscape(value){return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');}

export function renderSitemapUrlset(entries){
  if(entries.length>GOOGLE_SITEMAP_MAX_URLS)throw new Error(`SITEMAP_SHARD_TOO_LARGE:${entries.length}:${GOOGLE_SITEMAP_MAX_URLS}`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map(entry=>`  <url><loc>${xmlEscape(entry.url)}</loc>${entry.lastmod?`<lastmod>${xmlEscape(entry.lastmod)}</lastmod>`:''}</url>`).join('\n')}\n</urlset>\n`;
}

export function renderSitemapIndex(files,{site}){
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${files.map(file=>`  <sitemap><loc>${xmlEscape(`${site}/${file.name}`)}</loc></sitemap>`).join('\n')}\n</sitemapindex>\n`;
}

export function createSitemapArtifacts(entries,{site,shardSize=DEFAULT_SITEMAP_SHARD_SIZE}={}){
  if(!site)throw new Error('SITEMAP_SITE_REQUIRED');
  if(!Number.isInteger(shardSize)||shardSize<1||shardSize>GOOGLE_SITEMAP_MAX_URLS)throw new Error(`SITEMAP_SHARD_SIZE_INVALID:${shardSize}`);
  const sorted=[...entries].sort((a,b)=>a.url.localeCompare(b.url));
  const seen=new Set();for(const entry of sorted){if(!entry?.url)throw new Error('SITEMAP_URL_REQUIRED');if(seen.has(entry.url))throw new Error(`SITEMAP_DUPLICATE_URL:${entry.url}`);seen.add(entry.url);}
  if(sorted.length<=shardSize){
    return {sharded:false,total_urls:sorted.length,shard_count:1,files:[{name:'sitemap.xml',count:sorted.length,xml:renderSitemapUrlset(sorted)}]};
  }
  const shards=[];
  for(let i=0;i<sorted.length;i+=shardSize){
    const chunk=sorted.slice(i,i+shardSize);const number=String(shards.length+1).padStart(3,'0');
    shards.push({name:`sitemap-${number}.xml`,count:chunk.length,xml:renderSitemapUrlset(chunk)});
  }
  const index={name:'sitemap.xml',count:shards.length,xml:renderSitemapIndex(shards,{site})};
  return {sharded:true,total_urls:sorted.length,shard_count:shards.length,files:[index,...shards]};
}

export function sitemapLocs(xml){return [...String(xml||'').matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);}
export function isSitemapIndex(xml){return /<sitemapindex\b/i.test(String(xml||''));}
