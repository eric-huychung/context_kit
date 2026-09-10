import { describe, expect, it } from 'vitest';
import { CollectionEngine } from '../../core/collection-engine.js';
import { InMemoryFileSystemAdapter } from '../../adapters/in-memory-fs.js';
import { InMemorySkillsAdapter } from '../../adapters/in-memory-skills.js';
import { createProgram } from '../program.js';
import { runDoctor } from './doctor.js';

function buildEngine(): CollectionEngine {
  const fs = new InMemoryFileSystemAdapter();
  fs.writeFile('.cursor/skills/tdd/SKILL.md', '# tdd\nkey: sk-abcdefghijklmnopqrstuvwx\n');
  const engine = new CollectionEngine(fs, new InMemorySkillsAdapter());
  engine.scan();
  return engine;
}

describe('runDoctor', () => {
  it('prints a table of every command with no key required', async () => {
    const engine = buildEngine();
    engine.create('build', ['tdd']);

    const outcome = await runDoctor(engine);

    expect(outcome.isError).toBe(false);
    expect(outcome.message).toContain('build');
  });

  it('prints a friendly empty message when there are no commands', async () => {
    const outcome = await runDoctor(buildEngine());

    expect(outcome.isError).toBe(false);
    expect(outcome.message).toMatch(/no commands/i);
  });

  it('prints findings with a one-line why for a named command', async () => {
    const engine = buildEngine();
    engine.create('build', ['tdd']);

    const outcome = await runDoctor(engine, 'build');

    expect(outcome.isError).toBe(false);
    expect(outcome.message).toContain('secret');
    expect(outcome.message).toContain('tdd');
  });

  it('accepts a leading slash the same as the bare name', async () => {
    const engine = buildEngine();
    engine.create('build', ['tdd']);

    const outcome = await runDoctor(engine, '/build');

    expect(outcome.isError).toBe(false);
    expect(outcome.message).toContain('tdd');
  });

  it('errors clearly on an unknown command name instead of a stack trace', async () => {
    const outcome = await runDoctor(buildEngine(), 'nope');

    expect(outcome.isError).toBe(true);
    expect(outcome.message).toContain("'nope' not found");
  });

  it('reports no findings for a clean command', async () => {
    const engine = buildEngine();
    engine.create('empty', []);

    const outcome = await runDoctor(engine, 'empty');

    expect(outcome.isError).toBe(false);
    expect(outcome.message).toMatch(/no findings/i);
  });
});

describe('registerDoctorCommand', () => {
  it('registers doctor on the program', () => {
    const program = createProgram(buildEngine());
    expect(program.commands.some((command) => command.name() === 'doctor')).toBe(true);
  });
});
