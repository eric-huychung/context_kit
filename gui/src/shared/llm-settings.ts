import type { LlmProvider } from '../../../src/llm/llm-chat.js';

const VALID_PROVIDERS: readonly LlmProvider[] = ['anthropic', 'openai', 'openrouter'];
const LEGACY_KEY_ID = 'legacy';
const DEFAULT_PROVIDER: LlmProvider = 'anthropic';

/** One encrypted key in `llm-settings.json`. */
export interface StoredLlmKey {
  id: string;
  provider: LlmProvider;
  encryptedKey: string;
  /** Last 4 chars of the key, for the list. Not a secret. */
  keyHint?: string;
}

/**
 * Vault written under Electron `userData`. `activeId` is the one
 * `loadLlmChat` uses — picking another key clears the previous.
 */
export interface StoredLlmSettings {
  keys: StoredLlmKey[];
  activeId: string | null;
}

/** Renderer-safe row. Never includes the raw key. */
export interface LlmKeyRow {
  id: string;
  provider: LlmProvider;
  keyHint?: string;
}

/** Renderer-safe status. Never includes the raw key. */
export interface LlmStatus {
  hasKey: boolean;
  enabled: boolean;
  provider: LlmProvider;
  keyHint?: string;
  keys: LlmKeyRow[];
  activeId: string | null;
}

export function emptyLlmStatus(): LlmStatus {
  return { hasKey: false, enabled: false, provider: DEFAULT_PROVIDER, keys: [], activeId: null };
}

/** Last 4 of a trimmed key — enough to tell which one is saved, not enough to use. */
export function llmKeyHint(apiKey: string): string {
  const trimmed = apiKey.trim();
  return trimmed.length === 0 ? '' : trimmed.slice(-4);
}

function parseKeyHint(raw: unknown): string | undefined {
  return typeof raw === 'string' && raw.length > 0 && raw.length <= 8 ? raw : undefined;
}

function parseStoredKey(raw: unknown): StoredLlmKey | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const id = (raw as { id?: unknown }).id;
  const provider = (raw as { provider?: unknown }).provider;
  const encryptedKey = (raw as { encryptedKey?: unknown }).encryptedKey;
  if (typeof id !== 'string' || id.length === 0) return undefined;
  if (typeof provider !== 'string' || !VALID_PROVIDERS.includes(provider as LlmProvider)) return undefined;
  if (typeof encryptedKey !== 'string' || encryptedKey.length === 0) return undefined;
  const keyHint = parseKeyHint((raw as { keyHint?: unknown }).keyHint);
  return {
    id,
    provider: provider as LlmProvider,
    encryptedKey,
    ...(keyHint ? { keyHint } : {}),
  };
}

function parseLegacyStore(raw: object): StoredLlmSettings | undefined {
  const provider = (raw as { provider?: unknown }).provider;
  const encryptedKey = (raw as { encryptedKey?: unknown }).encryptedKey;
  if (typeof provider !== 'string' || !VALID_PROVIDERS.includes(provider as LlmProvider)) return undefined;
  if (typeof encryptedKey !== 'string' || encryptedKey.length === 0) return undefined;
  const keyHint = parseKeyHint((raw as { keyHint?: unknown }).keyHint);
  const enabled = (raw as { enabled?: unknown }).enabled !== false;
  return {
    keys: [
      {
        id: LEGACY_KEY_ID,
        provider: provider as LlmProvider,
        encryptedKey,
        ...(keyHint ? { keyHint } : {}),
      },
    ],
    activeId: enabled ? LEGACY_KEY_ID : null,
  };
}

/** Parses the settings file. Old single-key files migrate in memory. Malformed → `undefined`. */
export function parseStoredLlmSettings(raw: unknown): StoredLlmSettings | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const keysRaw = (raw as { keys?: unknown }).keys;
  if (Array.isArray(keysRaw)) {
    const keys = keysRaw.flatMap((row) => {
      const parsed = parseStoredKey(row);
      return parsed ? [parsed] : [];
    });
    const activeIdRaw = (raw as { activeId?: unknown }).activeId;
    const activeId =
      typeof activeIdRaw === 'string' && keys.some((key) => key.id === activeIdRaw) ? activeIdRaw : null;
    return { keys, activeId };
  }
  return parseLegacyStore(raw);
}

export function toLlmStatus(store: StoredLlmSettings): LlmStatus {
  const keys: LlmKeyRow[] = store.keys.map((key) => ({
    id: key.id,
    provider: key.provider,
    ...(key.keyHint ? { keyHint: key.keyHint } : {}),
  }));
  const active = keys.find((key) => key.id === store.activeId);
  return {
    hasKey: keys.length > 0,
    enabled: active != null,
    provider: active?.provider ?? DEFAULT_PROVIDER,
    ...(active?.keyHint ? { keyHint: active.keyHint } : {}),
    keys,
    activeId: active?.id ?? null,
  };
}
