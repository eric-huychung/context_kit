import Table from 'cli-table3';
import type { Command } from 'commander';
import type { ICollectionEngine } from '../../interfaces/engine.js';
import { isOk } from '../../core/result.js';
import { printOutcome, type CommandOutcome } from '../output.js';

/** `/build` and `build` both look up the `build` row — command names store without the slash. */
function normalizeCommandName(name: string): string {
  return name.startsWith('/') ? name.slice(1) : name;
}

export async function runDoctor(engine: ICollectionEngine, name?: string): Promise<CommandOutcome> {
  const result = await engine.health();
  if (!isOk(result)) {
    return { message: result.error.message, isError: true };
  }

  if (name === undefined) {
    if (result.value.length === 0) {
      return { message: 'No commands yet', isError: false, isInfo: true };
    }
    const table = new Table({ head: ['Command', 'Tokens', 'Warnings'] });
    for (const row of result.value) {
      table.push([row.name, String(row.tokenEstimate), String(row.warnCount)]);
    }
    return { message: table.toString(), isError: false, isInfo: true };
  }

  const normalized = normalizeCommandName(name);
  const row = result.value.find((command) => command.name === normalized);
  if (!row) {
    return {
      message: `Command '${normalized}' not found. Run 'skil list' to see available commands.`,
      isError: true,
    };
  }
  if (row.findings.length === 0) {
    return { message: `'${row.name}' has no findings.`, isError: false, isInfo: true };
  }

  const lines = row.findings.map((finding) => `[${finding.type}] ${finding.skillId}: ${finding.message}`);
  return { message: lines.join('\n'), isError: false, isInfo: true };
}

export function registerDoctorCommand(program: Command, engine: ICollectionEngine): void {
  program
    .command('doctor [name]')
    .description(
      'Report findings per command: idle-cost, fat-body, unused, hash-split, secret (math + regex, no LLM key required)'
    )
    .action(async (name?: string) => {
      printOutcome(await runDoctor(engine, name));
    });
}
