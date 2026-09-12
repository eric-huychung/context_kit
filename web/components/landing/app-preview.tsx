import {
  BookOpen,
  CheckCircle2,
  Compass,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Terminal,
  ToggleLeft,
  ToggleRight,
  TriangleAlert,
  Zap,
} from 'lucide-react'
import {
  commandStages,
  commands,
  doctorFindings,
  inboxSkills,
  leaderboardPreview,
  skillReads,
} from '@/lib/preview-data'
import { cn } from '@/lib/utils'

export type PreviewScene = 'discover' | 'commands' | 'doctor'

const railTabs = [
  { id: 'config', icon: RefreshCw },
  { id: 'search', icon: Compass },
  { id: 'inbox', icon: Zap },
  { id: 'collections', icon: Terminal },
  { id: 'rules', icon: BookOpen },
  { id: 'settings', icon: Settings },
] as const

const selectedCommand = commands[1]

function skillById(id: string) {
  return inboxSkills.find((skill) => skill.id === id)
}

function OnOff({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 text-xs font-medium',
        on ? 'text-[var(--accent-blue)]' : 'text-muted-foreground',
      )}
    >
      {on ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
      {on ? 'On' : 'Off'}
    </span>
  )
}

function HealthMark() {
  return (
    <span className="absolute -top-1 -right-1 grid size-3 place-items-center rounded-full bg-background text-amber-500">
      <TriangleAlert className="size-2.5 fill-current" />
    </span>
  )
}

function Chrome() {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5">
      <span className="size-2.5 rounded-full bg-destructive/70" />
      <span className="size-2.5 rounded-full bg-[var(--accent-blue)]/50" />
      <span className="size-2.5 rounded-full bg-muted-foreground/30" />
      <div className="glass-panel ml-3 flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1 text-center text-xs text-muted-foreground">
        <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
        skil — desktop app
      </div>
    </div>
  )
}

function Rail({ active }: { active: (typeof railTabs)[number]['id'] }) {
  return (
    <div className="glass-panel flex flex-col items-center gap-3 rounded-2xl py-4">
      {railTabs.map(({ id, icon: Icon }, i) => (
        <span
          key={id}
          className={cn(
            'animate-in fade-in flex size-9 items-center justify-center rounded-xl duration-500',
            id === active
              ? 'bg-[var(--accent-blue)] text-[var(--accent-blue-foreground)]'
              : 'text-muted-foreground',
          )}
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <Icon className="size-4" />
        </span>
      ))}
    </div>
  )
}

function CommandList({ marked }: { marked?: boolean }) {
  return (
    <div className="glass-panel hidden flex-col gap-3 rounded-2xl p-3 sm:flex">
      {commandStages.map((stage) => {
        const rows = commands.filter((command) =>
          (stage.ids as readonly string[]).includes(command.id),
        )
        return (
          <div key={stage.label} className="flex flex-col gap-1.5">
            <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {stage.label}
            </p>
            {rows.map((command) => (
              <div
                key={command.id}
                className={cn(
                  'relative flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm',
                  command.id === selectedCommand.id
                    ? 'glass-panel-strong font-medium'
                    : 'text-muted-foreground',
                )}
              >
                {marked && command.id === selectedCommand.id ? <HealthMark /> : null}
                <div className="min-w-0 font-mono text-[13px]">
                  {command.name}
                  <p className="mt-0.5 font-sans text-xs font-normal text-muted-foreground/80">
                    {command.skillIds.length}{' '}
                    {command.skillIds.length === 1 ? 'skill' : 'skills'}
                  </p>
                </div>
                <OnOff on={command.enabled} />
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function CommandsDetail() {
  const included = selectedCommand.skillIds
    .map(skillById)
    .filter((skill): skill is NonNullable<typeof skill> => Boolean(skill))

  return (
    <div className="glass-panel flex flex-col gap-4 rounded-2xl p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Command
          </p>
          <p className="mt-1 font-sans text-xl font-semibold">{selectedCommand.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {included.length} {included.length === 1 ? 'skill' : 'skills'}
          </p>
        </div>
        <div className="flex flex-row flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          <OnOff on={selectedCommand.enabled} />
          <p className="font-mono text-[11px] text-muted-foreground">340 tokens</p>
          <span className="inline-flex items-center gap-1.5 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-500">
            <CheckCircle2 className="size-3.5" />
            0 warnings
          </span>
        </div>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Included skills
        </p>
        <div className="mt-2 flex flex-col gap-1.5">
          {included.map((skill) => (
            <div
              key={skill.id}
              className="relative flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm glass-panel"
            >
              <span>{skill.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {skillReads[skill.id] ?? 0} reads
                </span>
                <span className="rounded-full bg-[var(--accent-blue)]/15 px-2 py-0.5 font-mono text-[10px] font-medium text-[var(--accent-blue)]">
                  {skill.source}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DoctorPanel() {
  return (
    <div className="glass-panel flex flex-col gap-4 rounded-2xl p-4 sm:p-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Doctor
        </p>
        <p className="mt-1 font-sans text-xl font-semibold">Health</p>
        <p className="mt-1 text-sm text-muted-foreground">
          /build · 340 tokens · 2 warnings
        </p>
      </div>
      <ul className="flex flex-col gap-1.5">
        {doctorFindings.map((finding) => (
          <li
            key={finding.skillId}
            className="glass-panel flex items-start justify-between gap-3 rounded-lg px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{finding.label}</p>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                {finding.skillId}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{finding.message}</p>
            </div>
            <span className="shrink-0 rounded-lg border border-[rgb(var(--glass-border))] px-2 py-1 text-xs text-muted-foreground">
              Ignore
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DiscoverScene() {
  return (
    <div className="grid grid-cols-[64px_1fr] gap-3">
      <Rail active="search" />
      <div className="glass-panel flex flex-col gap-3 rounded-2xl p-4 sm:p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Workspace
          </p>
          <p className="mt-1 font-sans text-xl font-semibold">Discover</p>
        </div>
        <div className="search-box pointer-events-none">
          <Search className="size-4" />
          <span className="text-sm">Search skills</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {['Top', 'Trending', 'SWE', 'UI/UX'].map((label, i) => (
            <span
              key={label}
              className={cn(
                'rounded-[var(--radius-hover)] border px-3 py-1.5 text-sm font-medium',
                i === 0
                  ? 'border-transparent bg-[var(--accent-blue)] text-[var(--accent-blue-foreground)]'
                  : 'border-[rgb(var(--glass-border))] text-muted-foreground',
              )}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-2.5">
          {leaderboardPreview.map((skill) => (
            <div key={skill.name} className="library-skill">
              <span className="skill-rank">{skill.rank}</span>
              <div className="skill-info">
                <div className="skill-name">{skill.name}</div>
              </div>
              <div className="skill-actions">
                <span className="skill-installs">{skill.installs}</span>
                <span className="grid size-8 place-items-center rounded-lg text-muted-foreground">
                  <Plus className="size-4" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CommandsScene({ warnings }: { warnings: boolean }) {
  return (
    <div className="grid grid-cols-[64px_1fr] gap-3 sm:grid-cols-[72px_210px_1fr]">
      <Rail active="collections" />
      <CommandList marked={warnings} />
      {warnings ? <DoctorPanel /> : <CommandsDetail />}
    </div>
  )
}

export function AppPreview({ scene = 'commands' }: { scene?: PreviewScene }) {
  return (
    <div
      aria-hidden="true"
      className="glass-panel-strong relative overflow-hidden rounded-3xl p-2 text-left sm:p-3"
    >
      <Chrome />
      {scene === 'discover' ? (
        <DiscoverScene />
      ) : scene === 'doctor' ? (
        <CommandsScene warnings />
      ) : (
        <CommandsScene warnings={false} />
      )}
    </div>
  )
}
