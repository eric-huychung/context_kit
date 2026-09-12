import { cpSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { IFileSystemAdapter } from '../interfaces/adapters.js';
import { err, isOk, ok, type Result } from '../core/result.js';

/**
 * Real file system implementation of IFileSystemAdapter, backed by Node's
 * `fs` module. Used in production; tests use InMemoryFileSystemAdapter
 * instead so CollectionEngine tests never touch disk.
 *
 * Every path is jailed under `root` (the connected project folder). Relative
 * paths resolve there; absolute paths are allowed only when they still land
 * inside `root`. `..` that would escape returns an error — never a write
 * outside the connected folder.
 */
export class RealFileSystemAdapter implements IFileSystemAdapter {
  constructor(private readonly root: string = process.cwd()) {}

  readJSON<T>(path: string): Result<T> {
    const resolved = this.boundPath(path);
    if (!isOk(resolved)) return resolved;
    let contents: string;
    try {
      contents = readFileSync(resolved.value, 'utf-8');
    } catch (error) {
      return err(new Error(`Failed to read '${path}': ${(error as Error).message}`));
    }

    try {
      return ok(JSON.parse(contents) as T);
    } catch (error) {
      return err(new Error(`Failed to parse JSON in '${path}': ${(error as Error).message}`));
    }
  }

  writeJSON<T>(path: string, data: T): Result<void> {
    const resolved = this.boundPath(path);
    if (!isOk(resolved)) return resolved;
    const tempPath = `${resolved.value}.${process.pid}.tmp`;
    try {
      mkdirSync(dirname(resolved.value), { recursive: true });
      writeFileSync(tempPath, JSON.stringify(data, null, 2));
      renameSync(tempPath, resolved.value);
      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to write '${path}': ${(error as Error).message}`));
    }
  }

  findSkillFolders(root: string): Result<string[]> {
    const resolved = this.boundPath(root);
    if (!isOk(resolved)) return resolved;
    let stats;
    try {
      stats = statSync(resolved.value);
    } catch {
      return ok([]);
    }
    if (!stats.isDirectory()) {
      return err(new Error(`Failed to scan '${root}': not a directory`));
    }

    const found: string[] = [];
    const visit = (dir: string): void => {
      const entries = readdirSync(dir, { withFileTypes: true });
      if (entries.some((entry) => entry.isFile() && entry.name === 'SKILL.md')) {
        found.push(this.toAdapterRelative(dir));
      }
      for (const entry of entries) {
        if (entry.isDirectory()) {
          visit(join(dir, entry.name));
        }
      }
    };
    visit(resolved.value);
    return ok(found);
  }

  readFile(path: string): Result<string> {
    const resolved = this.boundPath(path);
    if (!isOk(resolved)) return resolved;
    try {
      return ok(readFileSync(resolved.value, 'utf-8'));
    } catch (error) {
      return err(new Error(`Failed to read '${path}': ${(error as Error).message}`));
    }
  }

  writeFile(path: string, data: string): Result<void> {
    const resolved = this.boundPath(path);
    if (!isOk(resolved)) return resolved;
    try {
      mkdirSync(dirname(resolved.value), { recursive: true });
      writeFileSync(resolved.value, data, 'utf-8');
      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to write '${path}': ${(error as Error).message}`));
    }
  }

  copyDir(from: string, to: string): Result<void> {
    const src = this.boundPath(from);
    if (!isOk(src)) return src;
    const dest = this.boundPath(to);
    if (!isOk(dest)) return dest;
    try {
      const stats = statSync(src.value);
      if (!stats.isDirectory()) {
        return err(new Error(`Failed to copy '${from}': not a directory`));
      }
      mkdirSync(dirname(dest.value), { recursive: true });
      cpSync(src.value, dest.value, { recursive: true });
      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to copy '${from}' to '${to}': ${(error as Error).message}`));
    }
  }

  listFiles(dir: string): Result<string[]> {
    const resolved = this.boundPath(dir);
    if (!isOk(resolved)) return resolved;
    let stats;
    try {
      stats = statSync(resolved.value);
    } catch {
      return ok([]);
    }
    if (!stats.isDirectory()) {
      return err(new Error(`Failed to list '${dir}': not a directory`));
    }

    try {
      const entries = readdirSync(resolved.value, { withFileTypes: true });
      return ok(
        entries
          .filter((entry) => entry.isFile())
          .map((entry) => this.toAdapterRelative(join(resolved.value, entry.name)))
          .sort()
      );
    } catch (error) {
      return err(new Error(`Failed to list '${dir}': ${(error as Error).message}`));
    }
  }

  removeFile(path: string): Result<void> {
    const resolved = this.boundPath(path);
    if (!isOk(resolved)) return resolved;
    try {
      unlinkSync(resolved.value);
      return ok(undefined);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        return ok(undefined);
      }
      return err(new Error(`Failed to delete '${path}': ${(error as Error).message}`));
    }
  }

  listAllFiles(dir: string): Result<string[]> {
    const resolved = this.boundPath(dir);
    if (!isOk(resolved)) return resolved;
    let stats;
    try {
      stats = statSync(resolved.value);
    } catch {
      return ok([]);
    }
    if (!stats.isDirectory()) {
      return err(new Error(`Failed to list '${dir}': not a directory`));
    }

    const found: string[] = [];
    const visit = (current: string): void => {
      const entries = readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const next = join(current, entry.name);
        if (entry.isDirectory()) {
          visit(next);
        } else if (entry.isFile()) {
          found.push(this.toAdapterRelative(next));
        }
      }
    };
    try {
      visit(resolved.value);
      return ok(found.sort());
    } catch (error) {
      return err(new Error(`Failed to list '${dir}': ${(error as Error).message}`));
    }
  }

  removeDir(path: string): Result<void> {
    const resolved = this.boundPath(path);
    if (!isOk(resolved)) return resolved;
    try {
      rmSync(resolved.value, { recursive: true, force: true });
      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to delete '${path}': ${(error as Error).message}`));
    }
  }

  private boundPath(path: string): Result<string> {
    const resolved = isAbsolute(path) ? resolve(path) : resolve(this.root, path);
    const rootResolved = resolve(this.root);
    const rel = relative(rootResolved, resolved);
    if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
      return err(new Error(`Path '${path}' is outside the project folder.`));
    }
    return ok(resolved);
  }

  private toAdapterRelative(absoluteDir: string): string {
    const rel = relative(this.root, absoluteDir);
    return rel === '' ? '.' : rel.split(sep).join('/');
  }
}
