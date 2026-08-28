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
    pending_endpoint_or_parser_sources:eligible.filter(source => !technicalSources.has(source.source_id)).map(source => ({
      source_id:source.source_id,
      audit_state:source.endpoint_audit?.audit_state || 'NOT_AUDITED'
    }))
  };
}

if (import.meta.url===`file://${process.argv[1]}`) console.log(JSON.stringify(await schedulerPlan(),null,2));
