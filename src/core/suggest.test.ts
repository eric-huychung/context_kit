import { describe, expect, it } from 'vitest';
import { err, isErr, isOk, ok } from './result.js';
import { flattenShelfSkills, parsePackageDeps, rankByFingerprint, rerankWithLlm } from './suggest.js';
import type { LlmChat } from '../llm/llm-chat.js';
import type { ShelfRole } from '../backend/market-types.js';

const SHELVES: ShelfRole[] = [
  {
    slug: 'swe',
    label: 'SWE',
    fields: [
      {
        slug: 'frontend',
        label: 'Frontend',
        skills: [
          { id: 'obra/react-patterns', name: 'React patterns', installs: 1200, rank: 1 },
          { id: 'vercel-labs/nextjs-guide', name: 'Next.js guide', installs: 500, rank: 2 },
        ],
      },
      {
        slug: 'backend',
        label: 'Backend',
        skills: [{ id: 'obra/react-patterns', name: 'React patterns', installs: 1200, rank: 1 }],
      },
    ],
  },
  {
    slug: 'pm',
    label: 'PM',
    fields: [{ slug: 'roadmap', label: 'Roadmap', skills: [{ id: 'some/roadmap-skill', name: 'Roadmap tips', installs: 10, rank: 1 }] }],
  },
];

describe('parsePackageDeps', () => {
  it('reads dependency and devDependency names', () => {
    const pkg = JSON.stringify({ dependencies: { react: '^18.0.0' }, devDependencies: { vitest: '^2.0.0' } });
    expect(parsePackageDeps(pkg).sort()).toEqual(['react', 'vitest']);
  });

  it('returns an empty list on malformed JSON instead of throwing', () => {
    expect(() => parsePackageDeps('not json')).not.toThrow();
    expect(parsePackageDeps('not json')).toEqual([]);
  });

  it('returns an empty list when both fields are missing', () => {
    expect(parsePackageDeps('{}')).toEqual([]);
  });
});

describe('flattenShelfSkills', () => {
  it('dedupes a skill that appears on more than one shelf', () => {
    const flat = flattenShelfSkills(SHELVES);
    expect(flat.filter((skill) => skill.id === 'obra/react-patterns')).toHaveLength(1);
    expect(flat.map((skill) => skill.id).sort()).toEqual(
      ['obra/react-patterns', 'some/roadmap-skill', 'vercel-labs/nextjs-guide'].sort()
    );
  });
});

describe('rankByFingerprint', () => {
  it('ranks a stack-matching skill above a non-matching one', () => {
    const ranked = rankByFingerprint(SHELVES, ['react'], new Set());
    expect(ranked[0]?.id).toBe('obra/react-patterns');
  });

  it('excludes ids already in the catalog', () => {
    const ranked = rankByFingerprint(SHELVES, ['react'], new Set(['obra/react-patterns']));
    expect(ranked.some((skill) => skill.id === 'obra/react-patterns')).toBe(false);
  });

  it('falls back to installs when no dependency matches', () => {
    const ranked = rankByFingerprint(SHELVES, [], new Set());
    expect(ranked[0]?.id).toBe('obra/react-patterns');
    expect(ranked.at(-1)?.id).toBe('some/roadmap-skill');
  });

  it('ignores short dependency fragments to avoid noisy matches', () => {
    const ranked = rankByFingerprint(SHELVES, ['fs'], new Set());
    // 'fs' is under the 3-char floor, so this should not out-rank installs order.
    expect(ranked[0]?.id).toBe('obra/react-patterns');
  });
});

describe('rerankWithLlm', () => {
  const candidates = flattenShelfSkills(SHELVES);

  it('returns an empty list without calling the LLM when there are no candidates', async () => {
    const chat: LlmChat = { complete: async () => err(new Error('should not be called')) };

    const result = await rerankWithLlm([], ['react'], chat);

    expect(isOk(result) && result.value).toEqual([]);
  });

  it('parses a valid ids response, keeping only known ids', async () => {
    const chat: LlmChat = {
      complete: async () => ok(JSON.stringify({ ids: ['obra/react-patterns', 'not-a-candidate'] })),
    };

    const result = await rerankWithLlm(candidates, ['react'], chat);

    expect(isOk(result) && result.value).toEqual(['obra/react-patterns']);
  });

  it('returns an empty list, not a crash, on non-JSON output', async () => {
    const chat: LlmChat = { complete: async () => ok('not json') };

    const result = await rerankWithLlm(candidates, ['react'], chat);

    expect(isOk(result) && result.value).toEqual([]);
  });

  it('propagates an LLM call failure as an Err', async () => {
    const chat: LlmChat = { complete: async () => err(new Error('LlmChat: openai rejected the API key (401).')) };

    const result = await rerankWithLlm(candidates, ['react'], chat);

    expect(isErr(result)).toBe(true);
  });
});
