import type { SkillRecord } from '../../../shared/ipc';
import { skillPathState } from '../../../../../src/core/dock-layout.js';

export { skillPathState };

export function formatScannedAt(date: Date | null): string {
  if (!date) return 'Never';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export type InboxSkillGroup = {
  key: 'market' | 'project';
  label: string;
  skills: string[];
};

/**
 * Market vs Project is a filter over `source`, not "has a path" — a
 * market skill stays under Market after `+` writes it to disk. Only a
 * catalog row scanned off local disk (`source: 'local'`) is Project.
 */
export function groupInboxSkills(
  inbox: string[],
  catalog: Array<Pick<SkillRecord, 'id' | 'source'>>
): InboxSkillGroup[] {
  const sourceById = new Map(catalog.map((skill) => [skill.id, skill.source]));
  const market: string[] = [];
  const project: string[] = [];
  for (const id of inbox) {
    if (sourceById.get(id) === 'local') project.push(id);
    else market.push(id);
  }
  const groups: InboxSkillGroup[] = [
    { key: 'market', label: 'Market', skills: market },
    { key: 'project', label: 'Project', skills: project },
  ];
  return groups.filter((group) => group.skills.length > 0);
}
