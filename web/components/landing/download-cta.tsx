'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BrandIcon } from '@/components/landing/brand-icon'

export type Arch = 'silicon' | 'intel'

export const RELEASE_DMG: Record<Arch, string> = {
  silicon:
    'https://github.com/eric-huychung/skil/releases/latest/download/Skil-arm64.dmg',
  intel:
    'https://github.com/eric-huychung/skil/releases/latest/download/Skil-x64.dmg',
}

const archOptions: { key: Arch; label: string; sub: string }[] = [
  { key: 'silicon', label: 'Apple Silicon', sub: 'M1 · M2 · M3 · M4' },
  { key: 'intel', label: 'Intel', sub: 'Core i5 · i7 · i9' },
]

function InstallCliChip() {
  return (
    <Link href="/cli" className="cli-install-chip">
      <span className="cli-install-prompt text-muted-foreground">$</span>
      git clone skil
    </Link>
  )
}

type DownloadCtaProps = {
  /** Center the control (hero) vs. left-align (inline sections). */
  align?: 'center' | 'start'
  /**
   * "compact" is the hero row: Download + View source + Install CLI.
   * "detailed" adds the Apple Silicon / Intel chip picker above that row
   * and grabs the .dmg. "nav" is a two-button pair sized for the header.
   */
  variant?: 'compact' | 'detailed' | 'nav'
  arch?: Arch
  onArchChange?: (arch: Arch) => void
  /** Hide the brew chip — app download page already has a curl path. */
  showCli?: boolean
}

/**
 * macOS download control. Compact/nav send you to /app for the Gatekeeper
 * notes. Detailed grabs the unsigned .dmg for the chip you picked.
 */
export function DownloadCta({
  align = 'center',
  variant = 'detailed',
  arch: archProp,
  onArchChange,
  showCli = true,
}: DownloadCtaProps) {
  const [uncontrolledArch, setUncontrolledArch] = React.useState<Arch>('silicon')
  const arch = archProp ?? uncontrolledArch
  const active = archOptions.find((a) => a.key === arch)!
  const isDetailed = variant === 'detailed'
  const isNav = variant === 'nav'
  const isCompact = variant === 'compact'

  function selectArch(next: Arch) {
    onArchChange?.(next)
    if (archProp === undefined) setUncontrolledArch(next)
  }

  return (
    <div
      className={`flex flex-col ${isCompact ? 'hero-cta gap-4' : 'gap-5'} ${
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
                onClick={() => selectArch(option.key)}
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
          className={
            isNav ? 'primary-button px-4' : isCompact ? 'primary-button' : 'primary-button px-6'
          }
          render={
            isDetailed ? (
              <a href={RELEASE_DMG[arch]} />
            ) : (
              <Link href="/app" />
            )
          }
        >
          <BrandIcon src="/logos/apple.svg" className="size-4" />
          {isDetailed ? `Download for ${active.label}` : 'Download for Mac'}
        </Button>
        <Button
          size={isNav ? 'default' : 'lg'}
          nativeButton={false}
          className={
            isNav ? 'outline-button px-4' : isCompact ? 'outline-button' : 'outline-button px-6'
          }
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
        {!isNav && showCli && <InstallCliChip />}
      </div>

      {isDetailed && (
        <p className="text-xs text-muted-foreground">
          macOS 12+ · unsigned .dmg ·{' '}
          <a
            href="https://github.com/eric-huychung/skil/releases"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-muted-foreground/40 underline-offset-2 hover:text-foreground"
          >
            GitHub Releases
          </a>
        </p>
      )}

      {isCompact && (
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          Free and open source. No Login.
        </p>
      )}
    </div>
  )
}
