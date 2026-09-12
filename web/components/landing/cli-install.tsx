'use client'

import * as React from 'react'
import { Check, Copy, Terminal } from 'lucide-react'

const INSTALL_COMMAND = `git clone https://github.com/eric-huychung/skil.git
cd skil && npm install && npm run build
npx skil --help`

const demo: { type: 'comment' | 'command' | 'output'; text: string }[] = [
  { type: 'comment', text: '# from your project folder' },
  { type: 'command', text: 'skil scan' },
  { type: 'output', text: '✓ Found 52 skills across 4 sources' },
  { type: 'comment', text: '# toggle on — writes .agents + .claude' },
  { type: 'command', text: 'skil enable build' },
  { type: 'comment', text: '# flag idle-cost, conflicts, dead skills' },
  { type: 'command', text: 'skil doctor' },
  { type: 'output', text: '✓ build: 340 tok · 0 warn' },
]

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = React.useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="glass-panel-strong overflow-hidden rounded-2xl">
      <div className="glass-hairline flex items-center justify-between gap-3 border-b px-4 py-2">
        <span className="font-mono text-xs text-muted-foreground">{label}</span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={copied ? `Copied ${label}` : `Copy ${label}`}
        >
          {copied ? (
            <Check className="size-3.5 text-emerald-500" aria-hidden="true" />
          ) : (
            <Copy className="size-3.5" aria-hidden="true" />
          )}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-[13px] leading-relaxed">
        <code className="text-foreground">{text}</code>
      </pre>
    </div>
  )
}

export function CliInstall() {
  return (
    <section id="cli" className="px-4 pt-40 pb-24 sm:px-6 sm:pb-32">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
        <div>
          <div className="glass-panel inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground">
            <Terminal className="size-3.5" aria-hidden="true" />
            Also on the command line
          </div>
          <h1 className="mt-5 text-balance font-sans text-3xl font-semibold tracking-tight sm:text-4xl">
            Prefer the terminal? There&apos;s a CLI for that
          </h1>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Same scan, toggle, and doctor loop — just headless. No brew tap
            yet. Clone it, build it, run it from your project folder.
          </p>

          <ul className="mt-6 flex flex-col gap-3 text-sm">
            {[
              'No login or API key — it reads your local repo.',
              'Toggle is the write. On writes the live pair now; off parks it.',
              '`skil doctor` catches idle-cost and conflicts before CI does.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--accent-blue)]" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <CopyBlock label="install" text={INSTALL_COMMAND} />
            <p className="mt-3 text-sm text-muted-foreground">
              Then hop into your project folder and run{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                npx skil
              </code>
              . It reads whatever directory you&apos;re standing in.
            </p>
          </div>
        </div>

        <div className="glass-panel-strong overflow-hidden rounded-3xl">
          <div className="glass-hairline flex items-center gap-2 border-b px-4 py-3">
            <span className="size-2.5 rounded-full bg-destructive/70" />
            <span className="size-2.5 rounded-full bg-[var(--accent-blue)]/50" />
            <span className="size-2.5 rounded-full bg-muted-foreground/30" />
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              zsh — skil
            </span>
          </div>
          <pre className="overflow-x-auto px-5 py-5 font-mono text-[13px] leading-relaxed">
            <code className="flex flex-col gap-1">
              {demo.map((line, i) => {
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
      </div>
    </section>
  )
}
