import { describe, expect, it, vi } from 'vitest';
import { CollectionEngine } from '../../core/collection-engine.js';
import { InMemoryFileSystemAdapter } from '../../adapters/in-memory-fs.js';
import { InMemorySkillsAdapter } from '../../adapters/in-memory-skills.js';
import { createProgram } from '../program.js';
import { runSkillsList } from './skills.js';

function buildEngine(): { engine: CollectionEngine; fs: InMemoryFileSystemAdapter } {
  const fs = new InMemoryFileSystemAdapter();
  const engine = new CollectionEngine(fs, new InMemorySkillsAdapter());
  return { engine, fs };
}

describe('runSkillsList', () => {
  it('shows a friendly message when the catalog is empty', () => {
    const { engine } = buildEngine();

    const outcome = runSkillsList(engine);

    expect(outcome.isError).toBe(false);
    expect(outcome.message).toBe('No skills yet');
  });

  it('lists on, off, and leftover rows from the in-memory catalog', () => {
    const { engine, fs } = buildEngine();
    fs.writeFile('.agents/skills/tdd/SKILL.md', '# tdd\n');
    fs.writeFile('.claude/skills/tdd/SKILL.md', '# tdd\n');
    fs.writeFile('.skil/parked/skills/design/SKILL.md', '# design\n');
    fs.writeFile('.cursor/skills/react/SKILL.md', '# react\n');
    engine.scan();

    const outcome = runSkillsList(engine);

    expect(outcome.isError).toBe(false);
    expect(outcome.message).toContain('tdd');
    expect(outcome.message).toContain('design');
    expect(outcome.message).toContain('react');
    expect(outcome.message).toContain('local');
    expect(outcome.message).toContain('on');
    expect(outcome.message).toContain('off');
    expect(outcome.message).toContain('leftover');
    expect(outcome.message).toContain('.agents/skills/tdd');
    expect(outcome.message).toContain('.skil/parked/skills/design');
    expect(outcome.message).toContain('.cursor/skills/react');
  });
});

describe('registerSkillsCommand', () => {
  it('lists skills from the CLI entrypoint', async () => {
    const { engine, fs } = buildEngine();
    fs.writeFile('.agents/skills/tdd/SKILL.md', '# tdd\n');
    fs.writeFile('.claude/skills/tdd/SKILL.md', '# tdd\n');
    engine.scan();
    const program = createProgram(engine);
    program.exitOverride();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await program.parseAsync(['skills'], { from: 'user' });

    expect(log.mock.calls.flat().join('\n')).toContain('tdd');
    log.mockRestore();
  });
});
