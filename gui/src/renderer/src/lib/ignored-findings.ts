import { findingIgnoreKey } from './skill-health';
import type { Finding } from '../../../shared/ipc';

const STORAGE_KEY = 'skil:ignored-findings:v1';
const listeners = new Set<() => void>();
let snapshot = read();

function read(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === 'string'));
  } catch {
    return new Set();
  }
}

function sameSet(left: Set<string>, right: Set<string>): boolean {
  if (left.size !== right.size) return false;
  for (const item of left) {
    if (!right.has(item)) return false;
  }
  return true;
}

function emit(next: Set<string>): void {
  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    // private mode / quota
  }
  listeners.forEach((listener) => listener());
}

export function subscribeIgnoredFindings(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getIgnoredFindings(): Set<string> {
  const next = read();
  if (!sameSet(snapshot, next)) snapshot = next;
  return snapshot;
}

export function ignoreFinding(finding: Pick<Finding, 'skillId' | 'type'>): void {
  const next = new Set(getIgnoredFindings());
  next.add(findingIgnoreKey(finding));
  emit(next);
}

export function restoreFinding(finding: Pick<Finding, 'skillId' | 'type'>): void {
  const next = new Set(getIgnoredFindings());
  next.delete(findingIgnoreKey(finding));
  emit(next);
}