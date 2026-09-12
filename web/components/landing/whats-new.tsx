const whatsNew = [
  {
    title: 'Beta release',
    body: 'macOS App + CLI + Leaderboard',
  },
  {
    title: 'Website release',
    body: 'About + Blog + FAQs',
  },
  {
    title: 'GitHub setup',
    body: '.dmg packages + Releases',
  },
]

export function WhatsNew() {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground">
        <span className="size-1.5 rounded-full bg-[var(--accent-blue)]" />
        WHAT&apos;S NEW
      </p>
      <ul className="mt-4 flex flex-col divide-y divide-[rgb(var(--glass-border))]">
        {whatsNew.map((item) => (
          <li key={item.title} className="py-3.5 first:pt-0">
            <p className="text-base font-medium">{item.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
