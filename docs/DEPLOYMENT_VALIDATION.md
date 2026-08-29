# Production deployment validation

The public production target is exactly `https://chudzinovich.pp.ua/`.

This validator is an operator-side release check. It is not visitor runtime code and it does not deploy the site or change release gates automatically.

## Network gate

Live validation is disabled unless explicitly enabled:

```bash
CHRC_DEPLOYMENT_VALIDATION_NETWORK_GATE=PASS npm run deployment:validate
```

The validator then checks:

- exact HTTPS production hostname and root URL;
- public DNS destinations only (no loopback, private, link-local, documentation or other special-use addresses);
- no HTTP redirect hiding a different deployment target;
- HTTP 200 and `text/html` response;
- bounded response size;
- presence of the `CHUDO HUMAN RIGHTS CENTER` public brand;
- absence of the legacy `CHUDZINOVICH HUMAN RIGHTS CENTER` brand string;
- HSTS with at least one year max-age;
- `X-Frame-Options: DENY`;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: no-referrer`;
- restrictive `Permissions-Policy`;
- required CSP directives including same-origin script/connect and blocked objects/frames/frame ancestors.

A successful validator run is evidence for live DNS/header review only. `HOSTING_SECURITY_HEADERS_GATE` and `DNS_DOMAIN_GATE` must remain non-PASS until the exact production deployment has been checked, and production still requires every other release gate plus the exact real-data snapshot.

## Current live evidence

The first live production check ran from a GitHub-hosted Ubuntu runner at `2026-08-29T10:28:57Z`. All repository validation, build and regression tests passed before the live check. DNS resolution then failed with `ENOTFOUND chudzinovich.pp.ua`, so HTTP and security headers could not be reached.

Canonical evidence: `release/evidence/deployment-live-20260829T102857Z.json`.
