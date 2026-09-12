import { DownloadCta } from '@/components/landing/download-cta'
import { HeroProduct } from '@/components/landing/hero-product'
import { WhatsNew } from '@/components/landing/whats-new'

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-36 pb-0 sm:pt-44">
      <div
        aria-hidden="true"
        className="ambient-glow pointer-events-none absolute left-1/2 top-0 -z-10 h-[560px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full blur-3xl"
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-12">
          <div>
            <div className="glass-panel mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              macOS App + CLI
            </div>

            <h1 className="font-sans text-6xl font-semibold leading-[1.05] tracking-tight sm:text-7xl lg:text-[5rem]">
              More skills, but{' '}
              <span className="text-[var(--accent-blue)]">organized</span>.
            </h1>

            <p className="mt-6 max-w-xl text-pretty text-xl leading-relaxed text-muted-foreground">
              Find skills, organize them, and kill the dead ones.
            </p>

            <div className="mt-10">
              <DownloadCta variant="compact" align="start" />
            </div>
          </div>

          <div className="hidden lg:block">
            <WhatsNew />
          </div>
        </div>
      </div>

      <HeroProduct />
    </section>
  )
}
