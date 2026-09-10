import { describe, expect, it } from 'vitest';
import { parseStoredLlmSettings } from './llm-settings.js';

describe('parseStoredLlmSettings', () => {
  it('returns undefined for missing/non-object input', () => {
    expect(parseStoredLlmSettings(undefined)).toBeUndefined();
    expect(parseStoredLlmSettings(null)).toBeUndefined();
    expect(parseStoredLlmSettings('nope')).toBeUndefined();
  });

  it('returns undefined for an unrecognized provider', () => {
    expect(parseStoredLlmSettings({ provider: 'ollama', encryptedKey: 'abc' })).toBeUndefined();
  });

  it('returns undefined for a missing/empty encrypted key', () => {
    expect(parseStoredLlmSettings({ provider: 'openai' })).toBeUndefined();
    expect(parseStoredLlmSettings({ provider: 'openai', encryptedKey: '' })).toBeUndefined();
  });

  it('parses a valid stored settings object', () => {
    expect(parseStoredLlmSettings({ provider: 'anthropic', encryptedKey: 'YWJj' })).toEqual({
      provider: 'anthropic',
      encryptedKey: 'YWJj',
    });
  });
});
