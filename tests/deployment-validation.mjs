import assert from 'node:assert/strict';
import { assessDeployment, assessSecurityHeaders, isPublicDeploymentIp, validateDeploymentUrl } from '../scripts/lib/deployment-validation.mjs';

const headers = new Headers({
  'strict-transport-security':'max-age=31536000; includeSubDomains',
  'x-frame-options':'DENY',
  'x-content-type-options':'nosniff',
  'referrer-policy':'no-referrer',
  'permissions-policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'content-security-policy':"default-src 'self'; script-src 'self'; connect-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
});

assert.equal(validateDeploymentUrl('https://chudzinovich.pp.ua/').href,'https://chudzinovich.pp.ua/');
assert.throws(()=>validateDeploymentUrl('http://chudzinovich.pp.ua/'),/DEPLOYMENT_HTTPS_REQUIRED/);
assert.throws(()=>validateDeploymentUrl('https://example.com/'),/DEPLOYMENT_HOST_MISMATCH/);
assert.equal(isPublicDeploymentIp('8.8.8.8'),true);
assert.equal(isPublicDeploymentIp('127.0.0.1'),false);
assert.equal(isPublicDeploymentIp('10.0.0.1'),false);
assert.equal(isPublicDeploymentIp('::1'),false);
assert.equal(assessSecurityHeaders(headers).pass,true);

const good = assessDeployment({
  url:'https://chudzinovich.pp.ua/',
  status:200,
  headers,
  body:'<!doctype html><title>CHUDO HUMAN RIGHTS CENTER</title><h1>CHUDO HUMAN RIGHTS CENTER</h1>',
  dns:[{address:'203.0.113.10'}]
});
// Documentation ranges are not valid production destinations, so use a real public-shaped address.
assert.equal(good.pass,false);
assert.ok(good.failures.includes('DNS_NON_PUBLIC_ADDRESS'));

const pass = assessDeployment({
  url:'https://chudzinovich.pp.ua/',
  status:200,
  headers,
  body:'<!doctype html><title>CHUDO HUMAN RIGHTS CENTER</title><h1>CHUDO HUMAN RIGHTS CENTER</h1>',
  dns:[{address:'8.8.8.8'}]
});
assert.equal(pass.pass,true,JSON.stringify(pass.failures));

const weakHeaders = new Headers({'content-security-policy':"default-src 'self'"});
const bad = assessDeployment({
  url:'https://chudzinovich.pp.ua/',
  status:200,
  headers:weakHeaders,
  body:'CHUDZINOVICH HUMAN RIGHTS CENTER',
  dns:[{address:'10.0.0.5'}]
});
assert.equal(bad.pass,false);
assert.ok(bad.failures.includes('EXPECTED_CHUDO_BRAND_MISSING'));
assert.ok(bad.failures.includes('LEGACY_PUBLIC_BRAND_PRESENT'));
assert.ok(bad.failures.includes('DNS_NON_PUBLIC_ADDRESS'));
assert.ok(bad.security.failures.length > 0);

console.log('DEPLOYMENT_VALIDATION_TEST=PASS fail_closed=true');
