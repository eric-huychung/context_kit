import { err, isOk, type Result } from '../core/result.js';

/** Bad key — do not keep posting until the engine (and this cache) is rebuilt on save. */
export const AUTH_COOLDOWN_MS = 10 * 60 * 1000;
/** 429 / 5xx / timeout / network — short pause, then one retry is allowed. */
export const TRANSIENT_COOLDOWN_MS = 30 * 1000;

function cooldownMsFor(error: Error): number {
  if (/rejected the API key|\b401\b|\b403\b/.test(error.message)) {
    return AUTH_COOLDOWN_MS;
  }
  return TRANSIENT_COOLDOWN_MS;
}

interface CacheEntry<T> {
  result: Result<T>;
  until?: number;
}

/**
 * In-memory gate for doctor LLM calls. One engine instance is shared by
 * Skills, Commands, and Rules, so this is the shared cache: same input
 * hash hits, concurrent health() shares one in-flight POST, failures
 * cool down instead of retrying on every tab switch / scan.
 */
export class LlmCallCache {
  private readonly entries = new Map<string, CacheEntry<unknown>>();
  private readonly inflight = new Map<string, Promise<Result<unknown>>>();

  constructor(private readonly now: () => number = Date.now) {}

  async run<T>(key: string, compute: () => Promise<Result<T>>): Promise<Result<T>> {
    const cached = this.entries.get(key) as CacheEntry<T> | undefined;
    if (cached) {
      if (isOk(cached.result)) {
        return cached.result;
      }
      if (cached.until != null && this.now() < cached.until) {
        return cached.result;
      }
      this.entries.delete(key);
    }

    const pending = this.inflight.get(key) as Promise<Result<T>> | undefined;
    if (pending) {
      return pending;
    }

    const promise = this.computeAndStore(key, compute);
    this.inflight.set(key, promise as Promise<Result<unknown>>);
    try {
      return await promise;
    } finally {
      this.inflight.delete(key);
    }
  }

  private async computeAndStore<T>(key: string, compute: () => Promise<Result<T>>): Promise<Result<T>> {
    let result: Result<T>;
    try {
      result = await compute();
    } catch (error) {
      result = err(error instanceof Error ? error : new Error(String(error)));
    }

    if (isOk(result)) {
      this.entries.set(key, { result });
    } else {
      this.entries.set(key, { result, until: this.now() + cooldownMsFor(result.error) });
    }
    return result;
  }
}
