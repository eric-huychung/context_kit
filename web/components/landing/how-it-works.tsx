import { Search, FolderKanban, Stethoscope } from 'lucide-react'

const steps = [
  {
    icon: Search,
    tag: 'Discovery',
    problem: 'Too many skills to pick from.',
    description:
      "Browse skills.sh's leaderboard (Top or Trending), or search by name — no API key. Run `skil suggest` for picks matched to this project's package.json.",
  },
  {
    icon: FolderKanban,
    tag: 'Management',
    problem: 'Skills pile up, scattered across tools.',
    description:
      'One scan reads .cursor, .claude, .codex, and .agents into a single catalog. File skills onto SDLC commands like /build, then toggle on — it writes .agents + .claude at once. Toggle off parks it; nothing is deleted.',
  },
  {
    icon: Stethoscope,
    tag: 'Evaluation',
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

        <ol className="mt-14 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {steps.map((step) => (
            <li
              key={step.tag}
              className="glass-panel flex flex-col gap-4 rounded-3xl p-6"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-blue)] text-[var(--accent-blue-foreground)]">
                  <step.icon className="size-5" />
                </span>
                <span className="font-mono text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {step.tag}
                </span>
              </div>
              <div>
                <h3 className="font-sans text-base font-semibold">
                  {step.problem}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
