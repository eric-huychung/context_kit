import { load as loadYaml } from 'js-yaml';
import type { Finding } from '../types/index.js';
import type { LlmChat } from '../llm/llm-chat.js';
import { isOk, ok, type Result } from './result.js';

/** Description length past this is "always loaded, rarely worth it" (idle-cost). 500 = Skillsaw error; spec max is 1024. */
const IDLE_COST_CHAR_THRESHOLD = 500;
/** SKILL.md body past either cap is "fat" — agentskills.io: keep under 500 lines / 5000 tokens. */
const FAT_BODY_LINE_THRESHOLD = 500;
const FAT_BODY_CHAR_THRESHOLD = 20_000;
/** Unused stays quiet this long after install/file so first-download is not a wall of warnings. */
const UNUSED_GRACE_MS = 14 * 24 * 60 * 60 * 1000;

/** Secret-shaped strings. Deliberately narrow (vendor key prefixes, PEM headers) to avoid flagging ordinary prose. */
const SECRET_PATTERNS: RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/, // OpenAI / Anthropic style
  /\bAKIA[0-9A-Z]{16}\b/, // AWS access key id
  /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bghp_[A-Za-z0-9]{36}\b/, // GitHub personal access token
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, // Slack token
];

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/** Rough char/4 token estimate — a relative warn signal, not a billing number. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Pulls the YAML `description:` field out of SKILL.md frontmatter. Malformed/missing frontmatter is `''`, not a crash. */
export function parseDescription(contents: string): string {
  const match = contents.match(FRONTMATTER_RE);
  if (!match?.[1]) {
    return '';
  }
  try {
    const parsed = loadYaml(match[1]);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const description = (parsed as { description?: unknown }).description;
      return typeof description === 'string' ? description : '';
    }
  } catch {
    // malformed frontmatter — no description found, not a crash
  }
  return '';
}

function idleCostFinding(skillId: string, description: string): Finding | null {
  if (description.length <= IDLE_COST_CHAR_THRESHOLD) {
    return null;
  }
  const tokens = estimateTokens(description);
  return {
    type: 'idle-cost',
    skillId,
    message: `Description is ${description.length} chars (~${tokens} tokens) — loaded every time this command is idle, whether or not the skill runs.`,
  };
}

function fatBodyFinding(skillId: string, body: string): Finding | null {
  const lines = body.split(/\r?\n/).length;
  if (lines <= FAT_BODY_LINE_THRESHOLD && body.length <= FAT_BODY_CHAR_THRESHOLD) {
    return null;
  }
  return {
    type: 'fat-body',
    skillId,
    message: `SKILL.md is ${lines} lines / ${body.length} chars — over the fat-body cap (${FAT_BODY_LINE_THRESHOLD} lines / ${FAT_BODY_CHAR_THRESHOLD} chars).`,
  };
}

function unusedFinding(
  skillId: string,
  usageCount: number,
  opts: { projectHasUsage?: boolean; observedAt?: string; now?: string }
): Finding | null {
  if (usageCount > 0 || !opts.projectHasUsage) {
    return null;
  }
  if (opts.observedAt) {
    const observedMs = Date.parse(opts.observedAt);
    const nowMs = Date.parse(opts.now ?? new Date().toISOString());
    if (!Number.isNaN(observedMs) && !Number.isNaN(nowMs) && nowMs - observedMs < UNUSED_GRACE_MS) {
      return null;
    }
  }
  return { type: 'unused', skillId, message: 'No recorded reads — filed but never used.' };
}

function hashSplitFinding(skillId: string, diskHashes: ReadonlySet<string>): Finding | null {
  if (diskHashes.size <= 1) {
    return null;
  }
  return {
    type: 'hash-split',
    skillId,
    message: `${diskHashes.size} different copies of this skill exist on disk — one path has drifted from the others.`,
  };
}

function secretFinding(skillId: string, body: string): Finding | null {
  const hit = SECRET_PATTERNS.some((pattern) => pattern.test(body));
  if (!hit) {
    return null;
  }
  return {
    type: 'secret',
    skillId,
    message: 'SKILL.md body matches a secret-shaped pattern — check it is not a leaked key.',
  };
}

/** Math + regex findings for one filed skill. Never requires an LLM key. */
export function computeSkillFindings(opts: {
  skillId: string;
  description: string;
  body: string;
  usageCount: number;
  diskHashes: ReadonlySet<string>;
  /** True when any skill in this project has at least one recorded read. */
  projectHasUsage?: boolean;
  /** Earliest install/file time used for unused grace. Missing = treat as old. */
  observedAt?: string;
  now?: string;
}): Finding[] {
  const findings = [
    idleCostFinding(opts.skillId, opts.description),
    fatBodyFinding(opts.skillId, opts.body),
    unusedFinding(opts.skillId, opts.usageCount, {
      projectHasUsage: opts.projectHasUsage,
      observedAt: opts.observedAt,
      now: opts.now,
    }),
    hashSplitFinding(opts.skillId, opts.diskHashes),
    secretFinding(opts.skillId, opts.body),
  ];
  return findings.filter((finding): finding is Finding => finding !== null);
}

/** One filed skill's text, trimmed for the LLM prompt. */
export interface LlmFindingsSkillInput {
  skillId: string;
  description: string;
  body: string;
}

/** Body excerpt cap per skill in the LLM prompt — enough context, bounded tokens. */
const BODY_EXCERPT_CHARS = 500;
const LLM_FINDINGS_MAX_TOKENS = 600;

function llmFindingsSystemPrompt(): string {
  return [
    'You audit AI skills filed together on one command, looking for two real failure modes only:',
    '1) "conflict": two skills whose descriptions/triggers overlap enough that an agent could invoke the wrong one, or that give contradictory instructions.',
    '2) "vague-trigger": a description too generic to reliably fire when it should (e.g. "helps with code" instead of naming a concrete task or trigger phrase).',
    'Most skill sets have none of either — only flag real problems, never shared generic words like "help", "code", or "review" alone.',
    'Reply with strict JSON and nothing else: {"conflicts":[{"a":"<id>","b":"<id>","why":"<one line>"}],"vague":[{"id":"<id>","why":"<one line>"}]}.',
    'Empty arrays are the expected, common answer.',
  ].join(' ');
}

function toPromptSkill(skill: LlmFindingsSkillInput): { id: string; description: string; bodyExcerpt: string } {
  return { id: skill.skillId, description: skill.description, bodyExcerpt: skill.body.slice(0, BODY_EXCERPT_CHARS) };
}

function parseLlmFindings(content: string, knownIds: ReadonlySet<string>): Finding[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== 'object') {
    return [];
  }

  const findings: Finding[] = [];

  const conflicts = (parsed as { conflicts?: unknown }).conflicts;
  if (Array.isArray(conflicts)) {
    for (const row of conflicts) {
      if (!row || typeof row !== 'object') continue;
      const a = (row as { a?: unknown }).a;
      const b = (row as { b?: unknown }).b;
      const why = (row as { why?: unknown }).why;
      if (typeof a !== 'string' || typeof b !== 'string' || typeof why !== 'string') continue;
      if (a === b || !knownIds.has(a) || !knownIds.has(b)) continue;
      findings.push({ type: 'conflict', skillId: a, message: `Overlaps with ${b} — ${why}` });
      findings.push({ type: 'conflict', skillId: b, message: `Overlaps with ${a} — ${why}` });
    }
  }

  const vague = (parsed as { vague?: unknown }).vague;
  if (Array.isArray(vague)) {
    for (const row of vague) {
      if (!row || typeof row !== 'object') continue;
      const id = (row as { id?: unknown }).id;
      const why = (row as { why?: unknown }).why;
      if (typeof id !== 'string' || typeof why !== 'string') continue;
      if (!knownIds.has(id)) continue;
      findings.push({ type: 'vague-trigger', skillId: id, message: why });
    }
  }

  return findings;
}

/**
 * LLM slice on `health()`: one call over a command's filed skills →
 * conflict pairs + vague triggers. Only called when an `LlmChat` is
 * injected. A network/parse failure returns an `Err` so the caller can
 * leave `usedLlm: false` and keep the report Phase-1-shaped — a bad key
 * degrades silently here; `pingLlm` is where it surfaces clearly.
 */
export async function computeLlmFindings(skills: LlmFindingsSkillInput[], llmChat: LlmChat): Promise<Result<Finding[]>> {
  if (skills.length === 0) {
    return ok([]);
  }
  const knownIds = new Set(skills.map((skill) => skill.skillId));
  const result = await llmChat.complete({
    system: llmFindingsSystemPrompt(),
    user: JSON.stringify(skills.map(toPromptSkill)),
    maxTokens: LLM_FINDINGS_MAX_TOKENS,
  });
  if (!isOk(result)) {
    return result;
  }
  return ok(parseLlmFindings(result.value, knownIds));
}
