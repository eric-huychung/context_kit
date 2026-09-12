export type SkillSource = '.cursor' | '.claude' | '.codex' | '.agents'

export type InboxSkill = {
  id: string
  name: string
  source: SkillSource
}

export type Command = {
  id: string
  name: string
  skillIds: string[]
  enabled: boolean
}

export const inboxSkills: InboxSkill[] = [
  { id: 'agent-browser', name: 'agent-browser', source: '.cursor' },
  { id: 'find-skills', name: 'find-skills', source: '.claude' },
  { id: 'frontend-design', name: 'frontend-design', source: '.cursor' },
  { id: 'grill-me', name: 'grill-me', source: '.codex' },
  { id: 'tdd', name: 'tdd', source: '.agents' },
]

export const commands: Command[] = [
  {
    id: 'planning',
    name: '/planning',
    skillIds: ['find-skills', 'tdd'],
    enabled: true,
  },
  {
    id: 'build',
    name: '/build',
    skillIds: ['frontend-design', 'find-skills'],
    enabled: true,
  },
  {
    id: 'test',
    name: '/testing',
    skillIds: [],
    enabled: false,
  },
  {
    id: 'review',
    name: '/review',
    skillIds: ['grill-me'],
    enabled: true,
  },
]

export const commandStages = [
  { label: 'Planning', ids: ['planning'] },
  { label: 'Build', ids: ['build'] },
  { label: 'Testing', ids: ['test'] },
  { label: 'Review', ids: ['review'] },
] as const

export const skillReads: Record<string, number> = {
  'frontend-design': 12,
  'find-skills': 4,
  tdd: 0,
  'grill-me': 2,
  'agent-browser': 0,
}

export const leaderboardPreview = [
  { rank: 1, name: 'find-skills', installs: '412k' },
  { rank: 2, name: 'frontend-design', installs: '188k' },
  { rank: 3, name: 'tdd', installs: '96k' },
  { rank: 4, name: 'agent-browser', installs: '71k' },
  { rank: 5, name: 'grill-me', installs: '54k' },
]

export const doctorFindings = [
  {
    label: 'Always loaded',
    skillId: 'frontend-design',
    message: 'Loaded on every /build turn',
  },
  {
    label: 'Fat file',
    skillId: 'grill-me',
    message: '8.2k tokens in SKILL.md',
  },
  {
    label: 'Unused',
    skillId: 'agent-browser',
    message: '0 reads in 14 days',
  },
]

export const syncPreview = {
  path: '~/Projects/skil',
  scanned: '3:08 PM',
  skills: 26,
  commands: 4,
  rules: 8,
  leftovers: 4,
  recents: [
    { name: 'skil', path: 'SWE/PROJECTS/skil', current: true },
    { name: 'marketing-site', path: 'SWE/PROJECTS/marketing-site', current: false },
    { name: 'cli-tools', path: 'SWE/PROJECTS/cli-tools', current: false },
    { name: 'docs', path: 'SWE/PROJECTS/docs', current: false },
    { name: 'playground', path: 'SWE/PROJECTS/playground', current: false },
  ],
}

export const cliPreview: { type: 'comment' | 'command' | 'output'; text: string }[] = [
  { type: 'comment', text: '# from your project folder' },
  { type: 'command', text: 'skil scan' },
  { type: 'output', text: '✓ Found 52 skills across 4 sources' },
  { type: 'comment', text: '# toggle on — writes .agents + .claude' },
  { type: 'command', text: 'skil enable build' },
  { type: 'comment', text: '# flag idle-cost, conflicts, dead skills' },
  { type: 'command', text: 'skil doctor' },
  { type: 'output', text: '✓ build: 340 tok · 0 warn' },
]
