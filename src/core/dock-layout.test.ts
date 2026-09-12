import { describe, expect, it } from 'vitest';
import {
  COMMAND_DIR_BY_IDE,
  deprecatedPathFor,
  isCanonicalHomePath,
  isDeprecatedPath,
  isLiveSkillPath,
  isParkedPath,
  isSafeCatalogId,
  liveSkillPaths,
  parkedCommandPath,
  parkedRulePath,
  parkedSkillPath,
  skillPathState,
  SKILL_ROOTS,
  SKILL_ROOT_BY_IDE,
  SKILL_SOURCE_BY_IDE,
  watchRoots,
} from './dock-layout.js';
import { GLOB_RULE_DIRS } from './project-rules.js';

describe('watchRoots', () => {
  it('covers every skill root and command dir the engine uses', () => {
    const globRuleDirs = Object.keys(GLOB_RULE_DIRS);
    const roots = watchRoots(globRuleDirs);

    for (const root of SKILL_ROOTS) {
      expect(roots).toContain(root);
    }
    for (const dir of Object.values(COMMAND_DIR_BY_IDE)) {
      expect(roots).toContain(dir);
    }
    for (const dir of globRuleDirs) {
      expect(roots).toContain(dir);
    }
  });

  it('derives Sync source folders from skill roots', () => {
    for (const [ide, root] of Object.entries(SKILL_ROOT_BY_IDE)) {
      expect(root.startsWith(`${SKILL_SOURCE_BY_IDE[ide as keyof typeof SKILL_SOURCE_BY_IDE]}/`)).toBe(true);
    }
  });
});

describe('isSafeCatalogId', () => {
  it('allows nested market and command ids', () => {
    expect(isSafeCatalogId('tdd')).toBe(true);
    expect(isSafeCatalogId('obra/react-patterns')).toBe(true);
    expect(isSafeCatalogId('build/ui/brand')).toBe(true);
    expect(isSafeCatalogId('pair-programming/behavior')).toBe(true);
  });

  it('rejects path escapes and empty segments', () => {
    expect(isSafeCatalogId('')).toBe(false);
    expect(isSafeCatalogId('../evil')).toBe(false);
    expect(isSafeCatalogId('foo/../bar')).toBe(false);
    expect(isSafeCatalogId('/etc/passwd')).toBe(false);
    expect(isSafeCatalogId('foo\\bar')).toBe(false);
    expect(isSafeCatalogId('foo//bar')).toBe(false);
    expect(isSafeCatalogId('.')).toBe(false);
    expect(isSafeCatalogId('..')).toBe(false);
  });
});

describe('live/parked/deprecated path helpers', () => {
  it('live write targets are only .agents/skills/<id> and .claude/skills/<id>', () => {
    expect(liveSkillPaths('tdd')).toEqual(['.agents/skills/tdd', '.claude/skills/tdd']);
  });

  it('classifies live paths and nothing else as live', () => {
    expect(isLiveSkillPath('.agents/skills/tdd')).toBe(true);
    expect(isLiveSkillPath('.claude/skills/tdd')).toBe(true);
    expect(isLiveSkillPath('.cursor/skills/tdd')).toBe(false);
    expect(isLiveSkillPath('.skil/parked/skills/tdd')).toBe(false);
  });

  it('parked skill/command/rule paths are under .skil/parked/…', () => {
    expect(parkedSkillPath('tdd')).toBe('.skil/parked/skills/tdd');
    expect(parkedCommandPath('build')).toBe('.skil/parked/commands/build');
    expect(parkedRulePath('pair-programming/behavior')).toBe('.skil/parked/rules/pair-programming/behavior');
    for (const path of [
      parkedSkillPath('tdd'),
      parkedCommandPath('build'),
      parkedRulePath('behavior'),
    ]) {
      expect(isParkedPath(path)).toBe(true);
    }
  });

  it('deprecated paths keep the original relative path under .skil/deprecated/', () => {
    expect(deprecatedPathFor('.cursor/skills/tdd')).toBe('.skil/deprecated/.cursor/skills/tdd');
    expect(isDeprecatedPath(deprecatedPathFor('.cursor/skills/tdd'))).toBe(true);
  });

  it('a leftover path is never classified as live or parked', () => {
    const leftover = '.cursor/skills/tdd';
    expect(isLiveSkillPath(leftover)).toBe(false);
    expect(isParkedPath(leftover)).toBe(false);
  });

  it('canonical homes are .agents, .claude, and AGENTS.md — leftover docks are not', () => {
    expect(isCanonicalHomePath('AGENTS.md')).toBe(true);
    expect(isCanonicalHomePath('.agents/skills/tdd')).toBe(true);
    expect(isCanonicalHomePath('.claude/commands/build.md')).toBe(true);
    expect(isCanonicalHomePath('.cursor/skills/tdd')).toBe(false);
    expect(isCanonicalHomePath('.codex/rules/behavior.md')).toBe(false);
  });

  it('skillPathState: on needs both live roots, off is parked-only, leftover is anything else', () => {
    expect(skillPathState(['.agents/skills/tdd', '.claude/skills/tdd'])).toBe('on');
    expect(skillPathState(['.agents/skills/tdd', '.claude/skills/tdd', '.cursor/skills/tdd'])).toBe('on');
    expect(skillPathState(['.skil/parked/skills/tdd'])).toBe('off');
    expect(skillPathState(['.cursor/skills/tdd'])).toBe('leftover');
    expect(skillPathState([])).toBe('none');
  });
});
