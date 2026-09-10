import { describe, expect, it } from 'vitest';
import { syncBannerText } from './SyncCleanupModal';
import type { SyncAudit, SyncRow } from '../../../shared/ipc';

function audit(rows: Partial<SyncRow>[]): SyncAudit {
  const full = rows.map((row, i) => ({
    kind: 'skill' as const,
    id: row.id ?? `id-${i}`,
    path: row.path ?? `.cursor/skills/${row.id ?? `id-${i}`}`,
    status: row.status ?? 'needs-import',
    hashHere: row.hashHere ?? 'aaa',
    ...row,
  }));
  return {
    rows: full,
    needsImportCount: full.filter((row) => row.status === 'needs-import').length,
    readyCount: full.filter((row) => row.status === 'ready-to-remove').length,
    driftCount: full.filter((row) => row.status === 'drift').length,
  };
}

describe('syncBannerText', () => {
  it('names leftover copies without jargon', () => {
    expect(syncBannerText(audit([{ status: 'needs-import' }]))).toBe('1 leftover');
    expect(
      syncBannerText(audit([{ status: 'needs-import' }, { status: 'ready-to-remove' }]))
    ).toBe('2 leftovers');
  });

  it('says conflict when every leftover is a conflict', () => {
    expect(syncBannerText(audit([{ status: 'drift' }]))).toBe('1 conflict');
    expect(syncBannerText(audit([{ status: 'drift' }, { status: 'drift' }]))).toBe('2 conflicts');
  });

  it('joins leftover and conflict counts when mixed', () => {
    expect(
      syncBannerText(
        audit([
          { status: 'needs-import' },
          { status: 'ready-to-remove' },
          { status: 'drift' },
          { status: 'drift' },
        ])
      )
    ).toBe('4 leftovers · 2 conflicts');
  });
});
