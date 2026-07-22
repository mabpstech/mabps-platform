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

      <MarketingSection className="bg-white">
        <MarketingContainer>
          <div className="grid items-center gap-12 md:grid-cols-[auto_1fr] md:gap-16 lg:gap-20">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[var(--m-surface)] ring-1 ring-[var(--m-line)] md:h-24 md:w-24"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 48 48"
                fill="none"
                className="h-10 w-10 text-[var(--m-ink)] md:h-12 md:w-12"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M24 6L40 15V33L24 42L8 33V15L24 6Z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                />
                <path
                  d="M24 22V42M24 22L8 15M24 22L40 15"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="max-w-2xl">
              <SectionHeading
                title="Our Mission"
                lead="Our mission is to help businesses of every size simplify operations through one unified platform. Instead of managing multiple disconnected tools, MABPS brings websites, AI, CRM, automation, analytics, and knowledge together into one seamless experience that is powerful, easy to use, and built for growth."
              />
            </div>
          </div>
        </MarketingContainer>
      </MarketingSection>

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
