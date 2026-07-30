import {
  FeatureIcon,
  MarketingButton,
  MarketingContainer,
  MarketingSection,
  SectionHeading,
} from "@/components/marketing/ui";
import { createPageMetadata } from "@/lib/marketing/seo";

const VISION_NODES = [
  { id: "website-builder", label: "Build" },
  { id: "automation", label: "Automate" },
  { id: "crm", label: "Collaborate" },
  { id: "analytics", label: "Grow" },
] as const;

const TRADITIONAL_TOOLS = [
  "Website Builder",
  "CRM",
  "Email Marketing",
  "Automation",
  "Analytics",
  "Knowledge Base",
] as const;

const MABPS_CAPABILITIES = [
  "Website Builder",
  "CRM",
  "AI Assistant",
  "Automation",
  "Analytics",
  "Knowledge",
  "Media Library",
  "Marketplace",
] as const;

const PLATFORM_PILLARS = [
  "One Login",
  "One Dashboard",
  "One Team",
  "One Platform",
] as const;

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
            as="h1"
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

      <MarketingSection>
        <MarketingContainer>
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-20">
            <div className="m-animate-in max-w-xl">
              <SectionHeading
                title="Our Vision"
                lead="Our vision is to become the world's most user-friendly Business Operating System, empowering entrepreneurs and organizations with one connected platform to build, automate, collaborate, and grow without technical complexity."
              />
            </div>

            <div
              className="m-animate-in m-animate-in-delay-2 relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none"
              aria-hidden="true"
            >
              <div className="relative overflow-hidden rounded-[var(--m-radius-lg)] border border-[var(--m-line)] bg-[linear-gradient(160deg,#ffffff_0%,#f4f7ff_55%,#eef3ff_100%)] p-8 shadow-[var(--m-shadow-soft)] md:p-10">
                <div className="absolute inset-0 m-grid-atmosphere opacity-40" />
                <div className="relative">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white ring-1 ring-[var(--m-line)] shadow-[var(--m-shadow-soft)]">
                    <span className="text-xs font-semibold tracking-[0.12em] text-[var(--m-accent)] uppercase">
                      OS
                    </span>
                  </div>

                  <svg
                    className="pointer-events-none absolute left-1/2 top-16 h-[calc(100%-4rem)] w-[min(100%,18rem)] -translate-x-1/2 text-[var(--m-line)]"
                    viewBox="0 0 280 160"
                    fill="none"
                  >
                    <path
                      d="M140 8 L40 72 M140 8 L240 72 M140 8 L70 148 M140 8 L210 148"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeDasharray="4 5"
                    />
                  </svg>

                  <ul className="relative mt-10 grid grid-cols-2 gap-3 sm:gap-4">
                    {VISION_NODES.map((node, index) => (
                      <li
                        key={node.id}
                        className="m-animate-in m-card flex items-center gap-3 p-3.5 sm:p-4"
                        style={{ animationDelay: `${220 + index * 70}ms` }}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--m-accent-soft)] text-[var(--m-accent)]">
                          <FeatureIcon id={node.id} />
                        </div>
                        <span className="text-sm font-semibold tracking-tight text-[var(--m-ink)]">
                          {node.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </MarketingContainer>
      </MarketingSection>

      <MarketingSection className="bg-white">
        <MarketingContainer>
          <div className="m-animate-in mx-auto max-w-3xl text-center">
            <SectionHeading
              align="center"
              title="Why MABPS?"
              lead="Stop managing disconnected tools. Run your entire business from one connected platform."
            />
          </div>

          <div className="mt-14 grid gap-10 lg:mt-16 lg:grid-cols-2 lg:gap-12 xl:gap-16">
            <div className="m-animate-in m-animate-in-delay-1">
              <p className="mb-5 text-center text-sm font-semibold tracking-[0.14em] text-[var(--m-muted)] uppercase lg:text-left">
                Traditional Business
              </p>
              <ul className="flex flex-col gap-3">
                {TRADITIONAL_TOOLS.map((tool, index) => (
                  <li
                    key={tool}
                    className="m-animate-in flex items-center gap-3 rounded-[var(--m-radius)] border border-dashed border-[var(--m-line)] bg-[var(--m-surface)]/60 px-4 py-3.5 opacity-80"
                    style={{ animationDelay: `${180 + index * 60}ms` }}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--m-line)] bg-white text-[var(--m-muted)]"
                      aria-hidden="true"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                      >
                        <path d="M8 8l8 8M16 8l-8 8" />
                      </svg>
                    </span>
                    <span className="text-sm font-medium text-[var(--m-muted)]">
                      {tool}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="m-animate-in m-animate-in-delay-2">
              <p className="mb-5 text-center text-sm font-semibold tracking-[0.14em] text-[var(--m-accent)] uppercase lg:text-left">
                One MABPS Platform
              </p>
              <div className="overflow-hidden rounded-[var(--m-radius-lg)] border border-[var(--m-line)] bg-[linear-gradient(165deg,#ffffff_0%,#f4f7ff_50%,#eef3ff_100%)] p-6 shadow-[var(--m-shadow-soft)] md:p-8">
                <ul className="grid gap-3 sm:grid-cols-2">
                  {MABPS_CAPABILITIES.map((capability, index) => (
                    <li
                      key={capability}
                      className="m-animate-in flex items-center gap-3"
                      style={{ animationDelay: `${240 + index * 50}ms` }}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--m-accent-soft)] text-[var(--m-accent)]"
                        aria-hidden="true"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12.5l4.5 4.5L19 7" />
                        </svg>
                      </span>
                      <span className="text-sm font-semibold tracking-tight text-[var(--m-ink)]">
                        {capability}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 border-t border-[var(--m-line)] pt-6">
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {PLATFORM_PILLARS.map((pillar, index) => (
                      <li
                        key={pillar}
                        className="m-animate-in text-center"
                        style={{ animationDelay: `${640 + index * 60}ms` }}
                      >
                        <span className="text-xs font-semibold tracking-[0.08em] text-[var(--m-accent)] uppercase sm:text-[0.7rem]">
                          {pillar}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </MarketingContainer>
      </MarketingSection>

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
