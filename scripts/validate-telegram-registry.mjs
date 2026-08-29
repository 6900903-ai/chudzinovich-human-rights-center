import { loadTelegramRegistry } from './lib/telegram-registry.mjs';
const registry = await loadTelegramRegistry();
console.log(`TELEGRAM_REGISTRY_VALIDATION=PASS channels=${registry.channels.length}`);
