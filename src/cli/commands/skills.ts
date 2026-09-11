import Table from 'cli-table3';
import type { Command } from 'commander';
import type { ICollectionEngine } from '../../interfaces/engine.js';
import { skillPathState } from '../../core/dock-layout.js';
import { printOutcome, type CommandOutcome } from '../output.js';

export function runSkillsList(engine: ICollectionEngine): CommandOutcome {
  const skills = engine.skills();
  if (skills.length === 0) {
    return { message: 'No skills yet', isError: false, isInfo: true };
  }

  const table = new Table({ head: ['Id', 'Source', 'On', 'Paths'] });
  for (const skill of skills) {
    table.push([skill.id, skill.source, skillPathState(skill.paths), skill.paths.join(', ')]);
  }

  return { message: table.toString(), isError: false, isInfo: true };
}

export function registerSkillsCommand(program: Command, engine: ICollectionEngine): void {
  program
    .command('skills')
    .description('List catalogued skills (on / off)')
    .action(() => {
      printOutcome(runSkillsList(engine));
    });
}
