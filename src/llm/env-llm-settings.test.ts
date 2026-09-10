import { describe, expect, it } from 'vitest';
import { llmChatFromEnv, loadLlmSettingsFromEnv } from './env-llm-settings.js';

describe('loadLlmSettingsFromEnv', () => {
  it('returns undefined when no env vars are set', () => {
    expect(loadLlmSettingsFromEnv({})).toBeUndefined();
  });

  it('returns undefined when only the provider is set', () => {
    expect(loadLlmSettingsFromEnv({ SKIL_LLM_PROVIDER: 'openai' })).toBeUndefined();
  });

  it('returns undefined when only the key is set', () => {
    expect(loadLlmSettingsFromEnv({ SKIL_LLM_API_KEY: 'sk-test' })).toBeUndefined();
  });

  it('returns undefined for an unrecognized provider', () => {
    expect(loadLlmSettingsFromEnv({ SKIL_LLM_PROVIDER: 'ollama', SKIL_LLM_API_KEY: 'sk-test' })).toBeUndefined();
  });

  it('returns provider + key when both are set to a valid provider', () => {
    expect(loadLlmSettingsFromEnv({ SKIL_LLM_PROVIDER: 'anthropic', SKIL_LLM_API_KEY: 'sk-test' })).toEqual({
      provider: 'anthropic',
      apiKey: 'sk-test',
    });
  });
});

describe('llmChatFromEnv', () => {
  it('returns undefined with no key set', () => {
    expect(llmChatFromEnv({})).toBeUndefined();
  });

  it('returns an LlmChat when a valid key is set', () => {
    const chat = llmChatFromEnv({ SKIL_LLM_PROVIDER: 'openai', SKIL_LLM_API_KEY: 'sk-test' });
    expect(chat).toBeDefined();
  });
});
