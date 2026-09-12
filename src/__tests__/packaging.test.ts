import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('npm package surface', () => {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
    private?: boolean;
    files?: string[];
  };

  it('does not publish the skill library or the rest of the monorepo', () => {
    expect(pkg.private).toBe(true);
    expect(pkg.files).toEqual(['dist', 'README.md', 'LICENSE']);
    expect(pkg.files?.some((entry) => entry.includes('.agents') || entry.includes('.cursor'))).toBe(false);
  });
});
