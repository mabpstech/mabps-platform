import {
  FeaturesSection,
  HeroSection,
  OnePlatformSection,
  PlatformSection,
  SolutionsSection,
  TestimonialsSection,
  TrustIndicatorsSection,
  TrustMetricsSection,
  TrustedPlatformSection,
} from "@/components/marketing/home-sections";

export function MarketingHomePage() {
  return (
    <>
      <HeroSection />
      <TrustIndicatorsSection />
      <PlatformSection />
      <FeaturesSection />
      <SolutionsSection />
      <OnePlatformSection />
      <TestimonialsSection />
      <TrustMetricsSection />
      <TrustedPlatformSection />
    </>
  );
}
