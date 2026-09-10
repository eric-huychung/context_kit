export type AlignRow = {
  left: string | null;
  right: string | null;
  leftChanged: boolean;
  rightChanged: boolean;
};

type Op = { type: 'same'; text: string } | { type: 'del'; text: string } | { type: 'add'; text: string };

/** Side-by-side rows. Matching lines sit together; inserts get a gap on the other side. */
export function lineDiff(left: string, right: string): AlignRow[] {
  return align(diffOps(left.split('\n'), right.split('\n')));
}

function diffOps(a: string[], b: string[]): Op[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? (dp[i + 1]?.[j + 1] ?? 0) + 1 : Math.max(dp[i + 1]?.[j] ?? 0, dp[i]?.[j + 1] ?? 0);
    }
  }

  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    const leftLine = a[i];
    const rightLine = b[j];
    if (leftLine === rightLine) {
      ops.push({ type: 'same', text: leftLine ?? '' });
      i += 1;
      j += 1;
    } else if ((dp[i + 1]?.[j] ?? 0) >= (dp[i]?.[j + 1] ?? 0)) {
      ops.push({ type: 'del', text: leftLine ?? '' });
      i += 1;
    } else {
      ops.push({ type: 'add', text: rightLine ?? '' });
      j += 1;
    }
  }
  while (i < n) {
    ops.push({ type: 'del', text: a[i] ?? '' });
    i += 1;
  }
  while (j < m) {
    ops.push({ type: 'add', text: b[j] ?? '' });
    j += 1;
  }
  return ops;
}

function align(ops: Op[]): AlignRow[] {
  const rows: AlignRow[] = [];
  let index = 0;
  while (index < ops.length) {
    const op = ops[index];
    const next = ops[index + 1];
    if (!op) break;
    if (op.type === 'same') {
      rows.push({ left: op.text, right: op.text, leftChanged: false, rightChanged: false });
      index += 1;
    } else if (op.type === 'del' && next?.type === 'add') {
      rows.push({ left: op.text, right: next.text, leftChanged: true, rightChanged: true });
      index += 2;
    } else if (op.type === 'add' && next?.type === 'del') {
      rows.push({ left: next.text, right: op.text, leftChanged: true, rightChanged: true });
      index += 2;
    } else if (op.type === 'del') {
      rows.push({ left: op.text, right: null, leftChanged: true, rightChanged: false });
      index += 1;
    } else {
      rows.push({ left: null, right: op.text, leftChanged: false, rightChanged: true });
      index += 1;
    }
  }
  return rows;
}
