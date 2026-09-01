import { DownloadCta } from '@/components/landing/download-cta'

export function FooterCta() {
  return (
    <section id="download" className="px-4 pb-24 sm:px-6">
      <div className="glass-panel-strong relative mx-auto max-w-3xl overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12 sm:py-16">
        <div
          aria-hidden="true"
          className="ambient-glow pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        />

        <h2 className="text-balance font-sans text-3xl font-semibold tracking-tight sm:text-4xl">
          Stop losing track of your skills.
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-pretty text-muted-foreground">
          Download the Mac app and see everything Skil finds in under a
          minute.
        </p>

        <div className="mt-9 flex justify-center">
          <DownloadCta />
        </div>
      </div>
    </section>
  )
}
