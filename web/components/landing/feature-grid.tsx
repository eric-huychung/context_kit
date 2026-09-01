import { ShieldOff, GitFork, HardDrive } from 'lucide-react'

const features = [
  {
    icon: ShieldOff,
    title: 'Nothing is ever deleted',
    description:
      'Toggle off parks a skill or command under .skil/parked — it never deletes. Toggle on restores it.',
  },
  {
    icon: GitFork,
    title: 'One list, not five copies',
    description:
      'No dock picker. One catalog, one command map, mirrored to .agents and .claude at once.',
  },
  {
    icon: HardDrive,
    title: 'Local-first, always',
    description:
      'State lives in .skil/state.json in your repo. No account, no server sync, nothing to lose.',
  },
]

export function FeatureGrid() {
  return (
    <section id="features" className="px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h2 className="text-balance font-sans text-3xl font-semibold tracking-tight sm:text-4xl">
            Built to stay out of your way
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="glass-panel flex flex-col gap-4 rounded-3xl p-6"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-blue)]/12 text-[var(--accent-blue)]">
                <feature.icon className="size-5" />
              </span>
              <div>
                <h3 className="font-sans text-base font-semibold">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
