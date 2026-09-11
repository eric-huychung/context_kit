import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { app, safeStorage } from 'electron';
import { createLlmChat, pingLlmChat, type LlmChat, type LlmProvider } from '../../../src/llm/llm-chat.js';
import { err, isOk, ok, type Result } from '../../../src/core/result.js';
import {
  emptyLlmStatus,
  llmKeyHint,
  parseStoredLlmSettings,
  toLlmStatus,
  type LlmStatus,
  type StoredLlmKey,
  type StoredLlmSettings,
} from '../shared/llm-settings.js';

function settingsFilePath(): string {
  return join(app.getPath('userData'), 'llm-settings.json');
}

function readStoredFile(): StoredLlmSettings {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(settingsFilePath(), 'utf8'));
  } catch {
    return { keys: [], activeId: null };
  }
  return parseStoredLlmSettings(raw) ?? { keys: [], activeId: null };
}

function writeStored(stored: StoredLlmSettings): Result<void> {
  try {
    writeFileSync(settingsFilePath(), JSON.stringify({ keys: stored.keys, activeId: stored.activeId }));
  } catch (error) {
    return err(new Error(`Could not save LLM settings: ${error instanceof Error ? error.message : 'write failed'}`));
  }
  return ok(undefined);
}

function decryptKey(key: StoredLlmKey): string | undefined {
  if (!safeStorage.isEncryptionAvailable()) return undefined;
  try {
    return safeStorage.decryptString(Buffer.from(key.encryptedKey, 'base64'));
  } catch {
    return undefined;
  }
}

function activeKey(store: StoredLlmSettings): StoredLlmKey | undefined {
  if (!store.activeId) return undefined;
  return store.keys.find((key) => key.id === store.activeId);
}

/** Builds this session's `LlmChat` from the active key, or `undefined`. */
export function loadLlmChat(): LlmChat | undefined {
  const key = activeKey(readStoredFile());
  if (!key) return undefined;
  const apiKey = decryptKey(key);
  if (!apiKey) return undefined;
  return createLlmChat(key.provider, apiKey);
}

export function llmStatus(): LlmStatus {
  const store = readStoredFile();
  if (store.keys.length === 0) return emptyLlmStatus();
  return toLlmStatus(store);
}

/**
 * Pings, then appends a key and makes it the active one (previous
 * active is cleared). Renderer never sees the raw key after this.
 */
export async function saveLlmSettings(provider: LlmProvider, apiKey: string): Promise<Result<void>> {
  if (!safeStorage.isEncryptionAvailable()) {
    return err(new Error('This OS has no keychain available to encrypt the key with.'));
  }
  const pinged = await pingLlmChat(createLlmChat(provider, apiKey));
  if (!isOk(pinged)) return pinged;
  const store = readStoredFile();
  const hint = llmKeyHint(apiKey);
  const next: StoredLlmKey = {
    id: randomUUID(),
    provider,
    encryptedKey: safeStorage.encryptString(apiKey).toString('base64'),
    ...(hint ? { keyHint: hint } : {}),
  };
  return writeStored({ keys: [...store.keys, next], activeId: next.id });
}

/** Picking a key makes it the only active one. Picking the active key again clears it. */
export function setActiveLlmKey(id: string): Result<void> {
  const store = readStoredFile();
  if (!store.keys.some((key) => key.id === id)) {
    return err(new Error('No LLM key saved yet.'));
  }
  const activeId = store.activeId === id ? null : id;
  return writeStored({ ...store, activeId });
}

function decryptedKey(id: string): Result<string> {
  const key = readStoredFile().keys.find((row) => row.id === id);
  if (!key) return err(new Error('No LLM key saved yet.'));
  const apiKey = decryptKey(key);
  if (!apiKey) return err(new Error('Could not decrypt that key.'));
  return ok(apiKey);
}

/** Decrypts for the eye toggle. Status still never includes raw keys. */
export function revealLlmKey(id: string): Result<string> {
  return decryptedKey(id);
}

export function removeLlmKey(id: string): Result<void> {
  const store = readStoredFile();
  const keys = store.keys.filter((key) => key.id !== id);
  if (keys.length === store.keys.length) {
    return err(new Error('No LLM key saved yet.'));
  }
  const activeId = store.activeId === id ? null : store.activeId;
  return writeStored({ keys, activeId });
}
