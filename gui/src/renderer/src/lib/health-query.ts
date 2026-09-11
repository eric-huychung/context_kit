import type { HealthReport, SkilBridge } from '../../../shared/ipc';

/**
 * Skills, Commands, and Rules all need the same doctor report. One
 * in-flight IPC + a cached result so tab switches don't re-run
 * usage/LLM. Mutations and scans call `invalidateHealth` first.
 */
let generation = 0;
let cached: { generation: number; report: HealthReport } | null = null;
let inflight: Promise<HealthReport> | null = null;

export function invalidateHealth(): void {
  generation += 1;
  cached = null;
  inflight = null;
}

export async function loadHealth(
  bridge: Pick<SkilBridge, 'health'>,
  force = false
): Promise<HealthReport> {
  if (force) invalidateHealth();
  if (cached && cached.generation === generation) {
    return cached.report;
  }
  if (inflight) return inflight;

  const current = generation;
  const request = bridge
    .health()
    .then((result) => {
      const report: HealthReport = result.ok ? result.value : [];
      if (current === generation) {
        cached = { generation: current, report };
      }
      return report;
    })
    .catch(() => {
      const report: HealthReport = [];
      if (current === generation) {
        cached = { generation: current, report };
      }
      return report;
    });
  inflight = request;
  void request.finally(() => {
    if (inflight === request) inflight = null;
  });
  return request;
}
