import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REGISTRY = resolve(moduleDir, '../../source-registry/media-sources/index.json');

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
  const registry = {
    registry_version:parsed.registry_version,
    updated_at:parsed.updated_at,
    coverage:parsed.coverage,
    policy:parsed.policy,
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

  for (const source of registry.sources) {
    if (!/^src-[a-z0-9-]+$/.test(source.source_id || '')) throw new Error(`INVALID_SOURCE_ID:${source.source_id}`);
    if (ids.has(source.source_id)) throw new Error(`DUPLICATE_SOURCE_ID:${source.source_id}`);
    ids.add(source.source_id);
    if (source.runtime_allowed !== false) throw new Error(`RUNTIME_SOURCE_FORBIDDEN:${source.source_id}`);
    if (source.claim_semantics !== 'SOURCE_CLAIM_ONLY') throw new Error(`CLAIM_SEMANTICS_INVALID:${source.source_id}`);
    if (source.candidate_discovery_enabled) {
      if (source.monitoring_state !== 'ACTIVE_VERIFIED') throw new Error(`ENABLED_SOURCE_NOT_ACTIVE:${source.source_id}`);
      if (!source.canonical_domains?.length) throw new Error(`ENABLED_SOURCE_WITHOUT_DOMAIN:${source.source_id}`);
    }
    if (source.endpoint_verified) {
      if (!source.discovery_endpoint) throw new Error(`VERIFIED_ENDPOINT_MISSING:${source.source_id}`);
      const endpoint = new URL(source.discovery_endpoint);
      if (endpoint.protocol !== 'https:') throw new Error(`VERIFIED_ENDPOINT_NOT_HTTPS:${source.source_id}`);
      const endpointHost = normalizeHost(endpoint.hostname);
      const allowedEndpoint = (source.canonical_domains || []).some(domain => {
        const d = normalizeHost(domain);
        return endpointHost === d || endpointHost.endsWith(`.${d}`);
      });
      if (!allowedEndpoint) throw new Error(`VERIFIED_ENDPOINT_OUTSIDE_SOURCE:${source.source_id}`);
    }
    for (const domain of source.canonical_domains || []) {
      const normalized = normalizeHost(domain);
      if (domains.has(normalized)) throw new Error(`DUPLICATE_MEDIA_DOMAIN:${normalized}:${domains.get(normalized)}:${source.source_id}`);
      domains.set(normalized, source.source_id);
    }
  }
  return { source_count: registry.sources.length, enabled_count: registry.sources.filter(s => s.candidate_discovery_enabled).length };
}

export function normalizeHost(host) {
  return String(host || '').toLowerCase().replace(/\.$/, '');
}

export function getEnabledMediaSources(registry) {
  return registry.sources.filter(source => source.candidate_discovery_enabled === true && source.monitoring_state === 'ACTIVE_VERIFIED' && source.canonical_domains.length > 0);
}

export function getSchedulableMediaSources(registry) {
  return getEnabledMediaSources(registry).filter(source => source.endpoint_verified === true && typeof source.discovery_endpoint === 'string' && source.discovery_endpoint.startsWith('https://'));
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
