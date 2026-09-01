import { Bot } from 'lucide-react'

type Tool = {
  name: string
  folder: string
  /** Path to a monochrome SVG used as a CSS mask, or null to use the fallback icon. */
  logo: string | null
  /** Official brand color, so the mark reads as itself instead of a theme tint. */
  color: string
}

const tools: Tool[] = [
  { name: 'Cursor', folder: '.cursor', logo: '/logos/cursor.svg', color: '#000000' },
  { name: 'Claude Code', folder: '.claude', logo: '/logos/claude.svg', color: '#D97757' },
  { name: 'Codex', folder: '.codex', logo: '/logos/openai.svg', color: '#000000' },
  { name: 'Agents', folder: '.agents', logo: null, color: 'var(--accent-blue)' },
]

export function SupportedTools() {
  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance font-sans text-3xl font-semibold tracking-tight sm:text-4xl">
            Works with the agents you already use
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Skil reads and writes the config folders your tools already
            create — no new format, no migration.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tools.map((tool) => (
            <div
              key={tool.name}
              className="glass-panel flex flex-col items-center gap-3 rounded-3xl px-4 py-8 text-center"
            >
              {/* Fixed light chip (not theme-tinted) so a brand mark's real
                  color — including near-black marks like Cursor/Codex —
                  stays legible in dark mode instead of vanishing or
                  inheriting the page's accent tint. */}
              <span className="flex size-12 items-center justify-center rounded-2xl bg-white">
                {tool.logo ? (
                  <span
                    aria-hidden="true"
                    className="size-6"
                    style={{
                      backgroundColor: tool.color,
                      maskImage: `url(${tool.logo})`,
                      WebkitMaskImage: `url(${tool.logo})`,
                      maskSize: 'contain',
                      WebkitMaskSize: 'contain',
                      maskRepeat: 'no-repeat',
                      WebkitMaskRepeat: 'no-repeat',
                      maskPosition: 'center',
                      WebkitMaskPosition: 'center',
                    }}
                  />
                ) : (
                  <Bot className="size-6" style={{ color: tool.color }} />
                )}
              </span>
              <div>
                <p className="font-sans text-sm font-semibold">{tool.name}</p>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {tool.folder}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
