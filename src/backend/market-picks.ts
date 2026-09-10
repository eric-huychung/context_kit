import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { isOk, ok, type Result } from '../core/result.js';
import type { MarketStore } from './market-store.js';
import { SEED_ROLES } from './market-seed.js';
import type { MarketPicksFile, MarketSuggestedData, SuggestedRole } from './market-types.js';

export type { MarketPicksFile, MarketSuggestedData, SuggestedRole };

/** Role slugs that may appear under `picks` — kept in sync with `SEED_ROLES`. */
export const MARKET_PICK_ROLE_SLUGS = SEED_ROLES.map((role) => role.slug);

const PICKS_PATH = join(dirname(fileURLToPath(import.meta.url)), '../../data/market-picks.yaml');

/** Parses and validates `data/market-picks.yaml`. Throws on malformed input. */
export function parseMarketPicks(contents: string): MarketPicksFile {
  const parsed = yaml.load(contents);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('market-picks: root must be an object');
  }
  const { updatedAt, picks } = parsed as { updatedAt?: unknown; picks?: unknown };
  const normalizedUpdatedAt =
    updatedAt instanceof Date
      ? updatedAt.toISOString().slice(0, 10)
      : typeof updatedAt === 'string'
        ? updatedAt
        : '';
  if (normalizedUpdatedAt.length === 0) {
    throw new Error('market-picks: updatedAt must be a non-empty string');
  }
  if (!picks || typeof picks !== 'object' || Array.isArray(picks)) {
    throw new Error('market-picks: picks must be an object');
  }
  const normalized: Record<string, string[]> = {};
  for (const role of MARKET_PICK_ROLE_SLUGS) {
    const value = (picks as Record<string, unknown>)[role];
    if (value === undefined) {
      normalized[role] = [];
      continue;
    }
    if (!Array.isArray(value) || value.some((id) => typeof id !== 'string' || id.length === 0)) {
      throw new Error(`market-picks: picks.${role} must be a string array`);
    }
    normalized[role] = value;
  }
  return { updatedAt: normalizedUpdatedAt, picks: normalized };
}

/** Loads picks from the repo file. Override `path` in tests. */
export function loadMarketPicks(path = PICKS_PATH): MarketPicksFile {
  return parseMarketPicks(readFileSync(path, 'utf8'));
}

/** Editorial id list for one role, in file order. Unknown role → `[]`. */
export function editorialPickIds(picks: MarketPicksFile, role: string): string[] {
  return picks.picks[role] ?? [];
}

function skillSlug(id: string): string {
  const parts = id.split('/');
  return parts[parts.length - 1] ?? id;
}

/** Hydrates editorial ids from the market index. Missing rows keep the id as the display name. */
export async function hydrateSuggestedPicks(
  store: MarketStore,
  picks: MarketPicksFile,
  roleFilter?: string,
): Promise<Result<MarketSuggestedData>> {
  const roles: SuggestedRole[] = [];
  for (const role of SEED_ROLES) {
    if (roleFilter && role.slug !== roleFilter) {
      continue;
    }
    const ids = editorialPickIds(picks, role.slug);
    const skills = [];
    for (const [index, id] of ids.entries()) {
      const listing = await store.getListing(id);
      if (!isOk(listing)) {
        return listing;
      }
      skills.push({
        id,
        name: listing.value?.name ?? skillSlug(id),
        installs: listing.value?.installs ?? 0,
        rank: index + 1,
      });
    }
    roles.push({ slug: role.slug, label: role.label, skills });
  }
  return ok({ updatedAt: picks.updatedAt, roles });
}
