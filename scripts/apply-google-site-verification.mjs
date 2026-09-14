import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeText } from './lib/fs.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=join(root,'_site');
const token=String(process.env.GOOGLE_SITE_VERIFICATION||'').trim();
const TOKEN_PATTERN=/^[A-Za-z0-9_-]{20,200}$/;
const META_PATTERN=/<meta\s+[^>]*name=["']google-site-verification["'][^>]*>/gi;
const homePaths=['index.html','be/index.html','en/index.html','pl/index.html'];

function esc(value=''){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function normalizeExisting(html){return html.replace(META_PATTERN,'').replace(/\n{3,}/g,'\n\n');}

if(token&&!TOKEN_PATTERN.test(token))throw new Error('GOOGLE_SITE_VERIFICATION_TOKEN_INVALID');
let injected=0;
for(const relativePath of homePaths){
  const path=join(out,relativePath);let html=normalizeExisting(await readFile(path,'utf8'));
  if(token){
    if(!/<head[\s>]/i.test(html)||!/<\/head>/i.test(html))throw new Error(`GOOGLE_VERIFICATION_HEAD_MISSING:${relativePath}`);
    html=html.replace('</head>',`<meta name="google-site-verification" content="${esc(token)}">\n</head>`);injected++;
  }
  await writeText(path,html);
}

// A fabricated or stale verification tag anywhere outside localized homepages is forbidden.
async function htmlFiles(dir){const files=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())files.push(...await htmlFiles(path));else if(entry.isFile()&&entry.name.endsWith('.html'))files.push(path);}return files;}
let totalTags=0;
for(const file of await htmlFiles(out)){const html=await readFile(file,'utf8');totalTags+=(html.match(META_PATTERN)||[]).length;}
if(token&&totalTags!==homePaths.length)throw new Error(`GOOGLE_VERIFICATION_TAG_COUNT_INVALID:${totalTags}`);
if(!token&&totalTags!==0)throw new Error(`GOOGLE_VERIFICATION_STALE_TAG_PRESENT:${totalTags}`);

const report={
  schema_version:'1.0.0',generated_at:new Date().toISOString(),
  state:token?'CONFIGURED_FOR_URL_PREFIX_VERIFICATION':'NOT_CONFIGURED',
  token_present:Boolean(token),token_sha256:token?createHash('sha256').update(token).digest('hex'):null,
  token_value_exposed_in_report:false,localized_homepages_with_tag:injected,total_verification_tags:totalTags,
  supported_property:'https://chudzinovich.pp.ua/',domain_property_requires_dns_txt:true,
  fabricated_token:false
};
await writeText(join(out,'search-console-readiness.json'),JSON.stringify(report,null,2)+'\n');
console.log(`GOOGLE_SITE_VERIFICATION=PASS state=${report.state} homepages=${injected} tags=${totalTags} fabricated=false`);
