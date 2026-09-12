import Link from 'next/link'
import {
  FOOTER_PRODUCT,
  FOOTER_RESOURCES,
  FOOTER_SOCIAL,
  type FooterLinkItem,
  type FooterSocialItem,
} from '@/lib/site-links'

function FooterTextLink({ href, label, external }: FooterLinkItem) {
  const className = 'footer-link'
  if (external) {
    return (
      <a
        href={href}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label} (opens in a new tab)`}
      >
        {label}
      </a>
    )
  }

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  )
}

function FooterColumn({
  headingId,
  title,
  links,
}: {
  headingId: string
  title: string
  links: FooterLinkItem[]
}) {
  return (
    <nav aria-labelledby={headingId}>
      <h2 id={headingId} className="footer-heading">
        {title}
      </h2>
      <ul className="mt-4 flex flex-col gap-1">
        {links.map((item) => (
          <li key={item.href}>
            <FooterTextLink {...item} />
          </li>
        ))}
      </ul>
    </nav>
  )
}

function SocialIcon({ id }: { id: FooterSocialItem['id'] }) {
  if (id === 'linkedin') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

export function SiteFooter() {
  return (
    <footer className="glass-hairline border-t px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 lg:flex-row lg:justify-between lg:gap-16">
        <div className="lg:max-w-xs">
          <Link href="/" className="inline-flex items-center">
            <span className="wordmark">Skil</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Find skills, organize them, and kill the dead ones.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 sm:gap-16">
          <FooterColumn
            headingId="footer-product-heading"
            title="Product"
            links={FOOTER_PRODUCT}
          />
          <FooterColumn
            headingId="footer-resources-heading"
            title="Resources"
            links={FOOTER_RESOURCES}
          />

          <nav aria-labelledby="footer-social-heading">
            <h2 id="footer-social-heading" className="footer-heading">
              Social
            </h2>
            <ul className="mt-4 flex flex-row gap-1 sm:flex-col">
              {FOOTER_SOCIAL.map((item) => (
                <li key={item.id}>
                  <a
                    href={item.href}
                    className="nav-icon-button"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${item.label} (opens in a new tab)`}
                  >
                    <SocialIcon id={item.id} />
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  )
}
