# Wave 41 — Sitemap sharding before real database launch

Status: `IMPLEMENTED_ON_REVIEW_BRANCH`

Wave 41 removes the assumption that all indexable CHUDO pages must fit in one monolithic `sitemap.xml`.

## Behavior

For up to 10,000 indexable URLs, the build keeps the existing simple behavior:

- `sitemap.xml` is a normal `<urlset>`.

Above 10,000 indexable URLs:

- `sitemap.xml` becomes a `<sitemapindex>`;
- URL entries are split deterministically into `sitemap-001.xml`, `sitemap-002.xml`, and so on;
- each shard contains at most 10,000 URLs;
- stale numbered sitemap shards from a previous build are removed before the new sitemap set is written;
- `robots.txt` continues to advertise only the stable entry point `https://chudzinovich.pp.ua/sitemap.xml`;
- the existing Google News sitemap remains separate as `news-sitemap.xml`.

## Final artifact validation

The Pages artifact validator understands both modes. In sharded mode it fails closed when:

- a shard reference is external or does not match `sitemap-NNN.xml`;
- a referenced shard file is missing;
- a shard is empty or is not a URL sitemap;
- a shard exceeds the configured 10,000 URL limit;
- any URL points outside `https://chudzinovich.pp.ua/`;
- a page URL is duplicated across shards;
- the sitemap index contains duplicate shard references.

All existing index-quality assertions are then evaluated against the combined set of URLs from all shards.

## Scale target

The pre-publication Wave 39 projection for the unresolved real Viasna candidate is approximately 35,888 core URLs. With Wave 41 this no longer approaches the single-file 50,000 URL ceiling: the main sitemap will be a small index and the projected core URLs will be distributed across four 10,000-URL shards.

This wave changes only sitemap generation and validation. It does not publish or promote the real Viasna database.
