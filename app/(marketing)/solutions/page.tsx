import { MarketingButton, SectionHeading } from "@/components/marketing/ui";
import { INDUSTRIES } from "@/lib/marketing/content";
import { createPageMetadata } from "@/lib/marketing/seo";

export const metadata = createPageMetadata({
  title: "Solutions",
  description:
    "MABPS solutions for jewellery, restaurants, retail, education, healthcare, real estate, agencies, creators, and small business.",
  path: "/solutions",
});

export default function SolutionsPage() {
  return (
    <>
      <section className="m-noise m-grid-atmosphere">
        <div className="m-container py-16 md:py-24">
          <SectionHeading
            as="h1"
            eyebrow="Solutions"
            title="Industry-ready systems, not generic templates."
            lead="Each industry needs a different first conversation. MABPS pairs a premium website with CRM, AI, and automation patterns that match how you sell."
          />
        </div>
      </section>

      <section className="m-section bg-white">
        <div className="m-container grid gap-4 md:grid-cols-2">
          {INDUSTRIES.map((industry) => (
            <article
              key={industry.id}
              id={industry.id}
              className="m-card scroll-mt-28 p-6 md:p-8"
            >
              <h2 className="text-2xl font-semibold tracking-tight">{industry.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--m-muted)]">
                {industry.description}
              </p>
              <ul className="mt-5 space-y-2 text-sm text-[var(--m-ink-soft)]">
                <li className="flex gap-2">
                  <span className="text-[var(--m-accent)]">→</span>
                  Branded website with Theme Studio
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--m-accent)]">→</span>
                  Enquiry capture into CRM
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--m-accent)]">→</span>
                  AI answers + automation follow-up
                </li>
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="m-section pt-0">
        <div className="m-container flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm leading-7 text-[var(--m-muted)]">
            Not sure which setup fits? Book a demo and we will map MABPS to your industry
            workflow.
          </p>
          <MarketingButton href="/contact?intent=demo">Book Demo</MarketingButton>
        </div>
      </section>
    </>
  );
}
