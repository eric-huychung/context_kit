import type { LlmProvider } from '../../../src/llm/llm-chat.js';

const VALID_PROVIDERS: readonly LlmProvider[] = ['anthropic', 'openai', 'openrouter'];

/**
 * Shape written to `llm-settings.json` under Electron `userData`. Never
 * the raw key — `encryptedKey` is `safeStorage.encryptString(apiKey)`,
 * base64-encoded so it round-trips through JSON.
 */
export interface StoredLlmSettings {
  provider: LlmProvider;
  encryptedKey: string;
}

/** Parses the settings file's JSON. Malformed/missing/unrecognized provider → `undefined`, never a crash. */
export function parseStoredLlmSettings(raw: unknown): StoredLlmSettings | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const provider = (raw as { provider?: unknown }).provider;
  const encryptedKey = (raw as { encryptedKey?: unknown }).encryptedKey;
  if (typeof provider !== 'string' || !VALID_PROVIDERS.includes(provider as LlmProvider)) {
    return undefined;
  }
  if (typeof encryptedKey !== 'string' || encryptedKey.length === 0) {
    return undefined;
  }
  return { provider: provider as LlmProvider, encryptedKey };
}
