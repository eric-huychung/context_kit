import type { ReactNode } from 'react'

export function PageIntro({
  kicker,
  title,
  children,
}: {
  kicker?: string
  title: string
  children?: ReactNode
}) {
  return (
    <header className="max-w-2xl">
      {kicker ? (
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {kicker}
        </p>
      ) : null}
      <h1 className="mt-3 text-balance font-sans text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      {children ? (
        <div className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
          {children}
        </div>
      ) : null}
    </header>
  )
}
