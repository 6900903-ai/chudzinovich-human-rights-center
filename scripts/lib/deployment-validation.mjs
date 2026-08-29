import { isIP } from 'node:net';

export const PRODUCTION_URL = 'https://chudzinovich.pp.ua/';
export const PRODUCTION_HOST = 'chudzinovich.pp.ua';
export const EXPECTED_BRAND = 'CHUDO HUMAN RIGHTS CENTER';

export function validateDeploymentUrl(input = PRODUCTION_URL) {
  const url = new URL(input);
  if (url.protocol !== 'https:') throw new Error('DEPLOYMENT_HTTPS_REQUIRED');
  if (url.hostname !== PRODUCTION_HOST) throw new Error('DEPLOYMENT_HOST_MISMATCH');
  if (url.username || url.password) throw new Error('DEPLOYMENT_URL_CREDENTIALS_FORBIDDEN');
  if (url.port && url.port !== '443') throw new Error('DEPLOYMENT_NON_STANDARD_PORT_FORBIDDEN');
  if (url.pathname !== '/' || url.search || url.hash) throw new Error('DEPLOYMENT_ROOT_URL_REQUIRED');
  return url;
}

function publicIpv4(ip) {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a,b] = p;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  return true;
}

function publicIpv6(ip) {
  const v = ip.toLowerCase();
  if (v === '::' || v === '::1') return false;
  if (v.startsWith('fc') || v.startsWith('fd')) return false;
  if (/^fe[89ab]/.test(v)) return false;
  if (v.startsWith('ff')) return false;
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? publicIpv4(mapped[1]) : true;
}

export function isPublicDeploymentIp(ip) {
  const family = isIP(ip);
  return family === 4 ? publicIpv4(ip) : family === 6 ? publicIpv6(ip) : false;
}

function headerValue(headers,name) {
  if (headers?.get) return String(headers.get(name) || '');
  const key = Object.keys(headers || {}).find(k => k.toLowerCase() === name.toLowerCase());
  return key ? String(headers[key] || '') : '';
}

function cspHas(csp,directive) {
  return csp.split(';').map(v => v.trim().replace(/\s+/g,' ')).includes(directive);
}

export function assessSecurityHeaders(headers) {
  const failures = [];
  const hsts = headerValue(headers,'strict-transport-security').toLowerCase();
  const maxAge = Number(hsts.match(/max-age=(\d+)/)?.[1] || 0);
  if (maxAge < 31536000) failures.push('HSTS_MAX_AGE_TOO_LOW');
  if (headerValue(headers,'x-frame-options').toUpperCase() !== 'DENY') failures.push('X_FRAME_OPTIONS_NOT_DENY');
  if (headerValue(headers,'x-content-type-options').toLowerCase() !== 'nosniff') failures.push('X_CONTENT_TYPE_OPTIONS_NOT_NOSNIFF');
  if (headerValue(headers,'referrer-policy').toLowerCase() !== 'no-referrer') failures.push('REFERRER_POLICY_NOT_NO_REFERRER');

  const permissions = headerValue(headers,'permissions-policy').toLowerCase().replace(/\s+/g,'');
  for (const token of ['camera=()','microphone=()','geolocation=()','payment=()']) {
    if (!permissions.includes(token)) failures.push(`PERMISSIONS_POLICY_MISSING_${token.replace(/[^a-z]/g,'_').toUpperCase()}`);
  }

  const csp = headerValue(headers,'content-security-policy').replace(/\s+/g,' ').trim();
  for (const directive of ["default-src 'self'","script-src 'self'","connect-src 'self'","object-src 'none'","frame-src 'none'","frame-ancestors 'none'"]) {
    if (!cspHas(csp,directive)) failures.push(`CSP_MISSING_${directive.split(' ')[0].replace('-','_').toUpperCase()}`);
  }
  return { pass: failures.length === 0, failures };
}

export function assessDeployment({ url = PRODUCTION_URL, status, headers, body = '', dns = [] }) {
  const failures = [];
  try { validateDeploymentUrl(url); } catch (error) { failures.push(error.message); }
  if (status !== 200) failures.push(`HTTP_STATUS_${status ?? 'MISSING'}`);
  if (!String(body).includes(EXPECTED_BRAND)) failures.push('EXPECTED_CHUDO_BRAND_MISSING');
  if (String(body).includes('CHUDZINOVICH HUMAN RIGHTS CENTER')) failures.push('LEGACY_PUBLIC_BRAND_PRESENT');
  if (!Array.isArray(dns) || dns.length === 0) failures.push('DNS_RECORDS_EMPTY');
  else if (dns.some(record => !isPublicDeploymentIp(record.address || record))) failures.push('DNS_NON_PUBLIC_ADDRESS');

  const security = assessSecurityHeaders(headers);
  failures.push(...security.failures);
  return { pass: failures.length === 0, failures, security };
}
