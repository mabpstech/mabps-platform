import Link from "next/link";
import { MarketingButton, SectionHeading } from "@/components/marketing/ui";
import { PRICING_COMPARISON, PRICING_PLANS } from "@/lib/marketing/content";
import { createPageMetadata } from "@/lib/marketing/seo";

export const metadata = createPageMetadata({
  title: "Pricing",
  description:
    "MABPS pricing — Free, Starter, Professional, and Enterprise. Start free and scale as you grow.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <>
      <section className="m-noise m-grid-atmosphere">
        <div className="m-container py-16 md:py-24">
          <SectionHeading
            align="center"
            eyebrow="Pricing"
            title="Simple plans for every stage of growth."
            lead="Start Free. Upgrade when you need domains, AI, automation, or higher limits."
          />
        </div>
      </section>

      <section className="m-section bg-white pt-0 md:pt-0">
        <div className="m-container grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {PRICING_PLANS.map((plan, index) => (
            <article
              key={plan.id}
              className={`m-card m-animate-in relative flex flex-col p-6 md:p-7 ${
                plan.highlighted
                  ? "z-10 border-[var(--m-accent)] shadow-[var(--m-shadow)] ring-2 ring-[var(--m-accent)] xl:-translate-y-3"
                  : ""
              } ${
                index === 1
                  ? "m-animate-in-delay-1"
                  : index === 2
                    ? "m-animate-in-delay-2"
                    : index === 3
                      ? "m-animate-in-delay-3"
                      : ""
              }`}
            >
              {plan.highlighted ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--m-accent)] px-3 py-1 text-[10px] font-semibold tracking-[0.12em] text-white uppercase">
                  Most Popular
                </span>
              ) : null}

              <h2 className="text-xl font-semibold tracking-tight md:text-2xl">{plan.name}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--m-muted)]">{plan.description}</p>

              <p className="mt-6 flex items-baseline gap-1">
                <span className="m-display text-4xl text-[var(--m-ink)] md:text-[2.75rem]">
                  {plan.price}
                </span>
                {plan.period ? (
                  <span className="text-sm text-[var(--m-muted)]">{plan.period}</span>
                ) : null}
              </p>

              <ul className="mt-6 flex-1 space-y-2.5 text-sm text-[var(--m-ink-soft)]">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="mt-0.5 text-[var(--m-accent)]" aria-hidden>
                      ✓
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <MarketingButton
                  href={plan.cta.href}
                  variant={plan.highlighted ? "accent" : "secondary"}
                  className="w-full"
                >
                  {plan.cta.label}
                </MarketingButton>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="m-section">
        <div className="m-container">
          <SectionHeading
            align="center"
            eyebrow="Compare"
            title="Feature comparison"
            lead="See what is included at each tier — from Website Builder to Priority Support."
          />
          <div className="mt-10 overflow-x-auto rounded-[var(--m-radius)] border border-[var(--m-line)] bg-white shadow-[var(--m-shadow-soft)]">
            <table className="min-w-[640px] w-full text-left text-sm">
              <thead className="border-b border-[var(--m-line)] bg-[var(--m-surface)] text-xs tracking-wide text-[var(--m-muted)] uppercase">
                <tr>
                  <th className="px-4 py-3.5 font-semibold">Feature</th>
                  <th className="px-4 py-3.5 font-semibold">Free</th>
                  <th className="px-4 py-3.5 font-semibold">Starter</th>
                  <th className="px-4 py-3.5 font-semibold text-[var(--m-accent)]">
                    Professional
                  </th>
                  <th className="px-4 py-3.5 font-semibold">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {PRICING_COMPARISON.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-b border-[var(--m-line)] last:border-0"
                  >
                    <th className="px-4 py-3.5 font-medium text-[var(--m-ink)]">
                      {row.feature}
                    </th>
                    <td className="px-4 py-3.5 text-[var(--m-muted)]">{row.free}</td>
                    <td className="px-4 py-3.5 text-[var(--m-muted)]">{row.starter}</td>
                    <td className="bg-[var(--m-accent-soft)] px-4 py-3.5 font-medium text-[var(--m-ink)]">
                      {row.professional}
                    </td>
                    <td className="px-4 py-3.5 text-[var(--m-muted)]">{row.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="m-section bg-white pt-0 md:pt-0">
        <div className="m-container text-center">
          <p className="text-base text-[var(--m-muted)] md:text-lg">
            Questions?{" "}
            <Link
              href="/resources"
              className="font-semibold text-[var(--m-ink)] underline-offset-4 hover:underline"
            >
              Visit our FAQ
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
