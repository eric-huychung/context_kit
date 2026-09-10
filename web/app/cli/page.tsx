import type { Metadata } from 'next'
import { MarketingLayout } from '@/components/landing/marketing-layout'
import { CliInstall } from '@/components/landing/cli-install'

export const metadata: Metadata = {
  title: 'Skil CLI — scan, toggle, and doctor from the terminal',
  description:
    'Install skil with Homebrew. Scan your repo, enable commands, and run doctor — scriptable for CI with no login required.',
}

const commands = [
  { cmd: 'skil scan', desc: 'List skills across .cursor, .claude, .codex, and .agents' },
  { cmd: 'skil enable <command>', desc: 'Turn on a command — writes .agents + .claude' },
  { cmd: 'skil disable <command>', desc: 'Park a command under .skil/parked — nothing deleted' },
  { cmd: 'skil doctor', desc: 'Flag idle-cost, fat bodies, conflicts, and dead skills' },
  { cmd: 'skil suggest', desc: 'Rank market skills for this repo (optional LLM key)' },
  { cmd: 'skil install <id>', desc: 'Install a skills.sh skill into the live pair' },
]

export default function CliPage() {
  return (
    <MarketingLayout>
      <CliInstall />

      <section className="px-4 pb-24 sm:px-6 sm:pb-32">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-sans text-2xl font-semibold tracking-tight sm:text-3xl">
            Command reference
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Same loop as the desktop app — scan, file onto SDLC commands, toggle on,
            doctor. Run <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">skil --help</code> for the full list.
          </p>

          <ul className="mt-8 flex flex-col gap-3">
            {commands.map((item) => (
              <li key={item.cmd} className="glass-panel rounded-2xl px-5 py-4">
                <code className="font-mono text-sm font-medium text-[var(--accent-blue)]">
                  {item.cmd}
                </code>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </MarketingLayout>
  )
}
