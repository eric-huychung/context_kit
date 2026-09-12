'use client'

import * as React from 'react'
import { Check, Copy, ShieldAlert, Terminal } from 'lucide-react'
import {
  DownloadCta,
  RELEASE_DMG,
  type Arch,
} from '@/components/landing/download-cta'

const XATTR_COMMAND = 'xattr -cr /Applications/Skil.app'

const openAnywaySteps = [
  'Drag Skil into Applications.',
  'Open it. If macOS blocks it: System Settings → Privacy & Security → Open Anyway.',
  'Password or Touch ID. Once is enough.',
]

function CopyBlock({
  label,
  text,
}: {
  label: string
  text: string
}) {
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

export function AppInstall() {
  const [arch, setArch] = React.useState<Arch>('silicon')
  const curlCommand = `curl -L -o ~/Downloads/skil.dmg \\\n  ${RELEASE_DMG[arch]}\nopen ~/Downloads/skil.dmg`

  return (
    <div id="download" className="mt-10">
      <DownloadCta
        variant="detailed"
        align="start"
        arch={arch}
        onArchChange={setArch}
        showCli={false}
      />

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <article className="glass-panel flex flex-col gap-5 rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-blue)] text-[var(--accent-blue-foreground)]">
              <ShieldAlert className="size-5" aria-hidden="true" />
            </span>
            <span className="font-mono text-xs font-medium uppercase tracking-wide text-muted-foreground">
              After you download
            </span>
          </div>
          <div>
            <h2 className="font-sans text-xl font-semibold tracking-tight">
              macOS will yell. That&apos;s on me.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Unsigned on purpose — no Apple tax. Gatekeeper gets spooked.
              Click Open Anyway once and you&apos;re done.
            </p>
          </div>
          <ol className="flex flex-col gap-3">
            {openAnywaySteps.map((step, index) => (
              <li key={step} className="flex items-start gap-3 text-sm leading-relaxed">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-blue)]/15 font-mono text-xs font-medium text-[var(--accent-blue)]"
                >
                  {index + 1}
                </span>
                <span className="text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </article>

        <article className="glass-panel flex flex-col gap-5 rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-blue)] text-[var(--accent-blue-foreground)]">
              <Terminal className="size-5" aria-hidden="true" />
            </span>
            <span className="font-mono text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Or skip the scare
            </span>
          </div>
          <div>
            <h2 className="font-sans text-xl font-semibold tracking-tight">
              Curl it. No quarantine stamp.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Browser downloads get quarantined. Curl doesn&apos;t. Uses the
              chip you picked above.
            </p>
          </div>
          <CopyBlock label="download" text={curlCommand} />
          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              Drag it into Applications, then clear the flag if it still sulks:
            </p>
            <CopyBlock label="xattr" text={XATTR_COMMAND} />
          </div>
        </article>
      </div>
    </div>
  )
}
