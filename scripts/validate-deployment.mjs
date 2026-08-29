import { lookup } from 'node:dns/promises';
import { assessDeployment, isPublicDeploymentIp, PRODUCTION_URL, validateDeploymentUrl } from './lib/deployment-validation.mjs';

const MAX_HTML_BYTES = 2 * 1024 * 1024;
if (process.env.CHRC_DEPLOYMENT_VALIDATION_NETWORK_GATE !== 'PASS') {
  throw new Error('DEPLOYMENT_VALIDATION_NETWORK_GATE_NOT_PASS');
}

const url = validateDeploymentUrl(process.env.CHRC_PRODUCTION_URL || PRODUCTION_URL);
const dns = await lookup(url.hostname,{all:true,verbatim:true});
if (!dns.length) throw new Error('DEPLOYMENT_DNS_EMPTY');
for (const record of dns) {
  if (!isPublicDeploymentIp(record.address)) throw new Error(`DEPLOYMENT_DNS_NON_PUBLIC:${record.address}`);
}

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(),15000);
try {
  const response = await fetch(url,{
    redirect:'manual',
    signal:controller.signal,
    headers:{'user-agent':'CHUDO-HRC-DeploymentValidator/0.8 (+https://chudzinovich.pp.ua)'}
  });
  if (response.status >= 300 && response.status < 400) throw new Error(`DEPLOYMENT_REDIRECT_FORBIDDEN:${response.status}`);
  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (contentType !== 'text/html') throw new Error(`DEPLOYMENT_CONTENT_TYPE_UNEXPECTED:${contentType || 'missing'}`);
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > MAX_HTML_BYTES) throw new Error('DEPLOYMENT_HTML_TOO_LARGE');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_HTML_BYTES) throw new Error('DEPLOYMENT_HTML_TOO_LARGE');
  const body = new TextDecoder('utf-8',{fatal:false}).decode(bytes);
  const report = assessDeployment({url:url.href,status:response.status,headers:response.headers,body,dns});
  const output = {
    checked_at:new Date().toISOString(),
    url:url.href,
    dns,
    status:response.status,
    content_type:contentType,
    ...report
  };
  console.log(JSON.stringify(output,null,2));
  if (!report.pass) process.exit(2);
} finally {
  clearTimeout(timer);
}
