import type { ShelfRole, ShelfSkill } from '../backend/market-types.js';
import type { LlmChat } from '../llm/llm-chat.js';
import { isOk, ok, type Result } from './result.js';

/** Target shortlist size — the LLM is asked for this range; the fingerprint-only fallback is capped to the max. */
export const SUGGEST_MIN = 15;
export const SUGGEST_MAX = 20;

/** Candidate pool handed to the LLM for reranking — bounded so the prompt stays small. */
const LLM_CANDIDATE_CAP = 40;
const SUGGEST_LLM_MAX_TOKENS = 400;

/** Reads `dependencies` + `devDependencies` names out of `package.json` text. Malformed/missing → `[]`, not a crash. */
export function parsePackageDeps(contents: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== 'object') {
    return [];
  }
  const { dependencies, devDependencies } = parsed as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const deps = new Set<string>();
  for (const name of Object.keys(dependencies ?? {})) deps.add(name);
  for (const name of Object.keys(devDependencies ?? {})) deps.add(name);
  return [...deps];
}

/** Flattens every shelf skill across every role/field into one list, deduped by id (first occurrence wins). */
export function flattenShelfSkills(shelves: ShelfRole[]): ShelfSkill[] {
  const seen = new Map<string, ShelfSkill>();
  for (const role of shelves) {
    for (const field of role.fields) {
      for (const skill of field.skills) {
        if (!seen.has(skill.id)) {
          seen.set(skill.id, skill);
        }
      }
    }
  }
  return [...seen.values()];
}

/** How many dependency name fragments show up in a shelf skill's id/name — a rough stack-match signal, not semantic ranking. */
function stackScore(skill: ShelfSkill, deps: string[]): number {
  const haystack = `${skill.id} ${skill.name}`.toLowerCase();
  let score = 0;
  for (const dep of deps) {
    const needle = dep.toLowerCase().replace(/^@[^/]+\//, '');
    if (needle.length >= 3 && haystack.includes(needle)) {
      score += 1;
    }
  }
  return score;
}

/**
 * Fingerprint v1: shelf skills not already on the catalog, ranked by
 * stack match then installs. Pure — no network, no LLM.
 */
export function rankByFingerprint(shelves: ShelfRole[], deps: string[], excludeIds: ReadonlySet<string>): ShelfSkill[] {
  return flattenShelfSkills(shelves)
    .filter((skill) => !excludeIds.has(skill.id))
    .map((skill) => ({ skill, score: stackScore(skill, deps) }))
    .sort((a, b) => b.score - a.score || b.skill.installs - a.skill.installs)
    .map((row) => row.skill);
}

function suggestSystemPrompt(): string {
  return [
    "You pick which candidate skills best match a project's dependency stack.",
    `Reply with strict JSON and nothing else: {"ids":["<id>", ...]}, ${SUGGEST_MIN}-${SUGGEST_MAX} ids, most relevant first.`,
    'Only use ids from the candidate list. Favor skills whose name plainly matches a listed dependency, framework, or language.',
  ].join(' ');
}

function parseSuggestIds(content: string, knownIds: ReadonlySet<string>): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }
  const ids = (parsed as { ids?: unknown } | null)?.ids;
  if (!Array.isArray(ids)) {
    return [];
  }
  const result: string[] = [];
  for (const id of ids) {
    if (typeof id === 'string' && knownIds.has(id) && !result.includes(id)) {
      result.push(id);
    }
  }
  return result;
}

/**
 * LLM rerank over a fingerprint-ranked candidate pool. Only called when
 * an `LlmChat` is present. A parse/network failure returns an `Err` so
 * the caller can fall back to the fingerprint-only order.
 */
export async function rerankWithLlm(candidates: ShelfSkill[], deps: string[], llmChat: LlmChat): Promise<Result<string[]>> {
  const pool = candidates.slice(0, LLM_CANDIDATE_CAP);
  if (pool.length === 0) {
    return ok([]);
  }
  const knownIds = new Set(pool.map((skill) => skill.id));
  const result = await llmChat.complete({
    system: suggestSystemPrompt(),
    user: JSON.stringify({ deps, candidates: pool.map((skill) => ({ id: skill.id, name: skill.name })) }),
    maxTokens: SUGGEST_LLM_MAX_TOKENS,
  });
  if (!isOk(result)) {
    return result;
  }
  return ok(parseSuggestIds(result.value, knownIds));
}
