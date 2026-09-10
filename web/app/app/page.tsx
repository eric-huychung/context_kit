import type { Metadata } from 'next'
import { MarketingLayout } from '@/components/landing/marketing-layout'
import { AppDownload } from '@/components/landing/app-download'
import { FooterCta } from '@/components/landing/footer-cta'

export const metadata: Metadata = {
  title: 'Skil App — download for macOS',
  description:
    'Download the Skil desktop app. Scan your repo, organize skills into SDLC commands, and toggle them on — no login required.',
}

export default function AppPage() {
  return (
    <MarketingLayout>
      <AppDownload />
      <FooterCta />
    </MarketingLayout>
  )
}
