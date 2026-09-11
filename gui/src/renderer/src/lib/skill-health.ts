import type { Finding, HealthReport } from '../../../shared/ipc';
/** Browser-safe — do not import `health-checks` (node:crypto whitescreens Electron). */
import { estimateTokens, parseDescription } from '../../../../../src/core/skill-md.js';

export type SkillFindingView = {
  type: Finding['type'];
  skillId: string;
  message: string;
  commandName: string;
};

/** Short labels for the preview list. idle-cost is the token number, not a row. */
export const FINDING_LABEL: Record<Finding['type'], string> = {
  'idle-cost': 'Always loaded',
  'fat-body': 'Fat file',
  unused: 'Unused',
  'hash-split': 'Copies disagree',
  secret: 'Secret leak',
  conflict: 'Conflict',
  'vague-trigger': 'Vague trigger',
};

const LLM_FINDING_TYPES = new Set<Finding['type']>(['conflict', 'vague-trigger']);

export function isLlmFinding(type: Finding['type']): boolean {
  return LLM_FINDING_TYPES.has(type);
}

export function findingIgnoreKey(finding: Pick<Finding, 'skillId' | 'type'>): string {
  return `${finding.skillId}:${finding.type}`;
}

export function activeFindings<T extends Pick<Finding, 'skillId' | 'type'>>(
  findings: T[],
  ignored: Iterable<string>
): T[] {
  const ignoredSet = ignored instanceof Set ? ignored : new Set(ignored);
  return findings.filter((finding) => !ignoredSet.has(findingIgnoreKey(finding)));
}

export function findingsForSkill(report: HealthReport, skillId: string): SkillFindingView[] {
  const items: SkillFindingView[] = [];
  for (const row of report) {
    for (const finding of row.findings) {
      if (finding.skillId === skillId) {
        items.push({ type: finding.type, skillId, message: finding.message, commandName: row.name });
      }
    }
  }
  return items;
}

/** Same char/4 estimate doctor uses. Description is the always-loaded cost. */
export function estimateTokensFromMarkdown(markdown: string, fallback: string): number {
  return estimateTokens(parseDescription(markdown) || fallback);
}

export function formatTokenCount(n: number): string {
  return n === 1 ? '1 token' : `${n} tokens`;
}
