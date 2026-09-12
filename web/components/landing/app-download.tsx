import { Download } from 'lucide-react'
import { AppPreview } from '@/components/landing/app-preview'
import { AppInstall } from '@/components/landing/app-install'

export function AppDownload() {
  return (
    <section id="app" className="px-4 pt-40 pb-24 sm:px-6 sm:pb-32">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <div className="glass-panel inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground">
            <Download className="size-3.5" aria-hidden="true" />
            macOS desktop app
          </div>
          <h1 className="mt-5 text-balance font-sans text-3xl font-semibold tracking-tight sm:text-4xl">
            See every skill in your repo in under a minute
          </h1>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Connect a folder, scan .cursor / .claude / .codex / .agents, file
            skills onto SDLC commands, and toggle them on — all from one window.
          </p>

          <ul className="mt-6 flex flex-col gap-3 text-sm">
            {[
              'No login or account — state lives in .skil/state.json in your repo.',
              'Toggle on writes .agents + .claude at once; off parks it, nothing deleted.',
              'Discover, Commands, Skills, and Rules in one window.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--accent-blue)]" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <AppInstall />

        <div className="mt-16">
          <AppPreview />
        </div>
      </div>
    </section>
  )
}
