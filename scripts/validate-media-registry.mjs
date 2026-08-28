import { loadMediaRegistry, validateMediaRegistry, getSchedulableMediaSources } from './lib/media-registry.mjs';
const registry=await loadMediaRegistry();
const stats=validateMediaRegistry(registry);
const schedulable=getSchedulableMediaSources(registry);
console.log(`MEDIA_REGISTRY_VALIDATION=PASS sources=${stats.source_count} candidate_eligible=${stats.enabled_count} schedulable=${schedulable.length}`);
