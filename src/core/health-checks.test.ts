import { describe, expect, it } from 'vitest';
import { computeLlmFindings, computeSkillFindings, estimateTokens, parseDescription } from './health-checks.js';
import { isErr, isOk, ok, err } from './result.js';
import type { LlmChat } from '../llm/llm-chat.js';

function fakeLlmChat(response: string): LlmChat {
  return { complete: async () => ok(response) };
}

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

describe('computeLlmFindings', () => {
  const skills = [
    { skillId: 'tdd', description: 'Use for test-driven development.', body: '# tdd\n' },
    { skillId: 'testing/refactor', description: 'Use for refactoring code under test.', body: '# refactor\n' },
  ];

  it('returns no findings without calling the LLM when there are no filed skills', async () => {
    const chat: LlmChat = { complete: async () => err(new Error('should not be called')) };

    const result = await computeLlmFindings([], chat);

    expect(isOk(result) && result.value).toEqual([]);
  });

  it('returns empty conflicts/vague as no findings', async () => {
    const chat = fakeLlmChat(JSON.stringify({ conflicts: [], vague: [] }));

    const result = await computeLlmFindings(skills, chat);

    expect(isOk(result) && result.value).toEqual([]);
  });

  it('turns a conflict pair into one finding per skill', async () => {
    const chat = fakeLlmChat(
      JSON.stringify({ conflicts: [{ a: 'tdd', b: 'testing/refactor', why: 'both claim to own the test loop' }], vague: [] })
    );

    const result = await computeLlmFindings(skills, chat);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual([
        { type: 'conflict', skillId: 'tdd', message: expect.stringContaining('testing/refactor') },
        { type: 'conflict', skillId: 'testing/refactor', message: expect.stringContaining('tdd') },
      ]);
    }
  });

  it('turns a vague entry into one finding', async () => {
    const chat = fakeLlmChat(JSON.stringify({ conflicts: [], vague: [{ id: 'tdd', why: 'description is too generic' }] }));

    const result = await computeLlmFindings(skills, chat);

    expect(isOk(result) && result.value).toEqual([{ type: 'vague-trigger', skillId: 'tdd', message: 'description is too generic' }]);
  });

  it('drops rows referencing an id that was not in the input', async () => {
    const chat = fakeLlmChat(
      JSON.stringify({ conflicts: [{ a: 'tdd', b: 'not-filed', why: 'x' }], vague: [{ id: 'not-filed', why: 'x' }] })
    );

    const result = await computeLlmFindings(skills, chat);

    expect(isOk(result) && result.value).toEqual([]);
  });

  it('returns no findings, not a crash, on non-JSON output', async () => {
    const chat = fakeLlmChat('not json');

    const result = await computeLlmFindings(skills, chat);

    expect(isOk(result) && result.value).toEqual([]);
  });

  it('propagates an LLM call failure as an Err', async () => {
    const chat: LlmChat = { complete: async () => err(new Error('LlmChat: openai rejected the API key (401).')) };

    const result = await computeLlmFindings(skills, chat);

    expect(isErr(result)).toBe(true);
  });
});
