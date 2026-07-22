import {
  DashboardPreview,
} from "@/components/marketing/mockups";
import {
  FeatureCard,
  MarketingButton,
  SectionHeading,
  SolutionCard,
} from "@/components/marketing/ui";
import { BRAND } from "@/lib/marketing/brand";
import {
  HERO,
  HOME_FEATURES,
  INDUSTRIES,
  ONE_PLATFORM,
  PLATFORM_FLOW,
  TRUST_INDICATORS,
} from "@/lib/marketing/content";

export function HeroSection() {
  return (
    <section className="m-noise m-grid-atmosphere relative overflow-hidden">
      <div className="m-container relative z-[1] pb-12 pt-14 md:pb-16 md:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="m-eyebrow m-animate-in justify-center before:hidden">
            {HERO.eyebrow}
          </p>
          <p className="m-display m-animate-in m-animate-in-delay-1 mt-5 text-[clamp(2.75rem,7.5vw,5rem)] text-[var(--m-ink)]">
            {BRAND.name}
          </p>
          <h1 className="m-animate-in m-animate-in-delay-2 mx-auto mt-5 max-w-3xl text-[clamp(1.35rem,3.2vw,2rem)] font-semibold tracking-[-0.03em] leading-snug text-[var(--m-ink-soft)]">
            {HERO.headline}
          </h1>
          <p className="m-animate-in m-animate-in-delay-3 mx-auto mt-6 max-w-2xl text-base leading-7 text-[var(--m-muted)] md:text-lg md:leading-8">
            {HERO.subhead}
          </p>
          <div className="m-animate-in m-animate-in-delay-4 mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <MarketingButton href={HERO.primaryCta.href}>
              {HERO.primaryCta.label}
            </MarketingButton>
            <MarketingButton href={HERO.secondaryCta.href} variant="secondary">
              {HERO.secondaryCta.label}
            </MarketingButton>
          </div>
        </div>

        <div className="m-animate-in m-animate-in-delay-4 mx-auto mt-14 max-w-4xl md:mt-20">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}

export function TrustIndicatorsSection() {
  return (
    <section className="border-y border-[var(--m-line)] bg-white py-8 md:py-10">
      <div className="m-container">
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 md:gap-x-10">
          {TRUST_INDICATORS.map((label, index) => (
            <li
              key={label}
              className="m-animate-in flex items-center gap-2 text-sm font-medium text-[var(--m-ink-soft)]"
              style={{ animationDelay: `${120 + index * 60}ms` }}
            >
              <span className="text-[var(--m-accent)]" aria-hidden>
                ✓
              </span>
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function PlatformSection() {
  return (
    <section id="platform-flow" className="m-section">
      <div className="m-container">
        <div className="m-animate-in">
          <SectionHeading
            align="center"
            eyebrow="Platform Overview"
            title="How everything connects."
            lead="One flow from first visit to measured growth — every module shares context."
          />
        </div>

        <ol className="mx-auto mt-14 flex max-w-sm flex-col items-center text-center">
          {PLATFORM_FLOW.map((step, index) => (
            <li
              key={step.id}
              className="m-animate-in flex w-full flex-col items-center"
              style={{ animationDelay: `${160 + index * 100}ms` }}
            >
              <div className="w-full py-1">
                <p className="m-display text-2xl tracking-tight text-[var(--m-ink)] md:text-3xl">
                  {step.label}
                </p>
                <p className="mt-1.5 text-sm leading-6 text-[var(--m-muted)]">
                  {step.detail}
                </p>
              </div>
              {index < PLATFORM_FLOW.length - 1 ? (
                <span
                  className="my-4 block text-2xl font-light leading-none text-[var(--m-accent)]"
                  aria-hidden
                >
                  ↓
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="m-section bg-white">
      <div className="m-container">
        <div className="m-animate-in">
          <SectionHeading
            align="center"
            eyebrow="Platform Features"
            title="Everything your business needs to operate."
            lead="Eight connected capabilities — built to share data, users, and intelligence from day one."
          />
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOME_FEATURES.map((feature, index) => (
            <FeatureCard
              key={feature.id}
              id={feature.id}
              title={feature.title}
              description={feature.description}
              href={feature.href}
              style={{ animationDelay: `${120 + index * 55}ms` }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function SolutionsSection() {
  return (
    <section id="solutions" className="m-section">
      <div className="m-container">
        <div className="m-animate-in">
          <SectionHeading
            align="center"
            eyebrow="Solutions"
            title="Built for how your industry sells."
            lead="MABPS adapts website, CRM, AI, and automation patterns to the conversations that matter in your market."
          />
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {INDUSTRIES.map((industry, index) => (
            <SolutionCard
              key={industry.id}
              id={industry.id}
              title={industry.title}
              description={industry.description}
              style={{ animationDelay: `${120 + index * 50}ms` }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function OnePlatformSection() {
  return (
    <section id="one-platform" className="m-section bg-white">
      <div className="m-container">
        <div className="m-animate-in">
          <SectionHeading
            align="center"
            eyebrow={ONE_PLATFORM.eyebrow}
            title={ONE_PLATFORM.title}
            lead={ONE_PLATFORM.lead}
          />
        </div>

        <div className="mx-auto mt-14 max-w-3xl">
          <div
            className="m-animate-in flex flex-wrap items-center justify-center gap-x-2 gap-y-3"
            style={{ animationDelay: "120ms" }}
            aria-label="Fragmented tools"
          >
            {ONE_PLATFORM.fragmented.map((label, index) => (
              <div key={label} className="flex items-center gap-2">
                <span className="rounded-xl border border-dashed border-[var(--m-line-strong)] bg-[var(--m-surface)] px-3.5 py-2 text-sm font-medium text-[var(--m-muted)] line-through decoration-[var(--m-muted-soft)]">
                  {label}
                </span>
                {index < ONE_PLATFORM.fragmented.length - 1 ? (
                  <span
                    className="text-lg font-light text-[var(--m-muted-soft)]"
                    aria-hidden
                  >
                    +
                  </span>
                ) : null}
              </div>
            ))}
          </div>

          <div
            className="m-animate-in my-8 flex flex-col items-center gap-2"
            style={{ animationDelay: "200ms" }}
            aria-hidden
          >
            <span className="h-10 w-px bg-[linear-gradient(180deg,var(--m-line-strong),var(--m-accent))]" />
            <span className="text-sm font-semibold tracking-[0.12em] text-[var(--m-accent)] uppercase">
              Becomes
            </span>
            <span className="h-10 w-px bg-[linear-gradient(180deg,var(--m-accent),var(--m-line-strong))]" />
          </div>

          <div
            className="m-animate-in overflow-hidden rounded-[var(--m-radius-lg)] border border-[var(--m-line)] bg-[linear-gradient(160deg,#ffffff_0%,#f4f7ff_55%,#eef3ff_100%)] p-8 text-center shadow-[var(--m-shadow-soft)] md:p-10"
            style={{ animationDelay: "280ms" }}
          >
            <p className="m-display text-[clamp(1.75rem,4vw,2.5rem)] tracking-tight text-[var(--m-ink)]">
              One unified MABPS Platform
            </p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--m-muted)]">
              Every module shares the same foundation — so context compounds instead of resetting.
            </p>

            <ul className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
              {ONE_PLATFORM.shared.map((item, index) => (
                <li
                  key={item}
                  className="m-animate-in rounded-xl border border-[var(--m-line)] bg-white px-3.5 py-1.5 text-sm font-medium capitalize text-[var(--m-ink-soft)]"
                  style={{ animationDelay: `${340 + index * 45}ms` }}
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
