import type { Metadata } from 'next'
import { MarketingLayout } from '@/components/landing/marketing-layout'
import { Discover } from '@/components/landing/discover'

export const metadata: Metadata = {
  title: 'Skil Leaderboard — browse skills.sh rankings',
  description:
    'Thousands of skills.sh skills ranked by installs. Search, preview, and copy install commands — no API key required.',
}

export default function LeaderboardPage() {
  return (
    <MarketingLayout>
      <Discover />
    </MarketingLayout>
  )
}
