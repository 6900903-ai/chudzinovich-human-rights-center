import assert from 'node:assert/strict';
import {
  loadMediaRegistry,
  getAuditedEndpointSummary,
  getTechnicallyReadyMediaEndpoints,
  getLegallyReadyMediaEndpoints,
  getLiveSchedulableMediaEndpoints
} from '../scripts/lib/media-registry.mjs';
import { parseDiscoveryFeed } from '../scripts/lib/feed-parser.mjs';
import { schedulerPlan } from '../scripts/media-scheduler.mjs';

const registry = await loadMediaRegistry();
const summary = getAuditedEndpointSummary(registry);
assert.equal(registry.registry_version,'0.5.0');
assert.equal(registry.endpoint_registry_version,'0.5.0');
assert.equal(summary.active_sources,62);
assert.equal(summary.rss_verified_sources,6);
assert.equal(summary.html_listing_verified_sources,35);
assert.equal(summary.pending_sources,21);
assert.equal(summary.rss_endpoint_count,12);

const technical = getTechnicallyReadyMediaEndpoints(registry);
assert.equal(technical.length,12);
assert.equal(new Set(technical.map(({source}) => source.source_id)).size,6);
assert.ok(technical.every(({endpoint}) => endpoint.poll_interval_minutes >= 60));
assert.ok(technical.every(({endpoint}) => endpoint.parser_ready === true));
assert.ok(technical.every(({endpoint}) => ['RSS','ATOM'].includes(endpoint.kind)));

// Technical discovery readiness never overrides legal reuse state.
assert.equal(getLegallyReadyMediaEndpoints(registry).length,0);
assert.equal(getLiveSchedulableMediaEndpoints(registry,{
  MEDIA_MONITOR_NETWORK_GATE:'PASS',
  FETCHER_SECURITY_GATE:'PASS',
  MEDIA_SOURCE_REUSE_GATE:'PASS'
}).length,0);

const plan = await schedulerPlan({
  MEDIA_MONITOR_NETWORK_GATE:'PASS',
  FETCHER_SECURITY_GATE:'PASS',
  MEDIA_SOURCE_REUSE_GATE:'PASS'
});
assert.equal(plan.candidate_eligible_sources,62);
assert.equal(plan.endpoint_audit.rss_verified_sources,6);
assert.equal(plan.endpoint_audit.html_listing_verified_sources,35);
assert.equal(plan.endpoint_audit.pending_sources,21);
assert.equal(plan.technically_ready_endpoints.length,12);
assert.equal(plan.legally_ready_endpoint_count,0);
assert.equal(plan.live_schedulable_endpoints.length,0);
assert.equal(plan.live_polling_enabled,false);

const rss = `<?xml version="1.0"?>
<rss version="2.0"><channel><title>Test</title>
<item><title>Палітычны суд у Мінску</title><link>https://example.test/a</link><description><![CDATA[Суд вынес прысуд актывісту]]></description><pubDate>Fri, 28 Aug 2026 18:00:00 GMT</pubDate></item>
<item><title>Задержание после обыска</title><link>/b</link><description>Сообщается о задержании</description><pubDate>Fri, 28 Aug 2026 19:00:00 GMT</pubDate></item>
</channel></rss>`;
const rssItems = parseDiscoveryFeed(rss,'https://example.test/feed/');
assert.equal(rssItems.length,2);
assert.equal(rssItems[0].article_url,'https://example.test/a');
assert.equal(rssItems[1].article_url,'https://example.test/b');
assert.match(rssItems[0].summary,/прысуд/);
assert.equal(rssItems[0].published_at,'2026-08-28T18:00:00.000Z');

const atom = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>Test</title>
<entry><title>Обыск</title><link rel="alternate" href="https://example.test/c"/><updated>2026-08-28T20:00:00Z</updated><summary>Правозащитная новость</summary></entry>
</feed>`;
const atomItems = parseDiscoveryFeed(atom,'https://example.test/atom');
assert.equal(atomItems.length,1);
assert.equal(atomItems[0].article_url,'https://example.test/c');
assert.equal(atomItems[0].published_at,'2026-08-28T20:00:00.000Z');

assert.throws(() => parseDiscoveryFeed('<!DOCTYPE x [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><rss></rss>','https://example.test/feed'),/MEDIA_FEED_DTD_FORBIDDEN/);

// Every candidate-eligible source was explicitly audited: no silent fallback.
const enabled = registry.sources.filter(source => source.candidate_discovery_enabled === true);
assert.equal(enabled.length,62);
assert.ok(enabled.every(source => source.endpoint_audit));

console.log('WAVE5_SOURCE_ENDPOINT_TEST=PASS active=62 rss_sources=6 html_sources=35 pending=21 technical_endpoints=12 live=0');
