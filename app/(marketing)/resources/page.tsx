import { MarketingButton, SectionHeading } from "@/components/marketing/ui";
import { RESOURCES } from "@/lib/marketing/content";
import { createPageMetadata } from "@/lib/marketing/seo";

export const metadata = createPageMetadata({
  title: "Resources",
  description:
    "Guides and playbooks for Theme Studio, website-to-CRM flows, AI knowledge, automation, and publishing with MABPS.",
  path: "/resources",
});

export default function ResourcesPage() {
  return (
    <>
      <section className="m-noise m-grid-atmosphere">
        <div className="m-container py-16 md:py-24">
          <SectionHeading
            as="h1"
            eyebrow="Resources"
            title="Learn how operators ship with MABPS."
            lead="Practical guides for Theme Studio, CRM handoff, AI grounding, automation, and deployment."
          />
        </div>
      </section>

      <section className="m-section bg-white">
        <div className="m-container grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {RESOURCES.map((resource) => (
            <article
              key={resource.title}
              id={resource.href.includes("#") ? resource.href.split("#")[1] : undefined}
              className="m-card m-card-interactive flex flex-col p-6 scroll-mt-28"
            >
              <span className="text-[11px] font-semibold tracking-[0.14em] text-[var(--m-accent)] uppercase">
                {resource.tag}
              </span>
              <h2 className="mt-3 text-lg font-semibold tracking-tight">{resource.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-7 text-[var(--m-muted)]">
                {resource.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="theme-studio" className="m-section">
        <div className="m-container max-w-3xl">
          <SectionHeading
            eyebrow="Guide"
            title="Getting started with Theme Studio"
            lead="Define brand colors, typography, buttons, and motion tokens once. Theme Studio applies them across your published site so every page feels like one composition."
          />
          <div className="mt-8 space-y-4 text-sm leading-7 text-[var(--m-muted)]">
            <p>
              Start from a preset that matches your category, then refine accent color,
              heading and body fonts, and button styles. Use contrast checks before publish.
            </p>
            <p>
              Export tokens when you need to share a brand system with a teammate or agency —
              import them into another workspace site without rebuilding from scratch.
            </p>
          </div>
        </div>
      </section>

      <section id="website-crm" className="m-section bg-white">
        <div className="m-container max-w-3xl">
          <SectionHeading
            eyebrow="Playbook"
            title="From website to CRM in one flow"
            lead="Publish a contact form, route submissions into CRM, and trigger the first follow-up automatically."
          />
        </div>
      </section>

      <section id="ai-knowledge" className="m-section">
        <div className="m-container max-w-3xl">
          <SectionHeading
            eyebrow="Guide"
            title="Grounding AI in your knowledge base"
            lead="Index the pages and documents your team already trusts. Review answers, keep memory scoped, and hand hard cases to humans via automation."
          />
        </div>
      </section>

      <section id="automation" className="m-section bg-white">
        <div className="m-container max-w-3xl">
          <SectionHeading
            eyebrow="Playbook"
            title="Automation patterns that convert"
            lead="Trigger on form or stage change, branch on intent, act on WhatsApp or email, and measure the result in analytics."
          />
        </div>
      </section>

      <section id="deploy" className="m-section">
        <div className="m-container max-w-3xl">
          <SectionHeading
            eyebrow="Guide"
            title="Publishing and custom domains"
            lead="Preview on your MABPS path, publish when ready, then attach and verify a custom domain with deployment controls."
          />
          <div className="mt-8">
            <MarketingButton href="/signup">Start building</MarketingButton>
          </div>
        </div>
      </section>

      <section id="privacy" className="m-section bg-white scroll-mt-28">
        <div className="m-container max-w-3xl">
          <SectionHeading
            eyebrow="Legal"
            title="Privacy"
            lead="We process account, workspace, and product usage data to operate MABPS. Customer website and CRM content stays in the customer workspace."
          />
          <p className="mt-6 text-sm leading-7 text-[var(--m-muted)]">
            Contact {`hello@mabps.com`} for privacy requests. Do not send passwords or
            payment card numbers to support channels.
          </p>
        </div>
      </section>

      <section id="terms" className="m-section scroll-mt-28">
        <div className="m-container max-w-3xl">
          <SectionHeading
            eyebrow="Legal"
            title="Terms"
            lead="Use of MABPS is subject to your plan entitlements, acceptable-use limits, and applicable law."
          />
          <p className="mt-6 text-sm leading-7 text-[var(--m-muted)]">
            You are responsible for content published on your sites and for credentials
            stored in your workspace integrations.
          </p>
        </div>
      </section>

      <section id="cookies" className="m-section bg-white scroll-mt-28">
        <div className="m-container max-w-3xl">
          <SectionHeading
            eyebrow="Legal"
            title="Cookies"
            lead="MABPS uses essential cookies for authentication and workspace session continuity."
          />
          <p className="mt-6 text-sm leading-7 text-[var(--m-muted)]">
            Analytics cookies, when enabled, measure product usage to improve reliability.
            You can clear cookies in your browser to end the current session.
          </p>
        </div>
      </section>
    </>
  );
}
