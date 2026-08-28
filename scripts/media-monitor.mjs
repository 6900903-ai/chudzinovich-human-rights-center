import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadMediaRegistry, sourceById } from './lib/media-registry.mjs';
import { buildMediaObservation, fetchObservation } from './adapters/media-generic.mjs';
import { buildPrivateCandidate, writePrivateCandidate } from './lib/private-candidate-sink.mjs';

export async function observationsFromFixture(path) {
  if (process.env.CHRC_TEST_MODE !== '1') throw new Error('MEDIA_FIXTURE_REQUIRES_TEST_MODE');
  const registry=await loadMediaRegistry();
  const rows=JSON.parse(await readFile(resolve(path),'utf8'));
  return rows.map(row=>{
    const source=sourceById(registry,row.source_id);
    if (!source) throw new Error(`FIXTURE_UNKNOWN_SOURCE:${row.source_id}`);
    return {group_id:row.group_id||row.article_url,...buildMediaObservation(source,row,{observed_at:row.observed_at||'2026-08-28T20:30:00Z',person_names:row.person_names||[],upstream_source:row.upstream_source||null,foreignJurisdiction:row.foreign_jurisdiction===true})};
  });
}

export function candidateGroups(observations) {
  const groups=new Map();
  for (const observation of observations) {
    if (!groups.has(observation.group_id)) groups.set(observation.group_id,[]);
    const {group_id,...clean}=observation; groups.get(group_id).push(clean);
  }
  return groups;
}

export function candidatesFromObservations(observations) {
  const out=[];
  for (const [groupId,group] of candidateGroups(observations)) {
    const relevant=group.filter(o=>!['ORDINARY_CRIME','FALSE_POSITIVE','FOREIGN_JURISDICTION'].includes(o.classification));
    if (!relevant.length) continue;
    const name=relevant.flatMap(o=>o.person_names||[]).find(Boolean)||'';
    const built=buildPrivateCandidate(relevant,{name_as_reported:name,event_type:relevant[0].event_hint,possible_person_id:null,hasHumanRightsSource:false});
    out.push({group_id:groupId,...built});
  }
  return out;
}

export async function runFixture(path,{write=false,privateDir=undefined}={}) {
  const observations=await observationsFromFixture(path); const candidates=candidatesFromObservations(observations); const written=[];
  if (write) for (const item of candidates) written.push(await writePrivateCandidate(item.candidate,privateDir));
  return {observations,candidates,written};
}

export async function runSingleLiveArticle(sourceId,articleUrl,{person_names=[],privateDir=undefined}={}) {
  const observation=await fetchObservation(sourceId,articleUrl,{person_names});
  if (['ORDINARY_CRIME','FALSE_POSITIVE','FOREIGN_JURISDICTION'].includes(observation.classification)) return {observation,candidate:null,written:null};
  const built=buildPrivateCandidate([observation],{name_as_reported:person_names[0]||'',event_type:observation.event_hint});
  return {observation,candidate:built.candidate,written:await writePrivateCandidate(built.candidate,privateDir)};
}

async function main() {
  const args=process.argv.slice(2);
  if (args[0]==='--fixture' && args[1]) {
    const result=await runFixture(args[1],{write:args.includes('--write')});
    console.log(JSON.stringify({observations:result.observations.length,candidates:result.candidates.length,written:result.written.length,public_database_mutations:0,political_prisoner_autodesignation:false},null,2)); return;
  }
  if (args[0]==='--article' && args[1] && args[2]) {
    const result=await runSingleLiveArticle(args[1],args[2]);
    console.log(JSON.stringify({observation_id:result.observation.observation_id,classification:result.observation.classification,candidate_id:result.candidate?.candidate_id||null,public_database_mutations:0},null,2)); return;
  }
  throw new Error('USAGE: node scripts/media-monitor.mjs --fixture <path> [--write] | --article <source_id> <https-url>');
}
if (import.meta.url===`file://${process.argv[1]}`) main().catch(error=>{console.error(error.message);process.exitCode=1;});
