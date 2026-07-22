import {
  MarketingButton,
  MarketingContainer,
  MarketingSection,
  SectionHeading,
} from "@/components/marketing/ui";
import { createPageMetadata } from "@/lib/marketing/seo";

export const metadata = createPageMetadata({
  title: "About",
  description:
    "About MABPS Technologies — mission, vision, values, and why we build one connected business platform.",
  path: "/about",
});

const VALUES = [
  {
    title: "Simplicity",
    body: "Clear surfaces, fewer steps, and software that stays out of the way of the work.",
  },
  {
    title: "Innovation",
    body: "Modern AI, automation, and craft tools that move businesses forward — not feature clutter.",
  },
  {
    title: "Reliability",
    body: "Publish, operate, and grow with systems designed to be dependable every day.",
  },
  {
    title: "Security",
    body: "Trusted foundations for customer data, access, and the workflows that run your business.",
  },
  {
    title: "Customer Success",
    body: "We measure progress by whether your team can create, automate, and grow with confidence.",
  },
] as const;

export default function AboutPage() {
  return (
    <>
      <MarketingSection className="m-noise m-grid-atmosphere">
        <MarketingContainer className="max-w-3xl py-4 md:py-8">
          <SectionHeading
            title="About MABPS Technologies"
            lead="We build software that helps businesses create, automate and grow from one unified platform."
          />
        </MarketingContainer>
      </MarketingSection>

      <section className="m-section bg-white">
        <div className="m-container grid gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <SectionHeading
              eyebrow="Mission"
              title="Help businesses succeed through simple, powerful technology."
            />
          </div>
          <div>
            <SectionHeading
              eyebrow="Vision"
              title="Become the most user-friendly business operating system for companies worldwide."
            />
          </div>
        </div>
      </section>

      <section className="m-section">
        <div className="m-container max-w-3xl">
          <SectionHeading
            eyebrow="Why MABPS"
            title="Not many disconnected tools. One connected ecosystem."
            lead="Most businesses are forced to stitch together website builders, CRMs, chat widgets, and automation apps that never share context. MABPS is built as a single platform philosophy: the site you publish, the customer you capture, the assistant that answers, and the workflow that follows should live together — elegant to use, powerful underneath."
          />
        </div>
      </section>

      <section className="m-section bg-white">
        <div className="m-container">
          <SectionHeading
            eyebrow="Core values"
            title="What guides every product decision."
            lead="Five principles keep MABPS focused on clarity, craft, and outcomes."
          />
          <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {VALUES.map((value) => (
              <li key={value.title}>
                <h3 className="text-lg font-semibold tracking-tight text-[var(--m-ink)]">
                  {value.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[var(--m-muted)]">
                  {value.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="m-section">
        <div className="m-container flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <SectionHeading
            title="Build with MABPS."
            lead="Start free, or book a demo and see the connected platform in action."
          />
          <div className="flex flex-wrap gap-3">
            <MarketingButton href="/signup">Start Free</MarketingButton>
            <MarketingButton href="/contact?intent=demo" variant="secondary">
              Book Demo
            </MarketingButton>
          </div>
        </div>
      </section>
    </>
  );
}
