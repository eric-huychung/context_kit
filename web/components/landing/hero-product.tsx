import {
  BookOpen,
  Clock,
  Compass,
  Folder,
  RefreshCw,
  Settings,
  Sun,
  Terminal,
  TriangleAlert,
  X,
  Zap,
} from 'lucide-react'
import { cliPreview, syncPreview } from '@/lib/preview-data'
import { cn } from '@/lib/utils'

const rail = [
  { id: 'sync', icon: RefreshCw, active: true },
  { id: 'discover', icon: Compass, active: false },
  { id: 'skills', icon: Zap, active: false },
  { id: 'commands', icon: Terminal, active: false },
  { id: 'rules', icon: BookOpen, active: false },
  { id: 'settings', icon: Settings, active: false },
] as const

const metrics = [
  { label: 'Skills', count: syncPreview.skills, Icon: Zap },
  { label: 'Commands', count: syncPreview.commands, Icon: Terminal },
  { label: 'Rules', count: syncPreview.rules, Icon: BookOpen },
] as const

function SyncWindow() {
  return (
    <div className="hero-product-window">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="wordmark">Skil</span>
          <span className="inline-flex h-5 items-center rounded-full bg-secondary px-2 text-[10px] font-medium tracking-wide text-muted-foreground">
            BETA
          </span>
        </div>
        <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 sm:flex">
          <span className="glass-panel max-w-md truncate rounded-full px-3 py-1 font-mono text-xs text-muted-foreground">
            {syncPreview.path}
          </span>
          <span className="grid size-8 place-items-center rounded-lg text-muted-foreground">
            <RefreshCw className="size-3.5" />
          </span>
        </div>
        <span className="grid size-8 place-items-center rounded-lg text-muted-foreground">
          <Sun className="size-4" />
        </span>
      </header>

      <div className="flex gap-3 px-3 pb-3">
        <nav className="glass-panel hidden w-14 shrink-0 flex-col items-center gap-2 rounded-2xl py-3 sm:flex">
          {rail.map((item) => (
            <span
              key={item.id}
              className={cn(
                'grid size-9 place-items-center rounded-xl',
                item.active
                  ? 'bg-[var(--accent-blue)] text-[var(--accent-blue-foreground)]'
                  : 'text-muted-foreground',
              )}
            >
              <item.icon className="size-4" />
            </span>
          ))}
        </nav>

        <div className="min-w-0 flex-1 px-2 py-1 sm:px-4 sm:py-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-sans text-2xl font-semibold tracking-tight">Sync</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Last scan of this folder. Re-scan if nothing on disk changed.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-500">
              <TriangleAlert className="size-3.5" />
              {syncPreview.leftovers} leftovers
            </span>
          </div>

          <p className="mt-5 text-sm font-medium">Recent folders</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Last five project folders.</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {syncPreview.recents.map((folder) => (
              <div
                key={folder.path}
                className="glass-panel relative flex items-center gap-2 rounded-2xl px-2.5 py-2 pr-8"
              >
                <Folder className="size-4 shrink-0 text-[var(--accent-blue)]" />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-xs font-medium">
                    {folder.name}
                    {folder.current ? (
                      <span className="rounded-full bg-[var(--accent-blue)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent-blue)]">
                        Current
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate font-mono text-[10px] text-muted-foreground">
                    {folder.path}
                  </p>
                </div>
                <X className="absolute right-2 top-2 size-3 text-muted-foreground" />
              </div>
            ))}
          </div>

          <div className="glass-panel mt-4 flex items-start gap-3 rounded-3xl p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-blue)]/15 text-[var(--accent-blue)]">
              <Folder className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">Project folder</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-emerald-500">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Connected
              </p>
              <p className="mt-2 truncate font-mono text-xs text-muted-foreground">
                {syncPreview.path}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" />
                Last scanned {syncPreview.scanned}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3">
            {metrics.map(({ label, count, Icon }) => (
              <div
                key={label}
                className="glass-panel flex flex-col items-center justify-center rounded-3xl px-3 py-6 text-center"
              >
                <Icon className="size-4 text-[var(--accent-blue)]" />
                <p className="mt-3 font-sans text-3xl font-semibold tracking-tight">{count}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function CliWindow() {
  return (
    <div className="hero-product-cli">
      <div className="flex items-center gap-2 border-b border-[rgb(var(--glass-border))] px-3 py-2">
        <span className="size-2 rounded-full bg-destructive/70" />
        <span className="size-2 rounded-full bg-[var(--accent-blue)]/50" />
        <span className="size-2 rounded-full bg-muted-foreground/30" />
        <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">zsh — skil</span>
      </div>
      <pre className="overflow-hidden px-3 py-3 font-mono text-[12px] leading-relaxed">
        <code className="flex flex-col gap-0.5">
          {cliPreview.map((line, i) => {
            if (line.type === 'comment') {
              return (
                <span key={i} className="text-muted-foreground/70">
                  {line.text}
                </span>
              )
            }
            if (line.type === 'output') {
              return (
                <span key={i} className="text-emerald-500">
                  {line.text}
                </span>
              )
            }
            return (
              <span key={i} className="text-foreground">
                <span className="mr-2 text-[var(--accent-blue)]">$</span>
                {line.text}
              </span>
            )
          })}
        </code>
      </pre>
    </div>
  )
}

export function HeroProduct() {
  return (
    <div className="hero-product px-4 sm:px-6" aria-hidden="true">
      <div className="mx-auto max-w-6xl">
        <div className="hero-product-stage">
          <div className="hero-product-stack">
            <SyncWindow />
            <CliWindow />
          </div>
        </div>
      </div>
    </div>
  )
}
