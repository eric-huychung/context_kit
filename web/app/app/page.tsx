import type { Metadata } from 'next'
import { MarketingLayout } from '@/components/landing/marketing-layout'
import { AppDownload } from '@/components/landing/app-download'

export const metadata: Metadata = {
  title: 'Skil App — download for macOS',
  description:
    'Download the unsigned Skil .dmg. macOS will yell — Open Anyway once, or curl it to skip the quarantine stamp.',
}

export default function AppPage() {
  return (
    <MarketingLayout>
      <AppDownload />
    </MarketingLayout>
  )
}
