import { describe, expect, it, vi } from 'vitest';
import { ok } from '../../../../../src/core/result.js';
import { invalidateHealth, loadHealth } from './health-query';
import type { HealthReport } from '../../../shared/ipc';

const EMPTY: HealthReport = [];
const BUILD: HealthReport = [
  { name: 'build', tokenEstimate: 1, warnCount: 0, usedLlm: false, findings: [] },
];

describe('loadHealth', () => {
  it('coalesces overlapping calls into one health() IPC', async () => {
    invalidateHealth();
    let releases!: (value: ReturnType<typeof ok<HealthReport>>) => void;
    const health = vi.fn(
      () =>
        new Promise<ReturnType<typeof ok<HealthReport>>>((resolve) => {
          releases = resolve;
        })
    );

    const first = loadHealth({ health });
    const second = loadHealth({ health });
    await vi.waitFor(() => {
      expect(typeof releases).toBe('function');
    });
    releases(ok(BUILD));
    await expect(Promise.all([first, second])).resolves.toEqual([BUILD, BUILD]);
    expect(health).toHaveBeenCalledTimes(1);
  });

  it('reuses the cached report so Skills/Commands/Rules do not each pay LLM', async () => {
    invalidateHealth();
    const health = vi.fn(async () => ok(BUILD));

    await expect(loadHealth({ health })).resolves.toEqual(BUILD);
    await expect(loadHealth({ health })).resolves.toEqual(BUILD);
    expect(health).toHaveBeenCalledTimes(1);
  });

  it('refetches after invalidate (scan / mutation)', async () => {
    invalidateHealth();
    const health = vi
      .fn()
      .mockResolvedValueOnce(ok(BUILD))
      .mockResolvedValueOnce(ok(EMPTY));

    await expect(loadHealth({ health })).resolves.toEqual(BUILD);
    invalidateHealth();
    await expect(loadHealth({ health })).resolves.toEqual(EMPTY);
    expect(health).toHaveBeenCalledTimes(2);
  });

  it('force skips the cache', async () => {
    invalidateHealth();
    const health = vi
      .fn()
      .mockResolvedValueOnce(ok(BUILD))
      .mockResolvedValueOnce(ok(EMPTY));

    await expect(loadHealth({ health })).resolves.toEqual(BUILD);
    await expect(loadHealth({ health }, true)).resolves.toEqual(EMPTY);
    expect(health).toHaveBeenCalledTimes(2);
  });

  it('degrades to an empty report when health() throws, so the list still paints', async () => {
    invalidateHealth();
    const health = vi.fn(async () => {
      throw new Error('No handler registered');
    });

    await expect(loadHealth({ health })).resolves.toEqual([]);
  });
});
