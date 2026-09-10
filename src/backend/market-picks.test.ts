import { describe, expect, it } from 'vitest';
import { editorialPickIds, loadMarketPicks, parseMarketPicks } from './market-picks.js';

const FIXTURE = `
updatedAt: 2026-01-01
picks:
  agent:
    - mattpocock/skills/grill-me
  swe:
    - mattpocock/skills/tdd
  ui-ux: []
  pm: []
  data: []
  other: []
`;

describe('parseMarketPicks', () => {
  it('parses a valid fixture', () => {
    const picks = parseMarketPicks(FIXTURE);
    expect(picks.updatedAt).toBe('2026-01-01');
    expect(picks.picks.agent).toEqual(['mattpocock/skills/grill-me']);
    expect(picks.picks.swe).toEqual(['mattpocock/skills/tdd']);
    expect(picks.picks.data).toEqual([]);
  });

  it('rejects a missing updatedAt', () => {
    expect(() => parseMarketPicks('picks: {}')).toThrow(/updatedAt/);
  });
});

describe('loadMarketPicks', () => {
  it('loads the committed repo file with all six roles', () => {
    const picks = loadMarketPicks();
    expect(picks.updatedAt.length).toBeGreaterThan(0);
    expect(picks.picks.swe.length).toBeGreaterThan(0);
    expect(picks.picks.pm.length).toBeGreaterThan(0);
    expect(editorialPickIds(picks, 'swe')[0]).toBe('mattpocock/skills/improve-codebase-architecture');
  });
});
