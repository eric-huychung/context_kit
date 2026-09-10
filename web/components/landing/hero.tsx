import { DownloadCta } from '@/components/landing/download-cta'
import { AppPreview } from '@/components/landing/app-preview'
import { WhatsNew } from '@/components/landing/whats-new'

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-40 pb-24 sm:pt-48 sm:pb-32">
      <div
        aria-hidden="true"
        className="ambient-glow pointer-events-none absolute left-1/2 top-0 -z-10 h-[560px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full blur-3xl"
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_260px]">
          <div className="max-w-2xl">
            <div className="glass-panel mb-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Open source. macOS app + CLI. No login.
            </div>

            <h1 className="text-balance font-sans text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
              Give your agent skills a{' '}
              <span className="text-[var(--accent-blue)]">home</span>
            </h1>

            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Find the right skill fast, keep them organized by workflow, and
              see which ones still earn their spot.
            </p>

            <div className="mt-10">
              <DownloadCta variant="compact" align="start" />
            </div>
          </div>

          <div className="hidden lg:block">
            <WhatsNew />
          </div>
        </div>

        <div className="mt-16">
          <AppPreview />
        </div>
      </div>
    </section>
  )
}
