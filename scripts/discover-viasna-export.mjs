const url = 'https://prisoners.spring96.org/ru/list';
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(),15000);
try {
  const response = await fetch(url,{redirect:'follow',signal:controller.signal,headers:{
    'user-agent':'CHUDO-HRC-Endpoint-Discovery/0.1 (+https://chudzinovich.pp.ua)',
    accept:'text/html,application/xhtml+xml'
  }});
  console.log(`VIASNA_DISCOVERY_HTTP_STATUS=${response.status}`);
  console.log(`VIASNA_DISCOVERY_CONTENT_TYPE=${response.headers.get('content-type') || ''}`);
  if (!response.ok) process.exit(2);
  const text = await response.text();
  const hrefs = [...text.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map(m=>m[1]);
  const candidates = [...new Set(hrefs.filter(href => /(csv|export|download)/i.test(href)))];
  console.log(`VIASNA_EXPORT_CANDIDATES=${candidates.length}`);
  for (const candidate of candidates) console.log(`VIASNA_EXPORT_CANDIDATE=${candidate}`);
  if (!candidates.length) {
    const snippets = [...text.matchAll(/.{0,120}csv.{0,160}/gi)].slice(0,10).map(m=>m[0].replace(/\s+/g,' '));
    console.log(`VIASNA_CSV_TEXT_SNIPPETS=${snippets.length}`);
    for (const snippet of snippets) console.log(`VIASNA_CSV_SNIPPET=${snippet}`);
  }
} finally { clearTimeout(timer); }
