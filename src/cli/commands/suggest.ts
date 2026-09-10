import Table from 'cli-table3';
import type { Command } from 'commander';
import type { Discover } from '../../backend/discover.js';
import { SEED_ROLES } from '../../backend/market-seed.js';
import type { ICollectionEngine } from '../../interfaces/engine.js';
import { isOk } from '../../core/result.js';
import { printOutcome, type CommandOutcome } from '../output.js';

const ROLE_SLUGS = new Set(SEED_ROLES.map((role) => role.slug));

const NO_KEY_NOTE =
  'Showing editorial picks. Set SKIL_LLM_PROVIDER and SKIL_LLM_API_KEY for stack-aware suggestions.';

export async function runSuggest(
  engine: ICollectionEngine,
  discover: Discover,
  opts: { role?: string } = {},
): Promise<CommandOutcome> {
  const role = opts.role ?? 'swe';
  if (!ROLE_SLUGS.has(role)) {
    return {
      message: `Unknown role '${role}'. Choose one of: ${[...ROLE_SLUGS].join(', ')}.`,
      isError: true,
    };
  }

  const shelvesResult = await discover.shelves();
  if (!isOk(shelvesResult)) {
    return { message: 'Could not load the market index. Try again in a moment.', isError: true };
  }

  const suggestResult = await engine.suggest(shelvesResult.value, { role });
  if (!isOk(suggestResult)) {
    return { message: suggestResult.error.message, isError: true };
  }

  if (suggestResult.value.ids.length === 0) {
    return {
      message: 'No suggestions right now — every pick for this role is already in your catalog.',
      isError: false,
      isInfo: true,
    };
  }

  const table = new Table({ head: ['Suggested skill'] });
  for (const id of suggestResult.value.ids) {
    table.push([id]);
  }

  const lines = [table.toString()];
  if (!suggestResult.value.usedLlm) {
    lines.unshift(NO_KEY_NOTE);
  }
  return { message: lines.join('\n\n'), isError: false, isInfo: true };
}

export function registerSuggestCommand(program: Command, engine: ICollectionEngine, discover: Discover): void {
  program
    .command('suggest')
    .description('Shortlist market skills for a role — editorial picks by default, LLM-ranked when a key is set')
    .option('--role <slug>', 'Role slug (swe, ui-ux, pm, data, agent, other)', 'swe')
    .action(async (opts: { role?: string }) => {
      printOutcome(await runSuggest(engine, discover, { role: opts.role }));
    });
}
