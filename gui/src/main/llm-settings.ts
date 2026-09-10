import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app, safeStorage } from 'electron';
import { createLlmChat, type LlmChat, type LlmProvider } from '../../../src/llm/llm-chat.js';
import { err, ok, type Result } from '../../../src/core/result.js';
import { parseStoredLlmSettings } from '../shared/llm-settings.js';

/**
 * GUI's `LlmSettings`: one JSON file under Electron `userData`, same
 * folder as `recent-folders.json`. The key itself is never written in
 * the clear — `safeStorage.encryptString` first, base64 for JSON.
 */
function settingsFilePath(): string {
  return join(app.getPath('userData'), 'llm-settings.json');
}

function readStoredProvider(): { provider: LlmProvider; apiKey: string } | undefined {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(settingsFilePath(), 'utf8'));
  } catch {
    return undefined;
  }
  const stored = parseStoredLlmSettings(raw);
  if (!stored || !safeStorage.isEncryptionAvailable()) {
    return undefined;
  }
  try {
    const apiKey = safeStorage.decryptString(Buffer.from(stored.encryptedKey, 'base64'));
    return { provider: stored.provider, apiKey };
  } catch {
    return undefined;
  }
}

/** Builds this session's `LlmChat` from the saved key, or `undefined` if none is set/decryptable. */
export function loadLlmChat(): LlmChat | undefined {
  const stored = readStoredProvider();
  return stored ? createLlmChat(stored.provider, stored.apiKey) : undefined;
}

/** Renderer never receives the raw key — only this boolean, over IPC. */
export function hasLlmKey(): boolean {
  return readStoredProvider() !== undefined;
}

/** Encrypts and persists provider + key. Errors if this OS has no OS-level keychain to encrypt with. */
export function saveLlmSettings(provider: LlmProvider, apiKey: string): Result<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    return err(new Error('This OS has no keychain available to encrypt the key with.'));
  }
  const encryptedKey = safeStorage.encryptString(apiKey).toString('base64');
  try {
    writeFileSync(settingsFilePath(), JSON.stringify({ provider, encryptedKey }));
  } catch (error) {
    return err(new Error(`Could not save LLM settings: ${error instanceof Error ? error.message : 'write failed'}`));
  }
  return ok(undefined);
}
