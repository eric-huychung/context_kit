import { Search, FolderKanban, Stethoscope } from 'lucide-react'
import { AppPreview, type PreviewScene } from '@/components/landing/app-preview'
import { cn } from '@/lib/utils'

const steps: Array<{
  icon: typeof Search
  tag: string
  scene: PreviewScene
  problem: string
  description: string
}> = [
  {
    icon: Search,
    tag: 'Discovery',
    scene: 'discover',
    problem: 'Too many skills to pick from.',
    description:
      "Browse skills.sh's leaderboard (Top or Trending), or search by name — no API key. Run `skil suggest` for picks matched to this project's package.json.",
  },
  {
    icon: FolderKanban,
    tag: 'Management',
    scene: 'commands',
    problem: 'Skills pile up, scattered across tools.',
    description:
      'One scan reads .cursor, .claude, .codex, and .agents into a single catalog. File skills onto SDLC commands like /build, then toggle on — it writes .agents + .claude at once. Toggle off parks it; nothing is deleted.',
  },
  {
    icon: Stethoscope,
    tag: 'Evaluation',
    scene: 'doctor',
    problem: 'No idea which skills still earn their spot.',
    description:
      '`skil doctor` flags idle-cost, fat bodies, conflicts, and dead skills — no LLM key required. Usage counts show what actually gets read.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h2 className="text-balance font-sans text-3xl font-semibold tracking-tight sm:text-4xl">
            Three problems. One map.
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Skil doesn&apos;t invent a new format. It reads what your agents
            already use and gives it structure.
          </p>
        </div>

        <ol className="mt-16 space-y-20">
          {steps.map((step, index) => (
            <li
              key={step.tag}
              className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12"
            >
              <div className={cn(index % 2 === 1 && 'lg:order-2')}>
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-blue)] text-[var(--accent-blue-foreground)]">
                    <step.icon className="size-5" />
                  </span>
                  <span className="font-mono text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {step.tag}
                  </span>
                </div>
                <h3 className="mt-5 font-sans text-2xl font-semibold tracking-tight">
                  {step.problem}
                </h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {step.description}
                </p>
              </div>
              <div className={cn(index % 2 === 1 && 'lg:order-1')}>
                <AppPreview scene={step.scene} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
