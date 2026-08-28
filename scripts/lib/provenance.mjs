const PUBLIC_STATES = new Set(['PUBLIC_CONFIRMED','PUBLIC_SOURCE_ATTRIBUTED','PUBLIC_DISPUTED']);
const PRIVATE_STATES = new Set(['PRIVATE_REVIEW']);

export function validatePublicPersonProvenance(person) {
  const errors = [];
  const sourceIds = new Set((person.sources || []).map(source => source?.source_id).filter(Boolean));

  if (!PUBLIC_STATES.has(person.publication_state)) errors.push('PERSON_NOT_PUBLIC');
  if (person.photo?.local_asset && !person.photo.local_asset.startsWith('/assets/')) errors.push('PHOTO_NOT_LOCAL_ASSET');
  if (person.photo?.rights_state && person.photo.rights_state !== 'PERMITTED' && person.photo.local_asset) errors.push('PHOTO_WITHOUT_PERMISSION');

  for (const source of person.sources || []) {
    if (!source?.source_id || !sourceIds.has(source.source_id)) errors.push('SOURCE_ID_INVALID');
    try {
      const url = new URL(source.url);
      if (url.protocol !== 'https:') errors.push(`SOURCE_URL_NOT_HTTPS:${source.source_id}`);
    } catch { errors.push(`SOURCE_URL_INVALID:${source?.source_id || 'unknown'}`); }
  }

  if (person.birth_date) {
    const fact = person.facts?.birth_date;
    if (!fact) errors.push('BIRTH_DATE_PROVENANCE_MISSING');
    else if (!sourceIds.has(fact.source_id)) errors.push('BIRTH_DATE_SOURCE_MISSING');
  }

  for (const event of person.status_events || []) {
    if (PRIVATE_STATES.has(event?.publication_state)) errors.push(`PRIVATE_STATUS_EVENT:${event?.event_id || 'unknown'}`);
    if (event?.designation === 'SOURCE_ATTRIBUTED') {
      if (!event.source_id) errors.push(`SOURCE_ATTRIBUTED_STATUS_WITHOUT_SOURCE:${event?.event_id || 'unknown'}`);
      else if (!sourceIds.has(event.source_id)) errors.push(`STATUS_SOURCE_NOT_REGISTERED:${event.event_id}`);
    }
    if (event?.status === 'POLITICAL_PRISONER' && !['SOURCE_ATTRIBUTED','EDITORIAL_CONFIRMED'].includes(event.designation)) {
      errors.push(`POLITICAL_PRISONER_DESIGNATION_INVALID:${event?.event_id || 'unknown'}`);
    }
  }

  const sourcedGroups = ['detentions','charges','judgments','sentences','prison_placements','release_events'];
  for (const group of sourcedGroups) {
    for (const event of person[group] || []) {
      if (['RETRACTED','SUPERSEDED'].includes(event?.state)) continue;
      if (!event?.source_id) errors.push(`PUBLIC_EVENT_SOURCE_MISSING:${group}:${event?.event_id || 'unknown'}`);
      else if (!sourceIds.has(event.source_id)) errors.push(`PUBLIC_EVENT_SOURCE_NOT_REGISTERED:${group}:${event?.event_id || 'unknown'}`);
    }
  }

  for (const change of person.change_history || []) {
    if (change.publication_state === 'PRIVATE_REVIEW') errors.push(`PRIVATE_CHANGE_HISTORY:${change.change_id}`);
    for (const sourceId of change.source_ids || []) if (!sourceIds.has(sourceId)) errors.push(`CHANGE_SOURCE_NOT_REGISTERED:${change.change_id}:${sourceId}`);
  }

  return errors;
}

export function assertPublicDatasetProvenance(people) {
  const failures = [];
  for (const person of people || []) {
    for (const error of validatePublicPersonProvenance(person)) failures.push(`${person.person_id}:${error}`);
  }
  if (failures.length) throw new Error(`PUBLIC_PROVENANCE_FAIL:${failures.join('|')}`);
  return true;
}
