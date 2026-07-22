import {
  MarketingButton,
  MarketingContainer,
  MarketingSection,
  SectionHeading,
} from "@/components/marketing/ui";
import { createPageMetadata } from "@/lib/marketing/seo";

export const metadata = createPageMetadata({
  title: "Contact",
  description:
    "Contact MABPS Technologies — sales, support, partnerships, and general enquiries.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <MarketingSection className="m-noise m-grid-atmosphere">
      <MarketingContainer className="max-w-3xl py-4 md:py-8">
        <SectionHeading
          title="Let's Build Something Great Together"
          lead="Whether you have questions about MABPS, need product guidance, or want to discuss your business, our team is here to help."
        />
        <div className="mt-10 flex flex-wrap gap-3 md:mt-12">
          <MarketingButton href="/signup">Start Free</MarketingButton>
          <MarketingButton href="/contact?intent=demo" variant="secondary">
            Book Demo
          </MarketingButton>
        </div>
      </MarketingContainer>
    </MarketingSection>
  );
}
