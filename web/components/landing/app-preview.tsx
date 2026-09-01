import { BookOpen, Compass, RefreshCw, Terminal, Zap } from 'lucide-react'
import { commands, inboxSkills } from '@/lib/preview-data'

/** Rail order/icons match the real desktop app's tabs (gui/src/renderer/src/App.tsx):
 * Sync, Discover, Skills, Commands, Rules. */
const railTabs = [
  { icon: RefreshCw, active: false },
  { icon: Compass, active: false },
  { icon: Zap, active: false },
  { icon: Terminal, active: true },
  { icon: BookOpen, active: false },
]

export function AppPreview() {
  const previewCommand = commands[1]
  const previewSkills = inboxSkills.slice(0, 4)

  return (
    <div className="glass-panel-strong relative overflow-hidden rounded-3xl p-2 text-left sm:p-3">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="size-2.5 rounded-full bg-destructive/70" />
        <span className="size-2.5 rounded-full bg-[var(--accent-blue)]/50" />
        <span className="size-2.5 rounded-full bg-muted-foreground/30" />
        <div className="glass-panel ml-3 flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1 text-center text-xs text-muted-foreground">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
          skil — desktop app
        </div>
      </div>

      <div className="grid grid-cols-[64px_1fr] gap-3 sm:grid-cols-[72px_240px_1fr]">
        <div className="glass-panel flex flex-col items-center gap-3 rounded-2xl py-4">
          {railTabs.map(({ icon: Icon, active }, i) => (
            <span
              key={i}
              className={`animate-in fade-in flex size-9 items-center justify-center rounded-xl duration-500 ${
                active
                  ? 'bg-[var(--accent-blue)] text-[var(--accent-blue-foreground)]'
                  : 'text-muted-foreground'
              }`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <Icon className="size-4" />
            </span>
          ))}
        </div>

        <div className="glass-panel hidden flex-col gap-2 rounded-2xl p-3 sm:flex">
          <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Commands
          </p>
          {commands.map((c, i) => (
            <div
              key={c.id}
              className={`animate-in fade-in slide-in-from-bottom-1 flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm duration-500 ${
                c.id === previewCommand.id
                  ? 'glass-panel-strong font-medium'
                  : 'text-muted-foreground'
              }`}
              style={{ animationDelay: `${120 + i * 80}ms` }}
            >
              <div>
                {c.name}
                <p className="mt-0.5 text-xs text-muted-foreground/80">
                  {c.skillIds.length} {c.skillIds.length === 1 ? 'skill' : 'skills'}
                </p>
              </div>
              <span
                aria-hidden="true"
                className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                  c.id === previewCommand.id
                    ? 'bg-[var(--accent-blue)]'
                    : 'bg-muted-foreground/25'
                }`}
              >
                <span
                  className={`absolute size-3 rounded-full bg-white transition-transform ${
                    c.id === previewCommand.id ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`}
                />
              </span>
            </div>
          ))}
        </div>

        <div
          className="animate-in fade-in glass-panel flex flex-col gap-4 rounded-2xl p-4 duration-500 sm:p-5"
          style={{ animationDelay: '360ms' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Command
              </p>
              <p className="mt-1 font-sans text-xl font-semibold">{previewCommand.name}</p>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 font-mono text-[11px] text-emerald-500">
              340 tok · 0 warn
            </span>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Included skills
            </p>
            <div className="mt-2 flex flex-col gap-1.5">
              {previewSkills.map((skill, i) => (
                <div
                  key={skill.id}
                  className="animate-in fade-in glass-panel flex items-center justify-between rounded-lg px-3 py-2 text-sm duration-500"
                  style={{ animationDelay: `${420 + i * 60}ms` }}
                >
                  <span>{skill.name}</span>
                  <span className="rounded-full bg-[var(--accent-blue)]/15 px-2 py-0.5 font-mono text-[10px] font-medium text-[var(--accent-blue)]">
                    {skill.source}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
