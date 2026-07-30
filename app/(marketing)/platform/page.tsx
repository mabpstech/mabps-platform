import { MarketingButton, SectionHeading } from "@/components/marketing/ui";
import {
  DashboardPreview,
  EditorPreview,
  ThemeStudioPreview,
  WorkflowPreview,
} from "@/components/marketing/mockups";
import { FEATURES, PLATFORM_FLOW } from "@/lib/marketing/content";
import { createPageMetadata } from "@/lib/marketing/seo";

export const metadata = createPageMetadata({
  title: "Platform",
  description:
    "Explore the MABPS platform — website builder, CRM, AI, knowledge, memory, automation, analytics, marketplace, and deployment in one connected system.",
  path: "/platform",
});

export default function PlatformPage() {
  return (
    <>
      <section className="m-noise m-grid-atmosphere">
        <div className="m-container py-16 md:py-24">
          <SectionHeading
            as="h1"
            eyebrow="Platform"
            title="Everything that runs a modern business — connected."
            lead="MABPS is not a single tool. It is an operating system for websites, customers, conversations, and growth."
          />
          <div className="mt-10 flex flex-wrap gap-3">
            <MarketingButton href="/signup">Start Free</MarketingButton>
            <MarketingButton href="/contact?intent=demo" variant="secondary">
              Book Demo
            </MarketingButton>
          </div>
        </div>
      </section>

      <section className="m-section bg-white">
        <div className="m-container">
          <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PLATFORM_FLOW.map((step, i) => (
              <li key={step.id} className="m-card p-6">
                <p className="text-xs font-semibold tracking-[0.14em] text-[var(--m-accent)] uppercase">
                  Step {i + 1}
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">{step.label}</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--m-muted)]">{step.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="website-builder" className="m-section">
        <div className="m-container grid items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="Website Builder"
              title="Theme Studio and page builder for brand-grade sites."
              lead="Presets, design tokens, media library, responsive preview, and publish — the craft layer of MABPS."
            />
          </div>
          <ThemeStudioPreview />
        </div>
        <div className="m-container mt-8">
          <EditorPreview />
        </div>
      </section>

      <section id="crm" className="m-section bg-white">
        <div className="m-container grid items-center gap-10 lg:grid-cols-2">
          <DashboardPreview />
          <SectionHeading
            eyebrow="CRM"
            title="Leads and customers in the same workspace as your site."
            lead="Forms, chats, and WhatsApp enquiries become contacts and deals — with tasks, notes, and pipeline visibility."
          />
        </div>
      </section>

      <section id="ai" className="m-section">
        <div className="m-container">
          <SectionHeading
            eyebrow="AI · Knowledge · Memory"
            title="Assistants grounded in your business."
            lead="Chat and voice over your knowledge base, with memory across conversations and handoff into automation."
          />
        </div>
      </section>

      <section id="automation" className="m-section bg-white">
        <div className="m-container">
          <SectionHeading
            align="center"
            eyebrow="Automation"
            title="Visual workflows that close the loop."
          />
          <div className="mt-10">
            <WorkflowPreview />
          </div>
        </div>
      </section>

      <section id="analytics" className="m-section">
        <div className="m-container">
          <SectionHeading
            eyebrow="Analytics · Marketplace · Deployment"
            title="Measure, extend, and ship with confidence."
            lead="Analytics across website and conversations, marketplace extensions, and deployment health for operators."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {FEATURES.filter((f) =>
              ["analytics", "marketplace", "deployment"].includes(f.id),
            ).map((f) => (
              <article key={f.id} id={f.id} className="m-card p-6">
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[var(--m-muted)]">{f.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="m-section pt-0">
        <div className="m-container text-center">
          <MarketingButton href="/pricing">See pricing</MarketingButton>
        </div>
      </section>
    </>
  );
}
