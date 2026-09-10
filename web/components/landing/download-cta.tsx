'use client'

import * as React from 'react'
import Link from 'next/link'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandIcon } from '@/components/landing/brand-icon'

type Arch = 'silicon' | 'intel'

const archOptions: { key: Arch; label: string; sub: string }[] = [
  { key: 'silicon', label: 'Apple Silicon', sub: 'M1 · M2 · M3 · M4' },
  { key: 'intel', label: 'Intel', sub: 'Core i5 · i7 · i9' },
]

function InstallCliChip() {
  const [copied, setCopied] = React.useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText('brew install skil')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="cli-install-chip"
    >
      <span className="cli-install-prompt text-muted-foreground">$</span>
      brew install skil
      {copied ? (
        <Check className="size-3.5 text-emerald-500" />
      ) : (
        <Copy className="size-3.5 text-muted-foreground" />
      )}
    </button>
  )
}

type DownloadCtaProps = {
  /** Center the control (hero) vs. left-align (inline sections). */
  align?: 'center' | 'start'
  /**
   * "compact" is the hero row: Download + View source + Install CLI.
   * "detailed" adds the Apple Silicon / Intel chip picker above that row
   * (closing CTA). "nav" is a two-button pair sized for the header.
   */
  variant?: 'compact' | 'detailed' | 'nav'
}

/**
 * macOS download control. "detailed" adds an Apple Silicon / Intel chip
 * selector above the button row. All variants share the same three
 * actions as the hero — download, view source, install CLI — so the nav
 * never offers something the hero doesn't.
 */
export function DownloadCta({
  align = 'center',
  variant = 'detailed',
}: DownloadCtaProps) {
  const [arch, setArch] = React.useState<Arch>('silicon')
  const active = archOptions.find((a) => a.key === arch)!
  const isDetailed = variant === 'detailed'
  const isNav = variant === 'nav'

  return (
    <div
      className={`flex flex-col gap-5 ${
        align === 'center' ? 'items-center' : 'items-start'
      }`}
    >
      {isDetailed && (
        <div
          role="radiogroup"
          aria-label="Choose your Mac chip"
          className="grid w-full grid-cols-2 gap-2.5 sm:w-[380px]"
        >
          {archOptions.map((option) => {
            const selected = option.key === arch
            return (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setArch(option.key)}
                className={`relative flex flex-col items-start gap-0.5 rounded-xl border px-4 py-3 text-left transition-colors ${
                  selected
                    ? 'border-[var(--accent-blue)]/60 bg-[var(--accent-blue)]/10'
                    : 'border-border/60 bg-transparent hover:border-border hover:bg-muted/40'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute right-3 top-3 flex size-4 items-center justify-center rounded-full border transition-colors ${
                    selected
                      ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]'
                      : 'border-border'
                  }`}
                >
                  {selected && (
                    <span className="size-1.5 rounded-full bg-[var(--accent-blue-foreground)]" />
                  )}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {option.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {option.sub}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div
        className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap ${
          align === 'center' ? 'items-center justify-center' : 'items-start'
        }`}
      >
        <Button
          size={isNav ? 'default' : 'lg'}
          nativeButton={false}
          className={isNav ? 'primary-button px-4' : 'primary-button px-6'}
          render={<Link href="/app" />}
        >
          <BrandIcon src="/logos/apple.svg" className="size-4" />
          {isDetailed ? `Download for ${active.label}` : 'Download for Mac'}
        </Button>
        <Button
          size={isNav ? 'default' : 'lg'}
          nativeButton={false}
          className={isNav ? 'outline-button px-4' : 'outline-button px-6'}
          render={
            <a
              href="https://github.com/eric-huychung/skil"
              target="_blank"
              rel="noreferrer"
            />
          }
        >
          <BrandIcon src="/logos/github.svg" className="size-4" />
          View source
        </Button>
        {!isNav && <InstallCliChip />}
      </div>

      {isDetailed && (
        <p className="text-xs text-muted-foreground">
          macOS 12 Monterey or later · Universal .dmg also available
        </p>
      )}
    </div>
  )
}
