import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REGISTRY = resolve(moduleDir, '../../source-registry/telegram-sources.json');

export async function loadTelegramRegistry(path = DEFAULT_REGISTRY) {
  const registry = JSON.parse(await readFile(path, 'utf8'));
  validateTelegramRegistry(registry);
  return registry;
}

export function validateTelegramRegistry(registry) {
  if (!registry || registry.policy?.media_report_is_political_prisoner_designation !== false) {
    throw new Error('TELEGRAM_POLITICAL_PRISONER_AUTODESIGNATION_POLICY_MISSING');
  }
  if (registry.policy?.fact_check_required !== false) throw new Error('TELEGRAM_FACT_CHECK_MUST_BE_DISABLED');
  if (registry.policy?.editorial_review_required !== false) throw new Error('TELEGRAM_EDITORIAL_REVIEW_MUST_BE_DISABLED');
  if (registry.policy?.telegram_source_claim_autopublish !== true) throw new Error('TELEGRAM_SOURCE_CLAIM_AUTOPUBLISH_MISSING');
  if (registry.policy?.high_risk_news_autopublish !== false) throw new Error('GLOBAL_HIGH_RISK_AUTOPUBLISH_MUST_REMAIN_DISABLED');
  if (registry.policy?.private_data_republication !== false) throw new Error('TELEGRAM_PRIVATE_DATA_REPUBLICATION_FORBIDDEN');
  if (registry.policy?.runtime_allowed !== false) throw new Error('TELEGRAM_RUNTIME_REQUESTS_FORBIDDEN');
  if (!Array.isArray(registry.channels) || registry.channels.length === 0) throw new Error('TELEGRAM_REGISTRY_EMPTY');

  const ids = new Set();
  const handles = new Set();
  for (const source of registry.channels) {
    if (!/^tg-[a-z0-9-]+$/.test(source.source_id || '')) throw new Error(`TELEGRAM_SOURCE_ID_INVALID:${source.source_id}`);
    if (!/^[A-Za-z0-9_]{5,}$/.test(source.handle || '')) throw new Error(`TELEGRAM_HANDLE_INVALID:${source.handle}`);
    if (ids.has(source.source_id)) throw new Error(`TELEGRAM_SOURCE_ID_DUPLICATE:${source.source_id}`);
    if (handles.has(source.handle.toLowerCase())) throw new Error(`TELEGRAM_HANDLE_DUPLICATE:${source.handle}`);
    ids.add(source.source_id);
    handles.add(source.handle.toLowerCase());
    if (source.canonical_url !== `https://t.me/${source.handle}`) throw new Error(`TELEGRAM_CANONICAL_URL_MISMATCH:${source.source_id}`);
    if (source.preview_url !== `https://t.me/s/${source.handle}`) throw new Error(`TELEGRAM_PREVIEW_URL_MISMATCH:${source.source_id}`);
    if (source.publication_enabled !== true) throw new Error(`TELEGRAM_REQUIRED_SOURCE_NOT_ENABLED:${source.source_id}`);
    if (!['AUTO_PUBLISH_ATTRIBUTED','AUTO_PUBLISH_ATTRIBUTED_NO_PRIVATE_DATA'].includes(source.publication_policy)) {
      throw new Error(`TELEGRAM_SOURCE_NOT_AUTO_PUBLISH:${source.source_id}`);
    }
    if (source.claim_semantics !== 'SOURCE_CLAIM_ONLY' && source.claim_semantics !== 'FIRST_PARTY_OR_SOURCE_CLAIM') {
      throw new Error(`TELEGRAM_CLAIM_SEMANTICS_INVALID:${source.source_id}`);
    }
  }

  return { channel_count: registry.channels.length };
}

export function telegramSourceByHandle(registry, handle) {
  const normalized = String(handle || '').replace(/^@/, '').toLowerCase();
  return registry.channels.find(source => source.handle.toLowerCase() === normalized) || null;
}

export function telegramSourceById(registry, sourceId) {
  return registry.channels.find(source => source.source_id === sourceId) || null;
}
