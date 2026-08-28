const ALLOWED_HOSTS = new Set(['prisoners.spring96.org', 'spring96.org']);
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;

export function validateViasnaUrl(input) {
  const url = new URL(input);
  if (url.protocol !== 'https:') throw new Error('HTTPS_ONLY');
  if (!ALLOWED_HOSTS.has(url.hostname)) throw new Error('SOURCE_DOMAIN_NOT_ALLOWED');
  if (url.username || url.password) throw new Error('URL_CREDENTIALS_FORBIDDEN');
  return url;
}

export async function fetchViasnaText(input, { timeoutMs = 15000 } = {}) {
  if (process.env.VIASNA_DATA_REUSE_GATE !== 'PASS') {
    throw new Error('VIASNA_DATA_REUSE_GATE_NOT_PASS');
  }
  const url = validateViasnaUrl(input);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'accept': 'text/csv,application/json,text/html;q=0.7',
        'user-agent': 'CHUDZINOVICH-HRC-Research-Sync/0.1'
      }
    });
    if (!response.ok) throw new Error(`SOURCE_HTTP_${response.status}`);
    if (response.status >= 300 && response.status < 400) throw new Error('REDIRECT_REQUIRES_REVALIDATION');
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > MAX_RESPONSE_BYTES) throw new Error('SOURCE_RESPONSE_TOO_LARGE');
    const buf = new Uint8Array(await response.arrayBuffer());
    if (buf.byteLength > MAX_RESPONSE_BYTES) throw new Error('SOURCE_RESPONSE_TOO_LARGE');
    return new TextDecoder('utf-8', { fatal: false }).decode(buf);
  } finally {
    clearTimeout(timer);
  }
}

export function classifyStatusClaim(text) {
  const normalized = text.toLocaleLowerCase('ru');
  if (/политзаключ|палітвяз/.test(normalized)) {
    return {
      claim: 'POLITICAL_PRISONER',
      attribution_required: true,
      auto_designation_allowed: false
    };
  }
  return { claim: null, attribution_required: false, auto_designation_allowed: false };
}
