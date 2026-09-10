'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'
import { DownloadCta } from '@/components/landing/download-cta'
import { cn } from '@/lib/utils'

const links = [
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/cli', label: 'CLI' },
  { href: '/app', label: 'App' },
]

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false)
  const navRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const [hovering, setHovering] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function moveIndicator(target: HTMLAnchorElement) {
    const parent = navRef.current
    if (!parent) return
    const parentRect = parent.getBoundingClientRect()
    const rect = target.getBoundingClientRect()
    setIndicator({ left: rect.left - parentRect.left, width: rect.width })
    setHovering(true)
  }

  function handleLinkEnter(event: React.MouseEvent<HTMLAnchorElement>) {
    moveIndicator(event.currentTarget)
  }

  return (
    <header
      className={cn(
        'glass-nav fixed inset-x-0 top-0 z-50',
        scrolled && 'glass-nav-scrolled',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="wordmark">Skil</span>
          <Badge
            variant="secondary"
            className="hidden rounded-full text-[10px] font-medium tracking-wide sm:inline-flex"
          >
            BETA
          </Badge>
        </Link>

        <nav
          className="relative hidden h-12 items-stretch md:flex"
          onMouseLeave={() => setHovering(false)}
        >
          <div ref={navRef} className="relative flex h-full items-stretch">
            <span
              aria-hidden="true"
              className="nav-indicator"
              style={{
                transform: `translateX(${indicator.left}px)`,
                width: `${indicator.width}px`,
                opacity: hovering ? 1 : 0,
              }}
            />
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onMouseEnter={handleLinkEnter}
                className="nav-link"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden sm:block">
            <DownloadCta variant="nav" />
          </div>
        </div>
      </div>
    </header>
  )
}
