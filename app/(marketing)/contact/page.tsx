import Link from "next/link";
import {
  MarketingButton,
  MarketingContainer,
  MarketingSection,
  SectionHeading,
} from "@/components/marketing/ui";
import { BRAND } from "@/lib/marketing/brand";
import { createPageMetadata } from "@/lib/marketing/seo";
import type { ReactNode } from "react";

export const metadata = createPageMetadata({
  title: "Contact",
  description:
    "Contact MABPS Technologies — sales, support, partnerships, and general enquiries.",
  path: "/contact",
});

const CONTACT_OPTIONS = [
  {
    id: "sales",
    title: "Sales",
    description: "Helping businesses choose the right plan.",
    href: `mailto:${BRAND.email.sales}`,
    icon: (
      <svg
        width={22}
        height={22}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M4 19V5M4 19h16" />
        <path d="M8 15v-4M12 15V8M16 15v-7" />
      </svg>
    ),
  },
  {
    id: "support",
    title: "Customer Support",
    description: "Technical help and platform guidance.",
    href: `mailto:${BRAND.email.support}`,
    icon: (
      <svg
        width={22}
        height={22}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
        <path d="M18 14v2.5a1.5 1.5 0 0 1-1.5 1.5H14" />
        <rect x="2" y="12" width="4" height="6" rx="1.5" />
        <rect x="18" y="12" width="4" height="6" rx="1.5" />
        <circle cx="12" cy="19" r="2" />
      </svg>
    ),
  },
  {
    id: "partnerships",
    title: "Partnerships",
    description: "Business partnerships and integrations.",
    href: `mailto:${BRAND.email.hello}?subject=${encodeURIComponent("Partnership enquiry")}`,
    icon: (
      <svg
        width={22}
        height={22}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M8.5 14.5 7 16a4.2 4.2 0 0 1-6 0 4.2 4.2 0 0 1 0-6l2.5-2.5a4.2 4.2 0 0 1 6 0" />
        <path d="M15.5 9.5 17 8a4.2 4.2 0 0 1 6 0 4.2 4.2 0 0 1 0 6l-2.5 2.5a4.2 4.2 0 0 1-6 0" />
        <path d="M9 15l6-6" />
      </svg>
    ),
  },
  {
    id: "general",
    title: "General Enquiries",
    description: "General questions about MABPS.",
    href: `mailto:${BRAND.email.hello}`,
    icon: (
      <svg
        width={22}
        height={22}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    ),
  },
] as const satisfies ReadonlyArray<{
  id: string;
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
}>;

export default function ContactPage() {
  return (
    <>
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

      <MarketingSection className="bg-white">
        <MarketingContainer>
          <SectionHeading
            title="Contact Options"
            lead="Reach the right MABPS team for sales, support, partnerships, or general questions."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 md:mt-12">
            {CONTACT_OPTIONS.map((option, index) => (
              <article
                key={option.id}
                className="m-card m-card-interactive m-animate-in flex flex-col p-6 md:p-7"
                style={{ animationDelay: `${120 + index * 70}ms` }}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--m-accent-soft)] text-[var(--m-accent)]">
                  {option.icon}
                </div>
                <h3 className="mt-5 text-xl tracking-tight text-[var(--m-ink)]">
                  {option.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-[var(--m-muted)]">
                  {option.description}
                </p>
                <Link
                  href={option.href}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--m-accent)] transition-colors hover:text-[var(--m-accent-deep)]"
                >
                  Contact us
                  <span aria-hidden>→</span>
                </Link>
              </article>
            ))}
          </div>
        </MarketingContainer>
      </MarketingSection>
    </>
  );
}
