import { describe, expect, it } from 'vitest';
import { computeSkillFindings, estimateTokens, parseDescription } from './health-checks.js';

describe('parseDescription', () => {
  it('reads the description field out of frontmatter', () => {
    const contents = '---\nname: tdd\ndescription: Use for test-driven development.\n---\n# Body\n';
    expect(parseDescription(contents)).toBe('Use for test-driven development.');
  });

  it('returns empty string when there is no frontmatter', () => {
    expect(parseDescription('# Just a body\n')).toBe('');
  });

  it('returns empty string on malformed frontmatter instead of throwing', () => {
    const contents = '---\n: not: valid: yaml: [\n---\n# Body\n';
    expect(() => parseDescription(contents)).not.toThrow();
    expect(parseDescription(contents)).toBe('');
  });
});

describe('estimateTokens', () => {
  it('is roughly chars / 4', () => {
    expect(estimateTokens('a'.repeat(400))).toBe(100);
  });
});

describe('computeSkillFindings', () => {
  const base = {
    skillId: 'tdd',
    description: 'short',
    body: '# tdd\nshort body\n',
    usageCount: 1,
    diskHashes: new Set(['abc']),
  };

  it('returns no findings for a small, used, single-copy, secret-free skill', () => {
    expect(computeSkillFindings(base)).toEqual([]);
  });

  it('flags idle-cost when the description is long', () => {
    const findings = computeSkillFindings({ ...base, description: 'x'.repeat(500) });
    expect(findings).toContainEqual(expect.objectContaining({ type: 'idle-cost', skillId: 'tdd' }));
  });

  it('flags fat-body when the body exceeds the line cap', () => {
    const body = `# tdd\n${Array.from({ length: 400 }, () => 'line').join('\n')}`;
    const findings = computeSkillFindings({ ...base, body });
    expect(findings).toContainEqual(expect.objectContaining({ type: 'fat-body', skillId: 'tdd' }));
  });

  it('flags unused when usage count is 0', () => {
    const findings = computeSkillFindings({ ...base, usageCount: 0 });
    expect(findings).toContainEqual(expect.objectContaining({ type: 'unused', skillId: 'tdd' }));
  });

  it('flags hash-split when disk copies disagree', () => {
    const findings = computeSkillFindings({ ...base, diskHashes: new Set(['abc', 'def']) });
    expect(findings).toContainEqual(expect.objectContaining({ type: 'hash-split', skillId: 'tdd' }));
  });

  it('flags an obvious secret-shaped fixture', () => {
    const findings = computeSkillFindings({ ...base, body: 'key: sk-abcdefghijklmnopqrstuvwx' });
    expect(findings).toContainEqual(expect.objectContaining({ type: 'secret', skillId: 'tdd' }));
  });

  it('does not flag ordinary prose as a secret', () => {
    const findings = computeSkillFindings({ ...base, body: 'This skill helps you skip flaky tests.' });
    expect(findings.some((finding) => finding.type === 'secret')).toBe(false);
  });
});
