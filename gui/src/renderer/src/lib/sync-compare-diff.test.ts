import { describe, expect, it } from 'vitest';
import { lineDiff } from './sync-compare-diff';

describe('lineDiff', () => {
  it('marks nothing when both sides match', () => {
    expect(lineDiff('# tdd\nbody\n', '# tdd\nbody\n')).toEqual([
      { left: '# tdd', right: '# tdd', leftChanged: false, rightChanged: false },
      { left: 'body', right: 'body', leftChanged: false, rightChanged: false },
      { left: '', right: '', leftChanged: false, rightChanged: false },
    ]);
  });

  it('puts a changed line on the same row in both panes', () => {
    expect(lineDiff('# tdd\n\nLive copy body.\n', '# tdd\n\nLeftover copy body.\n')).toEqual([
      { left: '# tdd', right: '# tdd', leftChanged: false, rightChanged: false },
      { left: '', right: '', leftChanged: false, rightChanged: false },
      { left: 'Live copy body.', right: 'Leftover copy body.', leftChanged: true, rightChanged: true },
      { left: '', right: '', leftChanged: false, rightChanged: false },
    ]);
  });

  it('keeps shared lines aligned when one side inserts a line', () => {
    expect(lineDiff('A\nB\nC\n', 'A\nX\nB\nC\n')).toEqual([
      { left: 'A', right: 'A', leftChanged: false, rightChanged: false },
      { left: null, right: 'X', leftChanged: false, rightChanged: true },
      { left: 'B', right: 'B', leftChanged: false, rightChanged: false },
      { left: 'C', right: 'C', leftChanged: false, rightChanged: false },
      { left: '', right: '', leftChanged: false, rightChanged: false },
    ]);
  });
});
