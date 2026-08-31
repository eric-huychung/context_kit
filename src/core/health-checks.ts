import { load as loadYaml } from 'js-yaml';
import type { Finding } from '../types/index.js';

/** Description length past this is "always loaded, rarely worth it" (idle-cost). */
const IDLE_COST_CHAR_THRESHOLD = 400;
/** SKILL.md body past either cap is "fat" — expensive once actually invoked. */
const FAT_BODY_LINE_THRESHOLD = 300;
const FAT_BODY_CHAR_THRESHOLD = 12_000;

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

function unusedFinding(skillId: string, usageCount: number): Finding | null {
  if (usageCount > 0) {
    return null;
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
}): Finding[] {
  const findings = [
    idleCostFinding(opts.skillId, opts.description),
    fatBodyFinding(opts.skillId, opts.body),
    unusedFinding(opts.skillId, opts.usageCount),
    hashSplitFinding(opts.skillId, opts.diskHashes),
    secretFinding(opts.skillId, opts.body),
  ];
  return findings.filter((finding): finding is Finding => finding !== null);
}
