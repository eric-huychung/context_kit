import { cn } from '@/lib/utils'

type BrandIconProps = {
  /** Path to a monochrome SVG (public/logos/*) used as a CSS mask. */
  src: string
  className?: string
}

/** Renders a brand mark (Apple, GitHub, ...) in the current text color via
 * a CSS mask, so it drops into a button/badge and inherits color the same
 * way a lucide icon would — but using the real logo shape instead of an
 * approximation. */
export function BrandIcon({ src, className }: BrandIconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block shrink-0 bg-current', className)}
      style={{
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    />
  )
}
