import { MarketingLayout } from '@/components/landing/marketing-layout'
import { Hero } from '@/components/landing/hero'
import { SupportedTools } from '@/components/landing/supported-tools'
import { HowItWorks } from '@/components/landing/how-it-works'
import { FeatureGrid } from '@/components/landing/feature-grid'

export default function LandingPage() {
  return (
    <MarketingLayout>
      <Hero />
      <HowItWorks />
      <SupportedTools />
      <FeatureGrid />
    </MarketingLayout>
  )
}
