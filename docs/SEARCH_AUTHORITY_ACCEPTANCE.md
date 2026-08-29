# Search authority acceptance

Wave 35 is accepted only when:

- the complete existing test suite passes;
- the exact final production build passes `validate-pages-artifact.mjs`;
- all four localized homepages expose Organization and WebSite identity;
- all four editorial-policy pages exist and are indexable;
- high-value page metadata meets the regression checks;
- favicon, 512×512 icon and 1200×630 preview PNG exist in the final artifact;
- the sitemap index and robots declarations are valid;
- source-only and derivative noindex rules remain enforced;
- the Pages deployment succeeds from the same validated commit.
