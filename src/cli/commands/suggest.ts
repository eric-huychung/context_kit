import Table from 'cli-table3';
import type { Command } from 'commander';
import type { Discover } from '../../backend/discover.js';
import type { ICollectionEngine } from '../../interfaces/engine.js';
import { isOk } from '../../core/result.js';
import { printOutcome, type CommandOutcome } from '../output.js';

const NO_KEY_MESSAGE =
  "No LLM key set. Set SKIL_LLM_PROVIDER and SKIL_LLM_API_KEY in the environment ('anthropic' | 'openai' | 'openrouter') to get suggestions.";

export async function runSuggest(engine: ICollectionEngine, discover: Discover): Promise<CommandOutcome> {
  const shelvesResult = await discover.shelves();
  if (!isOk(shelvesResult)) {
    return { message: 'Could not load the market index. Try again in a moment.', isError: true };
  }

  const suggestResult = await engine.suggest(shelvesResult.value);
  if (!isOk(suggestResult)) {
    if (suggestResult.error.message === 'NEED_KEY') {
      return { message: NO_KEY_MESSAGE, isError: true };
    }
    return { message: suggestResult.error.message, isError: true };
  }

  if (suggestResult.value.ids.length === 0) {
    return {
      message: 'No suggestions right now — nothing on the market index matched this project.',
      isError: false,
      isInfo: true,
    };
  }

  const table = new Table({ head: ['Suggested skill'] });
  for (const id of suggestResult.value.ids) {
    table.push([id]);
  }
  return { message: table.toString(), isError: false, isInfo: true };
}

export function registerSuggestCommand(program: Command, engine: ICollectionEngine, discover: Discover): void {
  program
    .command('suggest')
    .description(
      "Shortlist market skills matching this project's package.json stack (requires an LLM key) — never installs"
    )
    .action(async () => {
      printOutcome(await runSuggest(engine, discover));
    });
}
