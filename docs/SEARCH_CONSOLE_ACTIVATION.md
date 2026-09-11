# Google Search Console activation

CHUDO supports two legitimate Google Search Console verification paths.

## Preferred: Domain property

A Domain property covers all protocols and subdomains and requires a genuine DNS TXT record supplied by Google. Repository code cannot invent or apply that token at the DNS provider. Add the exact Google TXT value in the authoritative DNS account, wait for propagation and press **Verify** in Search Console.

## Supported by the site: URL-prefix property

For the exact property `https://chudzinovich.pp.ua/`, copy the token value from Google's HTML-tag verification method and create the GitHub repository variable:

```text
GOOGLE_SITE_VERIFICATION=<exact token value only>
```

Do not include the surrounding `<meta>` tag. The accepted value contains only letters, digits, `_` and `-`, from 20 to 200 characters.

Then manually run the workflow:

```text
CHUDO Activate Search Console Verification
```

The workflow:

1. refuses an absent or malformed token;
2. builds the site with the repository variable;
3. validates the exact production artifact;
4. dispatches the guarded Pages workflow;
5. waits for deployment;
6. verifies the exact tag on the live HTTPS homepage;
7. records only the token SHA-256 in the workflow summary.

After it passes, press **Verify** for the URL-prefix property in Google Search Console and submit:

```text
https://chudzinovich.pp.ua/sitemap-index.xml
```

## Safety properties

- no token is guessed or copied from another domain;
- an empty variable produces no verification tag;
- an invalid token fails the build;
- a removed variable removes stale tags on the next deployment;
- the machine-readable report contains a digest, not the token value;
- changing the repository variable alone does not silently deploy the site.
