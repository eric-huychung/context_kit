import { createLlmChat, type LlmChat, type LlmProvider } from './llm-chat.js';

const VALID_PROVIDERS: readonly LlmProvider[] = ['anthropic', 'openai', 'openrouter'];

export interface LlmSettingsData {
  provider: LlmProvider;
  apiKey: string;
}

/**
 * CLI's `LlmSettings`: `SKIL_LLM_PROVIDER` + `SKIL_LLM_API_KEY` env vars,
 * nothing persisted. Missing either var, or an unrecognized provider,
 * is `undefined` — never a crash, and `health()` reads as Phase 1.
 */
export function loadLlmSettingsFromEnv(env: NodeJS.ProcessEnv = process.env): LlmSettingsData | undefined {
  const provider = env['SKIL_LLM_PROVIDER'];
  const apiKey = env['SKIL_LLM_API_KEY'];
  if (!provider || !apiKey) {
    return undefined;
  }
  if (!VALID_PROVIDERS.includes(provider as LlmProvider)) {
    return undefined;
  }
  return { provider: provider as LlmProvider, apiKey };
}

/** Builds the CLI's `LlmChat` straight from env, or `undefined` with no key set. */
export function llmChatFromEnv(env: NodeJS.ProcessEnv = process.env, fetchImpl: typeof fetch = fetch): LlmChat | undefined {
  const settings = loadLlmSettingsFromEnv(env);
  return settings ? createLlmChat(settings.provider, settings.apiKey, fetchImpl) : undefined;
}
