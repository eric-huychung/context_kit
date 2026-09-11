import { describe, expect, it, vi } from 'vitest';
import { err, isErr, isOk, ok } from '../core/result.js';
import { AUTH_COOLDOWN_MS, LlmCallCache, TRANSIENT_COOLDOWN_MS } from './llm-call-cache.js';

describe('LlmCallCache', () => {
  it('returns the first success on a later call with the same key and does not recompute', async () => {
    const cache = new LlmCallCache();
    const compute = vi.fn(async () => ok('findings'));

    expect(isOk(await cache.run('k', compute)) && (await cache.run('k', compute)).ok).toBe(true);
    const second = await cache.run('k', compute);

    expect(isOk(second) && second.value).toBe('findings');
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent runs of the same key into one compute', async () => {
    const cache = new LlmCallCache();
    let releases!: (value: ReturnType<typeof ok<string>>) => void;
    const compute = vi.fn(
      () =>
        new Promise<ReturnType<typeof ok<string>>>((resolve) => {
          releases = resolve;
        })
    );

    const first = cache.run('k', compute);
    const second = cache.run('k', compute);
    releases(ok('once'));
    const [a, b] = await Promise.all([first, second]);

    expect(compute).toHaveBeenCalledTimes(1);
    expect(isOk(a) && a.value).toBe('once');
    expect(isOk(b) && b.value).toBe('once');
  });

  it('does not reuse a success for a different key', async () => {
    const cache = new LlmCallCache();
    const compute = vi.fn(async () => ok('x'));

    await cache.run('a', compute);
    await cache.run('b', compute);

    expect(compute).toHaveBeenCalledTimes(2);
  });

  it('does not recompute a 401 during the auth cooldown', async () => {
    let now = 1_000;
    const cache = new LlmCallCache(() => now);
    const compute = vi.fn(async () => err(new Error('LlmChat: openai rejected the API key (401).')));

    const first = await cache.run('k', compute);
    now += AUTH_COOLDOWN_MS - 1;
    const second = await cache.run('k', compute);

    expect(isErr(first)).toBe(true);
    expect(isErr(second)).toBe(true);
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('retries a 401 after the auth cooldown', async () => {
    let now = 1_000;
    const cache = new LlmCallCache(() => now);
    const compute = vi
      .fn()
      .mockResolvedValueOnce(err(new Error('LlmChat: openai rejected the API key (401).')))
      .mockResolvedValueOnce(ok('recovered'));

    await cache.run('k', compute);
    now += AUTH_COOLDOWN_MS;
    const retry = await cache.run('k', compute);

    expect(compute).toHaveBeenCalledTimes(2);
    expect(isOk(retry) && retry.value).toBe('recovered');
  });

  it('cools a timeout/5xx briefly, then retries', async () => {
    let now = 1_000;
    const cache = new LlmCallCache(() => now);
    const compute = vi
      .fn()
      .mockResolvedValueOnce(err(new Error('LlmChat: openai returned 500.')))
      .mockResolvedValueOnce(ok('ok'));

    await cache.run('k', compute);
    now += TRANSIENT_COOLDOWN_MS - 1;
    await cache.run('k', compute);
    expect(compute).toHaveBeenCalledTimes(1);

    now += 1;
    const retry = await cache.run('k', compute);
    expect(compute).toHaveBeenCalledTimes(2);
    expect(isOk(retry)).toBe(true);
  });

  it('turns a thrown compute into an Err instead of leaving inflight stuck', async () => {
    const cache = new LlmCallCache();
    const compute = vi.fn(async () => {
      throw new Error('boom');
    });

    const first = await cache.run('k', compute);
    const second = await cache.run('k', compute);

    expect(isErr(first) && first.error.message).toBe('boom');
    expect(compute).toHaveBeenCalledTimes(1);
    expect(isErr(second)).toBe(true);
  });
});
