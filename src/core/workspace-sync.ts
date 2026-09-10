import { createHash } from 'node:crypto';
import type { IFileSystemAdapter } from '../interfaces/adapters.js';
import type { LeftoverRecord, SyncAudit, SyncRow } from '../types/index.js';
import { isCommandSkillStamp } from './command-file.js';
import { isCanonicalHomePath, isParkedPath, liveSkillPaths } from './dock-layout.js';
import { AGENTS_MD, leftoverRuleId, readRuleSection } from './project-rules.js';
import { isOk, err, ok, type Result } from './result.js';

/**
 * Classifies leftover paths into needs-import / ready-to-remove / drift.
 * Read-only — same shape as health-checks: engine walks disk, this decides.
 *
 * Canonical homes are `.agents/`, `.claude/`, and `AGENTS.md`. Parked and
 * already-canonical paths never appear as rows.
 */
export function buildSyncAudit(fs: IFileSystemAdapter, leftovers: LeftoverRecord[]): SyncAudit {
  const rows: SyncRow[] = [];
  for (const leftover of leftovers) {
    if (isParkedPath(leftover.path)) {
      continue;
    }
    // Skills/commands already in `.agents/` or `.claude/` are canonical.
    // Rule files under `.claude/rules` are glob copies — AGENTS.md is canonical.
    if (leftover.kind !== 'rule' && isCanonicalHomePath(leftover.path)) {
      continue;
    }
    const row =
      leftover.kind === 'skill'
        ? classifySkill(fs, leftover)
        : leftover.kind === 'command'
          ? classifyCommand(fs, leftover)
          : classifyRule(fs, leftover);
    if (row) {
      rows.push(row);
    }
  }
  rows.sort(compareSyncRows);
  return {
    rows,
    readyCount: rows.filter((row) => row.status === 'ready-to-remove').length,
    driftCount: rows.filter((row) => row.status === 'drift').length,
    needsImportCount: rows.filter((row) => row.status === 'needs-import').length,
  };
}

function classifySkill(fs: IFileSystemAdapter, leftover: LeftoverRecord): SyncRow | null {
  const hashHere = hashSkillFolder(fs, leftover.path);
  if (!hashHere) {
    return null;
  }
  const canonicalPath = firstLiveSkillFolder(fs, leftover.id);
  if (!canonicalPath) {
    return {
      kind: 'skill',
      id: leftover.id,
      path: leftover.path,
      status: 'needs-import',
      hashHere,
    };
  }
  const hashCanonical = hashSkillFolder(fs, canonicalPath);
  if (!hashCanonical) {
    return {
      kind: 'skill',
      id: leftover.id,
      path: leftover.path,
      status: 'needs-import',
      hashHere,
    };
  }
  return {
    kind: 'skill',
    id: leftover.id,
    path: leftover.path,
    canonicalPath,
    status: hashHere === hashCanonical ? 'ready-to-remove' : 'drift',
    hashHere,
    hashCanonical,
  };
}

function classifyCommand(fs: IFileSystemAdapter, leftover: LeftoverRecord): SyncRow | null {
  const contents = fs.readFile(leftover.path);
  if (!isOk(contents)) {
    return null;
  }
  const hashHere = sha256(contents.value);
  const canonicalPath = firstLiveSkillFolder(fs, leftover.id);
  if (!canonicalPath) {
    return {
      kind: 'command',
      id: leftover.id,
      path: leftover.path,
      status: 'needs-import',
      hashHere,
    };
  }
  const live = fs.readFile(`${canonicalPath}/SKILL.md`);
  if (!isOk(live)) {
    return {
      kind: 'command',
      id: leftover.id,
      path: leftover.path,
      status: 'needs-import',
      hashHere,
    };
  }
  // Stamped live command skills are the canonical copy; leftover dock
  // command files are extras even when generated_at (and thus hash) differs.
  // A live folder that is a real skill (not a command stamp) is a name
  // collision — surface as drift so it never goes through batch remove.
  if (isCommandSkillStamp(live.value)) {
    return {
      kind: 'command',
      id: leftover.id,
      path: leftover.path,
      canonicalPath,
      status: 'ready-to-remove',
      hashHere,
      hashCanonical: sha256(live.value),
    };
  }
  return {
    kind: 'command',
    id: leftover.id,
    path: leftover.path,
    canonicalPath,
    status: 'drift',
    hashHere,
    hashCanonical: sha256(live.value),
  };
}

function classifyRule(fs: IFileSystemAdapter, leftover: LeftoverRecord): SyncRow | null {
  const contents = fs.readFile(leftover.path);
  if (!isOk(contents)) {
    return null;
  }
  const hashHere = sha256(normalizeBody(contents.value));
  const ruleId = leftoverRuleId(leftover.path);
  const agents = fs.readFile(AGENTS_MD);
  const section = isOk(agents) ? readRuleSection(agents.value, ruleId) : null;
  if (section === null) {
    return {
      kind: 'rule',
      id: leftover.id,
      path: leftover.path,
      status: 'needs-import',
      hashHere,
    };
  }
  const hashCanonical = sha256(normalizeBody(section));
  return {
    kind: 'rule',
    id: leftover.id,
    path: leftover.path,
    canonicalPath: AGENTS_MD,
    status: hashHere === hashCanonical ? 'ready-to-remove' : 'drift',
    hashHere,
    hashCanonical,
  };
}

function firstLiveSkillFolder(fs: IFileSystemAdapter, id: string): string | undefined {
  return liveSkillPaths(id).find((path) => isOk(fs.readFile(`${path}/SKILL.md`)));
}

function hashSkillFolder(fs: IFileSystemAdapter, folder: string): string | undefined {
  const contents = fs.readFile(`${folder}/SKILL.md`);
  if (!isOk(contents)) {
    return undefined;
  }
  return sha256(contents.value);
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function normalizeBody(text: string): string {
  return text.replace(/\r\n/g, '\n').trim();
}

const STATUS_ORDER: Record<SyncRow['status'], number> = {
  'needs-import': 0,
  'ready-to-remove': 1,
  drift: 2,
};

function compareSyncRows(a: SyncRow, b: SyncRow): number {
  const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  if (byStatus !== 0) {
    return byStatus;
  }
  return a.path.localeCompare(b.path);
}

/** Leftover vs live bodies for a drift row. Other statuses are an error. */
export function readSyncBodies(
  fs: IFileSystemAdapter,
  row: SyncRow
): Result<{ leftoverBody: string; canonicalBody: string }> {
  if (row.status !== 'drift' || !row.canonicalPath) {
    return err(new Error(`No conflict at '${row.path}'.`));
  }
  const leftoverBody = readLeftoverBody(fs, row);
  if (!isOk(leftoverBody)) {
    return err(new Error(`Couldn't read '${row.path}'.`));
  }
  const canonicalBody = readCanonicalBody(fs, row);
  if (!isOk(canonicalBody)) {
    return err(new Error(`Couldn't read '${row.canonicalPath}'.`));
  }
  return ok({ leftoverBody: leftoverBody.value, canonicalBody: canonicalBody.value });
}

function readLeftoverBody(fs: IFileSystemAdapter, row: SyncRow): Result<string> {
  if (row.kind === 'skill') {
    return fs.readFile(`${row.path}/SKILL.md`);
  }
  return fs.readFile(row.path);
}

function readCanonicalBody(fs: IFileSystemAdapter, row: SyncRow): Result<string> {
  const canonicalPath = row.canonicalPath;
  if (!canonicalPath) {
    return err(new Error(`No live copy for '${row.path}'.`));
  }
  if (row.kind === 'rule') {
    const agents = fs.readFile(AGENTS_MD);
    if (!isOk(agents)) {
      return agents;
    }
    const section = readRuleSection(agents.value, leftoverRuleId(row.path));
    if (section === null) {
      return err(new Error(`No live copy for '${row.path}'.`));
    }
    return ok(section);
  }
  return fs.readFile(`${canonicalPath}/SKILL.md`);
}
