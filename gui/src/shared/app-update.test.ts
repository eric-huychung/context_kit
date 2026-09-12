import { describe, expect, it } from 'vitest';
import { isErr } from '../../../src/core/result.js';
import { checkAppUpdate, compareAppUpdate, parseGithubRelease } from './app-update.js';

describe('parseGithubRelease', () => {
  it('reads tag_name and html_url, and strips a leading v', () => {
    expect(
      parseGithubRelease({
        tag_name: 'v0.7.0',
        html_url: 'https://github.com/eric-huychung/skil/releases/tag/v0.7.0',
      })
    ).toEqual({
      latest: '0.7.0',
      url: 'https://github.com/eric-huychung/skil/releases/tag/v0.7.0',
    });
  });

  it('returns null for junk', () => {
    expect(parseGithubRelease(null)).toBeNull();
    expect(parseGithubRelease({})).toBeNull();
    expect(parseGithubRelease({ tag_name: 'v0.7.0' })).toBeNull();
  });
});

describe('compareAppUpdate', () => {
  const release = { latest: '0.7.0', url: 'https://github.com/eric-huychung/skil/releases/tag/v0.7.0' };

  it('flags a higher latest tag as newer', () => {
    expect(compareAppUpdate('0.6.0', release)).toEqual({
      current: '0.6.0',
      latest: '0.7.0',
      newer: true,
      url: release.url,
    });
  });

  it('says you are current when tags match', () => {
    expect(compareAppUpdate('0.7.0', release).newer).toBe(false);
  });

  it('does not flag an older latest tag', () => {
    expect(compareAppUpdate('0.8.0', release).newer).toBe(false);
  });
});

describe('checkAppUpdate', () => {
  it('loads a github payload and compares it to the running version', async () => {
    const result = await checkAppUpdate('0.6.0', async () => ({
      tag_name: 'v0.7.0',
      html_url: 'https://github.com/eric-huychung/skil/releases/tag/v0.7.0',
    }));

    expect(result).toEqual({
      ok: true,
      value: {
        current: '0.6.0',
        latest: '0.7.0',
        newer: true,
        url: 'https://github.com/eric-huychung/skil/releases/tag/v0.7.0',
      },
    });
  });

  it('fails closed on a throw or a junk payload', async () => {
    const thrown = await checkAppUpdate('0.6.0', async () => {
      throw new Error('offline');
    });
    const junk = await checkAppUpdate('0.6.0', async () => ({}));

    expect(isErr(thrown)).toBe(true);
    expect(isErr(junk)).toBe(true);
    if (isErr(thrown)) expect(thrown.error.message).toBe("couldn't reach github");
    if (isErr(junk)) expect(junk.error.message).toBe("couldn't read the latest release");
  });
});
