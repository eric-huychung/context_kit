import { describe, expect, it } from 'vitest';
import { formatScannedAt, groupInboxSkills } from './skill-sources';

describe('formatScannedAt', () => {
  it('says Never when the workspace has not been scanned', () => {
    expect(formatScannedAt(null)).toBe('Never');
  });
});

describe('groupInboxSkills', () => {
  it('splits Discover pulls from skills scanned on disk', () => {
    expect(
      groupInboxSkills(['obra/react-patterns', 'tdd', 'ui/styling'], [
        { id: 'tdd', source: 'local' },
        { id: 'ui/styling', source: 'local' },
      ])
    ).toEqual([
      { key: 'market', label: 'Market', skills: ['obra/react-patterns'] },
      { key: 'project', label: 'Project', skills: ['tdd', 'ui/styling'] },
    ]);
  });

  it('keeps an installed market skill under Market even though it is on disk', () => {
    expect(
      groupInboxSkills(['obra/react-patterns', 'addyosmani/api-design'], [
        { id: 'obra/react-patterns', source: 'skills.sh' },
      ])
    ).toEqual([{ key: 'market', label: 'Market', skills: ['obra/react-patterns', 'addyosmani/api-design'] }]);
  });

  it('omits empty groups', () => {
    expect(groupInboxSkills(['tdd'], [{ id: 'tdd', source: 'local' }])).toEqual([
      { key: 'project', label: 'Project', skills: ['tdd'] },
    ]);
  });
});
