import {
  FeaturesSection,
  HeroSection,
  OnePlatformSection,
  PlatformSection,
  SolutionsSection,
  TrustIndicatorsSection,
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
    </>
  );
}
