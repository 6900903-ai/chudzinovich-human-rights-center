import {
  loadMediaRegistry,
  getEnabledMediaSources,
  getAuditedEndpointSummary,
  getTechnicallyReadyMediaEndpoints,
  getLegallyReadyMediaEndpoints,
  getLiveSchedulableMediaEndpoints,
  globalMediaNetworkGatesPass
} from './lib/media-registry.mjs';

function endpointRef({source,endpoint}) {
  return {
    source_id:source.source_id,
    endpoint_id:endpoint.endpoint_id,
    kind:endpoint.kind,
    scope:endpoint.scope,
    poll_interval_minutes:endpoint.poll_interval_minutes
  };
}

export async function schedulerPlan(env=process.env) {
  const registry = await loadMediaRegistry();
  const eligible = getEnabledMediaSources(registry);
  const audit = getAuditedEndpointSummary(registry);
  const technical = getTechnicallyReadyMediaEndpoints(registry);
  const legal = getLegallyReadyMediaEndpoints(registry);
  const live = getLiveSchedulableMediaEndpoints(registry,env);
  const technicalSources = new Set(technical.map(({source}) => source.source_id));
  const liveSourceIds = [...new Set(live.map(({source}) => source.source_id))];
  const pending = eligible.filter(source => !technicalSources.has(source.source_id)).map(source => ({
    source_id:source.source_id,
    audit_state:source.endpoint_audit?.audit_state || 'NOT_AUDITED'
  }));

  return {
    registry_version:registry.registry_version,
    endpoint_registry_version:registry.endpoint_registry_version,
    total_sources:registry.sources.length,
    candidate_eligible_sources:eligible.length,
    endpoint_audit:audit,
    technically_ready_endpoints:technical.map(endpointRef),
    technically_ready_source_count:technicalSources.size,
    legally_ready_endpoint_count:legal.length,
    live_schedulable_endpoints:live.map(endpointRef),
    live_network_gates_pass:globalMediaNetworkGatesPass(env),
    live_polling_enabled:live.length > 0,
    pending_endpoint_or_parser_sources:pending,
    // Wave 4 compatibility aliases. These now represent fully live-authorized
    // sources, not merely sources with a technically visible endpoint.
    schedulable_sources:liveSourceIds,
    pending_endpoint_verification:pending.map(item => item.source_id)
  };
}

if (import.meta.url===`file://${process.argv[1]}`) console.log(JSON.stringify(await schedulerPlan(),null,2));
