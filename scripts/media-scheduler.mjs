import { loadMediaRegistry, getEnabledMediaSources, getSchedulableMediaSources } from './lib/media-registry.mjs';

export async function schedulerPlan() {
  const registry=await loadMediaRegistry();
  const eligible=getEnabledMediaSources(registry);
  const schedulable=getSchedulableMediaSources(registry);
  const scheduledIds=new Set(schedulable.map(s=>s.source_id));
  const pending=eligible.filter(s=>!scheduledIds.has(s.source_id));
  return {registry_version:registry.registry_version,total_sources:registry.sources.length,candidate_eligible_sources:eligible.length,schedulable_sources:schedulable.map(s=>s.source_id),pending_endpoint_verification:pending.map(s=>s.source_id),live_polling_enabled:schedulable.length>0};
}

if (import.meta.url===`file://${process.argv[1]}`) console.log(JSON.stringify(await schedulerPlan(),null,2));
