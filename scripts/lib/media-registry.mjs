import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REGISTRY = resolve(moduleDir, '../../source-registry/media-sources/index.json');
const LEGAL_REUSE_OK = new Set(['PERMITTED','LEGAL_REVIEWED']);

function expandRows(parsed, rows) {
  const defaults = parsed.defaults || {};
  return rows.map(row => {
    const raw = Object.fromEntries(parsed.columns.map((name,index) => [name,row[index]]));
    const domains = raw.canonical_domains || [];
    return {
      ...defaults,
      ...raw,
      homepage_url: domains.length ? `https://${domains[0]}/` : null
    };
  });
}

function endpointAllowedForSource(source, input) {
  const endpoint = new URL(input);
  if (endpoint.protocol !== 'https:') return false;
  const endpointHost = normalizeHost(endpoint.hostname);
  return (source.canonical_domains || []).some(domain => {
    const d = normalizeHost(domain);
    return endpointHost === d || endpointHost.endsWith(`.${d}`);
  });
}

function expandEndpointAudit(audit) {
  const bySource = new Map();
  const ensure = sourceId => {
    if (!bySource.has(sourceId)) bySource.set(sourceId, { source_id:sourceId, audit_state:'PENDING', endpoints:[], notes:null });
    return bySource.get(sourceId);
  };

  for (const entry of audit?.verified_rss || []) {
    const target = ensure(entry.source_id);
    target.audit_state = 'VERIFIED_RSS';
    target.evidence_url = entry.evidence_url || null;
    target.endpoints.push(...(entry.feeds || []).map((feed,index) => ({
      endpoint_id:`${entry.source_id}-rss-${String(index+1).padStart(2,'0')}`,
      url:feed.url,
      kind:'RSS',
      scope:feed.scope || 'general',
      verification_state:'VERIFIED_FIRST_PARTY_RSS',
      parser_ready:true,
      poll_interval_minutes:entry.poll_interval_minutes
    })));
  }

  for (const row of audit?.verified_html_listings || []) {
    const [sourceId,url,pollIntervalMinutes] = row;
    const target = ensure(sourceId);
    target.audit_state = 'VERIFIED_HTML_LISTING';
    target.endpoints.push({
      endpoint_id:`${sourceId}-html-01`,
      url,
      kind:'HTML_LISTING',
      scope:'general',
      verification_state:'VERIFIED_PUBLIC_HTML',
      parser_ready:false,
      poll_interval_minutes:pollIntervalMinutes
    });
  }

  for (const row of audit?.pending || []) {
    const [sourceId,state,notes] = row;
    const target = ensure(sourceId);
    if (target.endpoints.length) throw new Error(`MEDIA_ENDPOINT_AUDIT_CONFLICT:${sourceId}`);
    target.audit_state = state;
    target.notes = notes || null;
  }
  return bySource;
}

export async function loadMediaRegistry(path = DEFAULT_REGISTRY) {
  const parsed = JSON.parse(await readFile(path, 'utf8'));
  let sources = parsed.sources;
  if (!sources && Array.isArray(parsed.rows)) sources = expandRows(parsed, parsed.rows);
  if (!sources && Array.isArray(parsed.parts)) {
    const dir = dirname(path);
    const rows = [];
    for (const part of parsed.parts) {
      const partRows = JSON.parse(await readFile(resolve(dir, part), 'utf8'));
      if (!Array.isArray(partRows)) throw new Error(`MEDIA_REGISTRY_PART_INVALID:${part}`);
      rows.push(...partRows);
    }
    sources = expandRows(parsed, rows);
  }

  let endpointRegistry = null;
  let auditBySource = new Map();
  if (parsed.endpoint_registry) {
    endpointRegistry = JSON.parse(await readFile(resolve(dirname(path), parsed.endpoint_registry), 'utf8'));
    auditBySource = expandEndpointAudit(endpointRegistry);
    sources = sources.map(source => ({
      ...source,
      endpoint_audit:auditBySource.get(source.source_id) || null
    }));
  }

  const registry = {
    registry_version:parsed.registry_version,
    updated_at:parsed.updated_at,
    coverage:parsed.coverage,
    policy:parsed.policy,
    endpoint_registry_version:endpointRegistry?.endpoint_registry_version || null,
    endpoint_audited_at:endpointRegistry?.audited_at || null,
    endpoint_policy:endpointRegistry?.policy || null,
    sources
  };
  validateMediaRegistry(registry);
  return registry;
}

export function validateMediaRegistry(registry) {
  if (!registry || registry.coverage !== 'BROAD_DISCOVERY_NOT_EXHAUSTIVE_CENSUS') {
    throw new Error('MEDIA_REGISTRY_COVERAGE_POLICY_MISSING');
  }
  if (!Array.isArray(registry.sources) || registry.sources.length < 1) throw new Error('MEDIA_REGISTRY_EMPTY');
  const ids = new Set();
  const domains = new Map();
  const enabledIds = new Set();
  const auditedEnabledIds = new Set();
  const minPoll = registry.endpoint_policy?.minimum_poll_interval_minutes ?? 60;

  for (const source of registry.sources) {
    if (!/^src-[a-z0-9-]+$/.test(source.source_id || '')) throw new Error(`INVALID_SOURCE_ID:${source.source_id}`);
    if (ids.has(source.source_id)) throw new Error(`DUPLICATE_SOURCE_ID:${source.source_id}`);
    ids.add(source.source_id);
    if (source.runtime_allowed !== false) throw new Error(`RUNTIME_SOURCE_FORBIDDEN:${source.source_id}`);
    if (source.claim_semantics !== 'SOURCE_CLAIM_ONLY') throw new Error(`CLAIM_SEMANTICS_INVALID:${source.source_id}`);
    if (source.candidate_discovery_enabled) {
      enabledIds.add(source.source_id);
      if (source.monitoring_state !== 'ACTIVE_VERIFIED') throw new Error(`ENABLED_SOURCE_NOT_ACTIVE:${source.source_id}`);
      if (!source.canonical_domains?.length) throw new Error(`ENABLED_SOURCE_WITHOUT_DOMAIN:${source.source_id}`);
      if (registry.endpoint_registry_version && !source.endpoint_audit) throw new Error(`ENABLED_SOURCE_NOT_ENDPOINT_AUDITED:${source.source_id}`);
      if (source.endpoint_audit) auditedEnabledIds.add(source.source_id);
    }

    for (const endpoint of source.endpoint_audit?.endpoints || []) {
      if (!endpointAllowedForSource(source, endpoint.url)) throw new Error(`VERIFIED_ENDPOINT_OUTSIDE_SOURCE:${source.source_id}:${endpoint.url}`);
      if (!Number.isInteger(endpoint.poll_interval_minutes) || endpoint.poll_interval_minutes < minPoll) throw new Error(`MEDIA_POLL_INTERVAL_TOO_FAST:${source.source_id}`);
      if (endpoint.parser_ready && !['RSS','ATOM'].includes(endpoint.kind)) throw new Error(`HTML_LISTING_PARSER_NOT_SOURCE_SPECIFIC:${source.source_id}`);
    }

    for (const domain of source.canonical_domains || []) {
      const normalized = normalizeHost(domain);
      if (domains.has(normalized)) throw new Error(`DUPLICATE_MEDIA_DOMAIN:${normalized}:${domains.get(normalized)}:${source.source_id}`);
      domains.set(normalized, source.source_id);
    }
  }

  if (registry.endpoint_registry_version && enabledIds.size !== auditedEnabledIds.size) throw new Error('MEDIA_ENDPOINT_AUDIT_COVERAGE_INCOMPLETE');
  return {
    source_count: registry.sources.length,
    enabled_count: enabledIds.size,
    audited_enabled_count: auditedEnabledIds.size,
    technical_ready_endpoint_count:getTechnicallyReadyMediaEndpoints(registry).length,
    legal_ready_endpoint_count:getLegallyReadyMediaEndpoints(registry).length
  };
}

export function normalizeHost(host) {
  return String(host || '').toLowerCase().replace(/\.$/, '');
}

export function getEnabledMediaSources(registry) {
  return registry.sources.filter(source => source.candidate_discovery_enabled === true && source.monitoring_state === 'ACTIVE_VERIFIED' && source.canonical_domains.length > 0);
}

export function getAuditedEndpointSummary(registry) {
  const enabled = getEnabledMediaSources(registry);
  const rssSources = enabled.filter(source => source.endpoint_audit?.audit_state === 'VERIFIED_RSS');
  const htmlSources = enabled.filter(source => source.endpoint_audit?.audit_state === 'VERIFIED_HTML_LISTING');
  const pendingSources = enabled.filter(source => !['VERIFIED_RSS','VERIFIED_HTML_LISTING'].includes(source.endpoint_audit?.audit_state));
  return {
    active_sources:enabled.length,
    rss_verified_sources:rssSources.length,
    html_listing_verified_sources:htmlSources.length,
    pending_sources:pendingSources.length,
    rss_endpoint_count:rssSources.reduce((sum,source) => sum + source.endpoint_audit.endpoints.length,0)
  };
}

export function getTechnicallyReadyMediaEndpoints(registry) {
  const out = [];
  for (const source of getEnabledMediaSources(registry)) {
    for (const endpoint of source.endpoint_audit?.endpoints || []) {
      if (endpoint.parser_ready === true && ['RSS','ATOM'].includes(endpoint.kind)) out.push({source,endpoint});
    }
  }
  return out;
}

export function getLegallyReadyMediaEndpoints(registry) {
  return getTechnicallyReadyMediaEndpoints(registry).filter(({source}) => LEGAL_REUSE_OK.has(source.legal_reuse_state));
}

export function globalMediaNetworkGatesPass(env=process.env) {
  return env.MEDIA_MONITOR_NETWORK_GATE === 'PASS' && env.FETCHER_SECURITY_GATE === 'PASS' && env.MEDIA_SOURCE_REUSE_GATE === 'PASS';
}

export function getLiveSchedulableMediaEndpoints(registry, env=process.env) {
  if (!globalMediaNetworkGatesPass(env)) return [];
  return getLegallyReadyMediaEndpoints(registry);
}

// Compatibility helper: a source is schedulable only when at least one endpoint is
// parser-ready, legally cleared and all global network gates pass.
export function getSchedulableMediaSources(registry, env=process.env) {
  const ids = new Set(getLiveSchedulableMediaEndpoints(registry,env).map(({source}) => source.source_id));
  return getEnabledMediaSources(registry).filter(source => ids.has(source.source_id));
}

export function sourceById(registry, sourceId) {
  return registry.sources.find(s => s.source_id === sourceId) || null;
}

export function sourceForUrl(registry, input) {
  const url = new URL(input);
  const host = normalizeHost(url.hostname);
  for (const source of registry.sources) {
    if ((source.canonical_domains || []).some(domain => {
      const d = normalizeHost(domain);
      return host === d || host.endsWith(`.${d}`);
    })) return source;
  }
  return null;
}

export function mediaDomainAllowlist(registry) {
  const out = new Map();
  for (const source of getEnabledMediaSources(registry)) {
    for (const domain of source.canonical_domains) out.set(normalizeHost(domain), source.source_id);
  }
  return out;
}
