# Google Search operations runbook

## Release sequence

1. Run the complete test suite.
2. Rebuild `_site` once after tests.
3. Run `scripts/validate-pages-artifact.mjs` against that exact final directory.
4. Deploy the validated artifact without any later mutation.
5. Confirm the scheduled live SEO monitor passes against the public domain.

## Indexing sequence

After the public domain and Search Console property are available:

1. Verify the exact HTTPS domain property in Google Search Console using a real owner-provided DNS token.
2. Submit `https://chudzinovich.pp.ua/sitemap-index.xml`.
3. Inspect the homepage, editorial policy, methodology, sources, reports and one original report URL.
4. Monitor indexing by page class rather than total URL count.
5. Investigate canonical, duplicate, crawled-not-indexed and soft-404 groups before requesting recrawls.

## Search-quality priorities

1. Publish the first non-empty immutable people/prison snapshot only after source and privacy review.
2. Produce original CHUDO reports that synthesize primary documents and clearly attribute evidence.
3. Keep source-only mirrors and derivative archives out of the index.
4. Record authorship, publication dates, material corrections and source provenance.
5. Earn citations through verifiable datasets and useful research rather than link schemes.

## Non-automatable owner gates

The following must never be fabricated by code:

- Google Search Console verification token;
- legal approval for third-party database reuse;
- human review of identity conflicts and high-risk claims;
- rights to third-party portraits;
- external endorsements or backlinks.
