# CI note

The search-authority test runs a complete build because several earlier tests intentionally rebuild `_site`. The Pages workflow must still perform one fresh production build after the full test suite and validate that exact final directory before upload.
