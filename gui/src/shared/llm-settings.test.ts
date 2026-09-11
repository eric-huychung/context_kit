import { describe, expect, it } from 'vitest';
import { llmKeyHint, parseStoredLlmSettings, toLlmStatus } from './llm-settings.js';

describe('parseStoredLlmSettings', () => {
  it('returns undefined for missing/non-object input', () => {
    expect(parseStoredLlmSettings(undefined)).toBeUndefined();
    expect(parseStoredLlmSettings(null)).toBeUndefined();
    expect(parseStoredLlmSettings('nope')).toBeUndefined();
  });

  it('returns undefined for an unrecognized provider on a legacy file', () => {
    expect(parseStoredLlmSettings({ provider: 'ollama', encryptedKey: 'abc' })).toBeUndefined();
  });

  it('returns undefined for a missing/empty encrypted key on a legacy file', () => {
    expect(parseStoredLlmSettings({ provider: 'openai' })).toBeUndefined();
    expect(parseStoredLlmSettings({ provider: 'openai', encryptedKey: '' })).toBeUndefined();
  });

  it('migrates a legacy single-key file into a one-row vault', () => {
    expect(parseStoredLlmSettings({ provider: 'anthropic', encryptedKey: 'YWJj', keyHint: 'uvwx' })).toEqual({
      keys: [{ id: 'legacy', provider: 'anthropic', encryptedKey: 'YWJj', keyHint: 'uvwx' }],
      activeId: 'legacy',
    });
  });

  it('migrates a parked legacy key with activeId null', () => {
    expect(parseStoredLlmSettings({ provider: 'openai', encryptedKey: 'YWJj', enabled: false })?.activeId).toBeNull();
  });

  it('parses a vault and drops a dangling activeId', () => {
    expect(
      parseStoredLlmSettings({
        keys: [{ id: 'a', provider: 'openai', encryptedKey: 'YWJj', keyHint: 'test' }],
        activeId: 'gone',
      })
    ).toEqual({
      keys: [{ id: 'a', provider: 'openai', encryptedKey: 'YWJj', keyHint: 'test' }],
      activeId: null,
    });
  });

  it('parses an empty vault', () => {
    expect(parseStoredLlmSettings({ keys: [], activeId: null })).toEqual({ keys: [], activeId: null });
  });
});

describe('toLlmStatus', () => {
  it('marks the active row as enabled and hides encrypted material', () => {
    expect(
      toLlmStatus({
        keys: [
          { id: 'a', provider: 'openai', encryptedKey: 'secret', keyHint: 'test' },
          { id: 'b', provider: 'anthropic', encryptedKey: 'secret2', keyHint: 'uvwx' },
        ],
        activeId: 'a',
      })
    ).toEqual({
      hasKey: true,
      enabled: true,
      provider: 'openai',
      keyHint: 'test',
      keys: [
        { id: 'a', provider: 'openai', keyHint: 'test' },
        { id: 'b', provider: 'anthropic', keyHint: 'uvwx' },
      ],
      activeId: 'a',
    });
  });
});

describe('llmKeyHint', () => {
  it('returns the last 4 characters of a trimmed key', () => {
    expect(llmKeyHint('  sk-abcdefghijklmnopqrstuvwx  ')).toBe('uvwx');
  });
});
