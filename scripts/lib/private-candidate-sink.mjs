import { mkdir, realpath, writeFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute, sep, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { summarizeIndependence, confidenceFromIndependence } from './source-independence.mjs';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(moduleDir, '../..');

function inside(parent, child) {
  const rel = relative(parent, child);
  return rel === '' || (!rel.startsWith('..' + sep) && rel !== '..' && !isAbsolute(rel));
}

export async function resolvePrivateReviewDir(input = process.env.CHRC_PRIVATE_REVIEW_DIR) {
  if (!input) throw new Error('PRIVATE_EDITORIAL_STORAGE_NOT_CONFIGURED');
  const requested = resolve(input);
  // Reject repository-local paths before creating anything on disk.
  if (inside(REPO_ROOT, requested)) throw new Error('PRIVATE_REVIEW_DIR_INSIDE_PUBLIC_REPO');
  await mkdir(requested, { recursive:true, mode:0o700 });
  const [repo, target] = await Promise.all([realpath(REPO_ROOT), realpath(requested)]);
  if (inside(repo, target)) throw new Error('PRIVATE_REVIEW_DIR_INSIDE_PUBLIC_REPO');
  return target;
}

function stableCandidateId(observations) {
  const basis = observations.map(o => `${o.source_id}|${o.article_url}|${o.origin_claim_id || ''}`).sort().join('\n');
  return 'cand-' + createHash('sha256').update(basis).digest('hex').slice(0,16);
}

export function buildPrivateCandidate(observations, options={}) {
  if (!Array.isArray(observations) || observations.length === 0) throw new Error('CANDIDATE_WITHOUT_OBSERVATIONS');
  const disallowed = new Set(['ORDINARY_CRIME','FALSE_POSITIVE','FOREIGN_JURISDICTION']);
  if (observations.every(o => disallowed.has(o.classification))) throw new Error('NON_REPRESSION_OBSERVATIONS_NOT_CANDIDATE');
  const independence = summarizeIndependence(observations);
  const first = independence.observations[0];
  const labels = new Set(independence.observations.map(o => o.classification));
  const classifier_label = labels.has('POLITICAL_REPRESSION_CANDIDATE') ? 'POLITICAL_REPRESSION_CANDIDATE' : labels.has('HUMAN_RIGHTS_RELEVANT') ? 'HUMAN_RIGHTS_RELEVANT' : 'UNKNOWN';
  const candidate = {
    candidate_id: stableCandidateId(independence.observations),
    possible_person_id: options.possible_person_id ?? null,
    name_as_reported: options.name_as_reported || '', aliases: options.aliases || [],
    event_type: options.event_type || first.event_hint || 'UNKNOWN', event_date: options.event_date ?? null,
    location: options.location ?? null, reported_charge: options.reported_charge ?? null,
    article_urls:[...new Set(independence.observations.map(o => o.article_url))],
    source_ids:[...new Set(independence.observations.map(o => o.source_id))],
    source_count:independence.source_count,
    independent_origin_count:independence.independent_origin_count,
    confidence:confidenceFromIndependence({independent_origin_count:independence.independent_origin_count,hasHumanRightsSource:options.hasHumanRightsSource===true}),
    discovered_at:options.discovered_at || new Date().toISOString(),
    review_status:independence.independent_origin_count >= 2 ? 'CORROBORATED' : 'NEW',
    classifier_label,
    high_risk_flags:[...new Set(independence.observations.flatMap(o => o.high_risk_flags || []))],
    publication_blocked:true, private_record:true
  };
  if ('political_prisoner' in candidate || 'political_prisoner_status' in candidate) throw new Error('POLITICAL_PRISONER_FIELD_FORBIDDEN_IN_MEDIA_CANDIDATE');
  return { candidate, observations:independence.observations };
}

export async function writePrivateCandidate(candidate, inputDir) {
  const dir = await resolvePrivateReviewDir(inputDir);
  const path = join(dir, `${candidate.candidate_id}.json`);
  await writeFile(path, JSON.stringify(candidate,null,2)+'\n', {encoding:'utf8',mode:0o600,flag:'wx'});
  return path;
}

export const PRIVATE_CANDIDATE_POLICY = Object.freeze({public_repo_storage:false,political_prisoner_autodesignation:false,high_risk_autopublish:false});
