import { err, ok, type Result } from '../../../src/core/result.js';

export const GITHUB_LATEST_RELEASE =
  'https://api.github.com/repos/eric-huychung/skil/releases/latest';

export const PRODUCT_LINKS = {
  website: 'https://www.skil.website/',
  github: 'https://github.com/eric-huychung/skil',
  linkedin: 'https://www.linkedin.com/in/huychung/',
  venmo: 'https://venmo.com/u/echung03',
  releases: 'https://github.com/eric-huychung/skil/releases',
  bugReport: 'https://github.com/eric-huychung/skil/issues/new?template=bug.yml',
  featureRequest: 'https://github.com/eric-huychung/skil/issues/new?template=feature.yml',
} as const;

export interface AppUpdate {
  current: string;
  latest: string;
  newer: boolean;
  url: string;
}

function stripTag(tag: string): string {
  return tag.trim().replace(/^v/i, '').split('-')[0] ?? '';
}

function versionParts(tag: string): [number, number, number] {
  const [major, minor, patch] = stripTag(tag).split('.');
  return [Number(major) || 0, Number(minor) || 0, Number(patch) || 0];
}

export function parseGithubRelease(payload: unknown): { latest: string; url: string } | null {
  if (!payload || typeof payload !== 'object') return null;
  const tag = 'tag_name' in payload ? payload.tag_name : undefined;
  const url = 'html_url' in payload ? payload.html_url : undefined;
  if (typeof tag !== 'string' || tag.trim() === '') return null;
  if (typeof url !== 'string' || url.trim() === '') return null;
  return { latest: stripTag(tag), url };
}

export function compareAppUpdate(current: string, release: { latest: string; url: string }): AppUpdate {
  const latestParts = versionParts(release.latest);
  const currentParts = versionParts(current);
  let newer = false;
  for (let i = 0; i < 3; i += 1) {
    if (latestParts[i] !== currentParts[i]) {
      newer = latestParts[i] > currentParts[i];
      break;
    }
  }
  return {
    current: stripTag(current),
    latest: release.latest,
    newer,
    url: release.url,
  };
}

/** `loadLatest` is the GitHub call. Inject it so tests never hit the network. */
export async function checkAppUpdate(
  current: string,
  loadLatest: () => Promise<unknown>
): Promise<Result<AppUpdate>> {
  let payload: unknown;
  try {
    payload = await loadLatest();
  } catch {
    return err(new Error("couldn't reach github"));
  }
  const release = parseGithubRelease(payload);
  if (!release) return err(new Error("couldn't read the latest release"));
  return ok(compareAppUpdate(current, release));
}
