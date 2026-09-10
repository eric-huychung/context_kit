import { describe, expect, it } from 'vitest';
import {
  activeFindings,
  commandsForSkill,
  estimateTokensFromMarkdown,
  findingIgnoreKey,
  findingsForSkill,
  flaggedIdsFromHealth,
  formatTokenCount,
  isLlmFinding,
} from './skill-health';
import type { HealthReport } from '../../../shared/ipc';

const REPORT: HealthReport = [
  {
    name: 'build',
    tokenEstimate: 40,
    warnCount: 2,
    usedLlm: false,
    findings: [
      { type: 'unused', skillId: 'tdd', message: 'No recorded reads' },
      { type: 'secret', skillId: 'tdd', message: 'looks like a key' },
    ],
  },
  {
    name: 'review',
    tokenEstimate: 10,
    warnCount: 1,
    usedLlm: true,
    findings: [{ type: 'conflict', skillId: 'ui', message: 'Overlaps with tdd' }],
  },
];

describe('findingsForSkill', () => {
  it('keeps the command name on each finding so preview can show the tie', () => {
    expect(findingsForSkill(REPORT, 'tdd')).toEqual([
      { type: 'unused', skillId: 'tdd', message: 'No recorded reads', commandName: 'build' },
      { type: 'secret', skillId: 'tdd', message: 'looks like a key', commandName: 'build' },
    ]);
  });

  it('returns empty when the skill is not named in any command health row', () => {
    expect(findingsForSkill(REPORT, 'missing')).toEqual([]);
  });
});

describe('commandsForSkill', () => {
  it('lists every command the skill is filed on', () => {
    expect(
      commandsForSkill(
        [
          { name: 'build', skills: ['tdd', 'ui'] },
          { name: 'review', skills: ['tdd'] },
          { name: 'plan', skills: ['ui'] },
        ],
        'tdd'
      )
    ).toEqual(['build', 'review']);
  });
});

describe('flaggedIdsFromHealth', () => {
  it('unions skill ids across commands', () => {
    expect(flaggedIdsFromHealth(REPORT)).toEqual(new Set(['tdd', 'ui']));
  });
});

describe('estimateTokensFromMarkdown', () => {
  it('uses the frontmatter description, same as doctor idle-cost', () => {
    expect(estimateTokensFromMarkdown('---\ndescription: abcd\n---\n# body\n', 'fallback')).toBe(1);
  });

  it('falls back to the id when description is missing', () => {
    expect(estimateTokensFromMarkdown('# just a body\n', 'tdd')).toBe(1);
  });
});

describe('formatTokenCount', () => {
  it('writes the full word and pluralizes', () => {
    expect(formatTokenCount(1)).toBe('1 token');
    expect(formatTokenCount(12)).toBe('12 tokens');
  });
});

describe('isLlmFinding', () => {
  it('marks conflict and vague-trigger as the keyed slice', () => {
    expect(isLlmFinding('conflict')).toBe(true);
    expect(isLlmFinding('vague-trigger')).toBe(true);
    expect(isLlmFinding('unused')).toBe(false);
    expect(isLlmFinding('secret')).toBe(false);
  });
});

describe('findingIgnoreKey', () => {
  it('keys a finding by skill and type', () => {
    expect(findingIgnoreKey({ skillId: 'tdd', type: 'unused' })).toBe('tdd:unused');
  });
});

describe('activeFindings', () => {
  it('drops ignored skill+type pairs', () => {
    expect(
      activeFindings(
        [
          { type: 'unused', skillId: 'tdd', message: 'No recorded reads' },
          { type: 'secret', skillId: 'tdd', message: 'looks like a key' },
        ],
        new Set(['tdd:unused'])
      )
    ).toEqual([{ type: 'secret', skillId: 'tdd', message: 'looks like a key' }]);
  });
});
