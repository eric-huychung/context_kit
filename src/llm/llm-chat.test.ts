import { describe, expect, it, vi } from 'vitest';
import { isErr, isOk } from '../core/result.js';
import { createLlmChat, pingLlmChat } from './llm-chat.js';

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

describe('HttpLlmChat', () => {
  it('posts to the openai preset base url with the bearer key', async () => {
    const fetchImpl = fakeFetch(200, { choices: [{ message: { content: 'hello' } }] });
    const chat = createLlmChat('openai', 'sk-test', fetchImpl as unknown as typeof fetch);

    const result = await chat.complete({ system: 'sys', user: 'usr' });

    expect(isOk(result) && result.value).toBe('hello');
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer sk-test');
    const posted = JSON.parse(String(init.body)) as { model: string; messages: unknown[] };
    expect(posted.model).toBe('gpt-4.1-nano');
    expect(posted.messages).toEqual([
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'usr' },
    ]);
    expect((init as { signal?: AbortSignal }).signal).toBeInstanceOf(AbortSignal);
  });

  it('posts to the anthropic preset base url', async () => {
    const fetchImpl = fakeFetch(200, { choices: [{ message: { content: 'hi' } }] });
    const chat = createLlmChat('anthropic', 'key', fetchImpl as unknown as typeof fetch);

    await chat.complete({ system: 'sys', user: 'usr' });

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.anthropic.com/v1/chat/completions');
    expect(JSON.parse(String(init.body)).model).toBe('claude-haiku-4-5');
  });

  it('posts to the openrouter preset base url', async () => {
    const fetchImpl = fakeFetch(200, { choices: [{ message: { content: 'hi' } }] });
    const chat = createLlmChat('openrouter', 'key', fetchImpl as unknown as typeof fetch);

    await chat.complete({ system: 'sys', user: 'usr' });

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(JSON.parse(String(init.body)).model).toBe('openai/gpt-4.1-nano');
  });

  it('fails clearly on a bad key (401)', async () => {
    const fetchImpl = fakeFetch(401, { error: 'unauthorized' });
    const chat = createLlmChat('openai', 'bad-key', fetchImpl as unknown as typeof fetch);

    const result = await chat.complete({ system: 'sys', user: 'usr' });

    expect(isErr(result)).toBe(true);
    expect(isErr(result) && result.error.message).toMatch(/rejected the API key/);
  });

  it('fails on a 5xx with a generic message', async () => {
    const fetchImpl = fakeFetch(500, {});
    const chat = createLlmChat('openai', 'key', fetchImpl as unknown as typeof fetch);

    const result = await chat.complete({ system: 'sys', user: 'usr' });

    expect(isErr(result)).toBe(true);
    expect(isErr(result) && result.error.message).toMatch(/returned 500/);
  });

  it('fails clearly on a 429 without retrying', async () => {
    const fetchImpl = fakeFetch(429, {});
    const chat = createLlmChat('openai', 'key', fetchImpl as unknown as typeof fetch);

    const result = await chat.complete({ system: 'sys', user: 'usr' });

    expect(isErr(result) && result.error.message).toMatch(/rate-limited/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('times out a hanging request', async () => {
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const abortError = new Error('aborted');
          abortError.name = 'AbortError';
          reject(abortError);
        });
      });
    });
    const chat = createLlmChat('openai', 'key', fetchImpl as unknown as typeof fetch, 20);

    const result = await chat.complete({ system: 'sys', user: 'usr' });

    expect(isErr(result) && result.error.message).toMatch(/timed out/);
  });

  it('fails when fetch throws (network error)', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const chat = createLlmChat('openai', 'key', fetchImpl as unknown as typeof fetch);

    const result = await chat.complete({ system: 'sys', user: 'usr' });

    expect(isErr(result)).toBe(true);
  });

  it('fails when the response has no message content', async () => {
    const fetchImpl = fakeFetch(200, { choices: [] });
    const chat = createLlmChat('openai', 'key', fetchImpl as unknown as typeof fetch);

    const result = await chat.complete({ system: 'sys', user: 'usr' });

    expect(isErr(result)).toBe(true);
  });
});

describe('pingLlmChat', () => {
  it('succeeds on a valid key', async () => {
    const fetchImpl = fakeFetch(200, { choices: [{ message: { content: 'pong' } }] });
    const chat = createLlmChat('openai', 'sk-good', fetchImpl as unknown as typeof fetch);

    const result = await pingLlmChat(chat);

    expect(isOk(result)).toBe(true);
  });

  it('fails clearly on a bad key', async () => {
    const fetchImpl = fakeFetch(401, {});
    const chat = createLlmChat('openai', 'sk-bad', fetchImpl as unknown as typeof fetch);

    const result = await pingLlmChat(chat);

    expect(isErr(result)).toBe(true);
    expect(isErr(result) && result.error.message).toMatch(/rejected the API key/);
  });
});
