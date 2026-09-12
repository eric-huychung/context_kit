import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingLayout } from '@/components/landing/marketing-layout'
import { PageIntro } from '@/components/landing/page-intro'

export const metadata: Metadata = {
  title: 'About Skil — agent skills, filed onto workflows',
  description:
    'Skil finds agent skills in your repo, files them onto workflows like /build, and shows which ones still earn their tokens. Open source. No login.',
}

const pillars = [
  {
    title: 'Find',
    body: 'Search skills.sh rankings, preview a SKILL.md, and install into the project. Suggest picks from the repo you actually have open.',
  },
  {
    title: 'Organize',
    body: 'File skills onto commands like /build. On writes the live pair (.agents + .claude). Off parks under .skil/parked — nothing is deleted.',
  },
  {
    title: 'Evaluate',
    body: 'Doctor flags idle cost, conflicts, and dead skills. Usage shows whether a skill actually got read. Keep the catalog honest.',
  },
]

export default function AboutPage() {
  return (
    <MarketingLayout>
      <section className="px-4 pt-40 pb-24 sm:px-6 sm:pb-32">
        <div className="mx-auto max-w-6xl">
          <PageIntro kicker="Product" title="About Skil">
            <p>
              Give your agent skills a home. Connect a repo — no login — and
              Skil scans .cursor / .claude / .codex / .agents, files skills onto
              SDLC commands, and tells you which ones still earn their spot.
            </p>
          </PageIntro>

          <dl className="mt-14 grid gap-4 sm:grid-cols-3">
            {pillars.map((item) => (
              <div key={item.title} className="glass-panel rounded-3xl p-6">
                <dt className="font-sans text-base font-semibold">{item.title}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-12 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Open source. macOS app + CLI. State lives in{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px]">
              .skil/state.json
            </code>{' '}
            in your repo. More of this story later —{' '}
            <Link href="/app" className="text-foreground underline-offset-4 hover:underline">
              download the app
            </Link>
            {' '}or{' '}
            <Link href="/cli" className="text-foreground underline-offset-4 hover:underline">
              run the CLI
            </Link>
            .
          </p>
        </div>
      </section>
    </MarketingLayout>
  )
}
