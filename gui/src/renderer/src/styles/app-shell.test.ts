import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'globals.css'), 'utf-8');

function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!match?.[1]) throw new Error(`missing ${selector} rule`);
  return match[1];
}

describe('app shell layout', () => {
  it('locks the window so chrome cannot scroll away', () => {
    expect(css).toMatch(/html\s*,\s*body\s*,\s*#root\s*\{[^}]*height:\s*100%/);
    expect(rule('body')).toMatch(/overflow:\s*hidden/);

    const shell = rule('.app-shell');
    expect(shell).toMatch(/height:\s*100%/);
    expect(shell).toMatch(/overflow:\s*hidden/);
    expect(shell).not.toMatch(/min-height:\s*100vh/);
  });

  it('gives every workspace pane a bounded row that scrolls inside', () => {
    const workspace = rule('.workspace');
    expect(workspace).toMatch(/min-height:\s*0/);
    expect(workspace).toMatch(/grid-template-rows:\s*minmax\(0,\s*1fr\)/);

    const pane = rule('.panel-section');
    expect(pane).toMatch(/min-height:\s*0/);
    expect(pane).toMatch(/overflow-y:\s*auto/);

    const rail = rule('.rail');
    expect(rail).toMatch(/grid-row:\s*1\s*\/\s*-1/);
    expect(rail).toMatch(/overflow:\s*visible/);
    expect(rail).not.toMatch(/overflow-y:\s*auto/);
  });
});
