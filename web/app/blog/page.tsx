import type { Metadata } from 'next'
import { MarketingLayout } from '@/components/landing/marketing-layout'
import { PageIntro } from '@/components/landing/page-intro'

export const metadata: Metadata = {
  title: 'Skil Blog — notes on skills and workflows',
  description:
    'Writing on agent skills, filing them onto workflows, and keeping the catalog honest. First posts coming soon.',
}

const upcoming = [
  {
    title: 'How we file skills onto /build',
    lede: 'A command is a workflow. Filing a skill onto it does not turn the skill on. The toggle does.',
  },
  {
    title: 'Park, don’t delete',
    lede: 'Off means .skil/parked. The folder is still there if you want it back. That’s the whole point.',
  },
  {
    title: 'What “token cost” actually means',
    lede: 'Doctor counts what the agent loads, not what you meant to load. Idle skills are the expensive ones.',
  },
]

export default function BlogPage() {
  return (
    <MarketingLayout>
      <section className="px-4 pt-40 pb-24 sm:px-6 sm:pb-32">
        <div className="mx-auto max-w-6xl">
          <PageIntro kicker="Resources" title="Blog">
            <p>
              Notes on skills, agents, and keeping the catalog honest. Nothing
              published yet — these are the first three in the queue.
            </p>
          </PageIntro>

          <ul className="mt-14 grid gap-4 lg:grid-cols-3">
            {upcoming.map((post) => (
              <li key={post.title} className="glass-panel flex flex-col rounded-3xl p-6">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Coming soon
                </p>
                <h2 className="mt-3 font-sans text-lg font-semibold tracking-tight">
                  {post.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {post.lede}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </MarketingLayout>
  )
}
