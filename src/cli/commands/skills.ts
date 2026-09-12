import Table from 'cli-table3';
import type { Command } from 'commander';
import type { ICollectionEngine } from '../../interfaces/engine.js';
import { skillPathState } from '../../core/dock-layout.js';
import { isOk } from '../../core/result.js';
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

export async function runSkillsSetEnabled(
  engine: ICollectionEngine,
  id: string,
  enabled: boolean
): Promise<CommandOutcome> {
  const result = await engine.setSkillEnabled(id, enabled);
  if (!isOk(result)) {
    return { message: result.error.message, isError: true };
  }

  return {
    message: `Set skill '${result.value.id}' to ${enabled ? 'on' : 'off'}`,
    isError: false,
  };
}

export function registerSkillsCommand(program: Command, engine: ICollectionEngine): void {
  const skills = program
    .command('skills')
    .description('List catalogued skills (on / off)')
    .action(() => {
      printOutcome(runSkillsList(engine));
    });

  skills
    .command('enable <id>')
    .description('Turn a skill on: restores the live pair (.agents/skills + .claude/skills)')
    .action(async (id: string) => {
      printOutcome(await runSkillsSetEnabled(engine, id, true));
    });

  skills
    .command('disable <id>')
    .description('Turn a skill off: parks it under .skil/parked/skills/<id>')
    .action(async (id: string) => {
      printOutcome(await runSkillsSetEnabled(engine, id, false));
    });
}
