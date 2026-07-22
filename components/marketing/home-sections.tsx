import {
  DashboardPreview,
} from "@/components/marketing/mockups";
import { MarketingButton, SectionHeading } from "@/components/marketing/ui";
import { BRAND } from "@/lib/marketing/brand";
import {
  HERO,
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
