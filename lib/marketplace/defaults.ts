import type {
  ListingKind,
  MarketplaceListing,
  PluginManifest,
  PluginPermission,
} from "@/lib/marketplace/types";

export const KIND_LABELS: Record<ListingKind, string> = {
  plugin: "Plugins",
  theme: "Themes",
  website_template: "Website templates",
  ai_prompt: "AI prompts",
  automation_template: "Automation templates",
  crm_template: "CRM templates",
  chatbot_template: "Chatbot templates",
};

export const PERMISSION_LABELS: Record<PluginPermission, string> = {
  "crm.read": "Read CRM data",
  "crm.write": "Write CRM data",
  "website.read": "Read website content",
  "website.write": "Write website content",
  "automation.read": "Read automations",
  "automation.write": "Write automations",
  "ai.read": "Read AI resources",
  "ai.write": "Write AI resources",
  "chatbot.read": "Read chatbot data",
  "chatbot.write": "Write chatbot data",
  "billing.read": "Read billing info",
  "storage.read": "Read storage",
  "storage.write": "Write storage",
  "http.outbound": "Outbound HTTP",
  "workspace.read": "Read workspace profile",
};

export const SDK_SCOPES = [
  "listings:read",
  "listings:write",
  "versions:write",
  "analytics:read",
] as const;

export type SeedListing = {
  slug: string;
  kind: ListingKind;
  name: string;
  summary: string;
  description: string;
  pricingModel: MarketplaceListing["pricingModel"];
  priceCents: number;
  minPlanId: string;
  categories: string[];
  tags: string[];
  permissions: PluginPermission[];
  manifest: PluginManifest;
  versions: Array<{
    version: string;
    changelog: string;
  }>;
  ratingAverage: number;
  ratingCount: number;
};

function manifest(
  hooks: string[],
  permissions: PluginPermission[],
  entry = "index.js",
): PluginManifest {
  return {
    entry,
    hooks,
    permissions,
    sandbox: {
      timeoutMs: 2_000,
      allowNetwork: permissions.includes("http.outbound"),
      maxOutputBytes: 64_000,
    },
  };
}

/** Platform-curated catalog seeded on first migrate. */
export const SEED_LISTINGS: SeedListing[] = [
  {
    slug: "lead-enrichment",
    kind: "plugin",
    name: "Lead Enrichment",
    summary: "Enrich new CRM leads with firmographics in a sandbox-safe hook.",
    description:
      "Listens for crm.lead_created and writes enrichment fields back to the lead. Requires CRM read/write permissions.",
    pricingModel: "free",
    priceCents: 0,
    minPlanId: "free",
    categories: ["crm", "productivity"],
    tags: ["crm", "leads", "enrichment"],
    permissions: ["crm.read", "crm.write"],
    manifest: manifest(["on_install", "crm.lead_created"], [
      "crm.read",
      "crm.write",
    ]),
    versions: [
      { version: "1.0.0", changelog: "Initial release." },
      { version: "1.1.0", changelog: "Improved company matching." },
    ],
    ratingAverage: 4.6,
    ratingCount: 42,
  },
  {
    slug: "slack-notify",
    kind: "plugin",
    name: "Slack Notify",
    summary: "Send outbound notifications when deals move stages.",
    description:
      "Uses a sandboxed HTTP hook to post deal stage changes to a Slack webhook URL configured per workspace.",
    pricingModel: "one_time",
    priceCents: 1900,
    minPlanId: "starter",
    categories: ["integrations", "sales"],
    tags: ["slack", "deals", "notifications"],
    permissions: ["crm.read", "http.outbound"],
    manifest: manifest(["on_install", "crm.deal_stage_changed"], [
      "crm.read",
      "http.outbound",
    ]),
    versions: [{ version: "1.0.0", changelog: "Initial release." }],
    ratingAverage: 4.3,
    ratingCount: 18,
  },
  {
    slug: "aurora-theme",
    kind: "theme",
    name: "Aurora",
    summary: "Clean light theme pack for published marketing sites.",
    description:
      "Typography, color tokens, and section styles for website builder pages.",
    pricingModel: "free",
    priceCents: 0,
    minPlanId: "free",
    categories: ["design"],
    tags: ["theme", "light", "marketing"],
    permissions: ["website.read", "website.write"],
    manifest: manifest(["theme.apply"], ["website.read", "website.write"]),
    versions: [{ version: "1.0.0", changelog: "Initial theme pack." }],
    ratingAverage: 4.8,
    ratingCount: 67,
  },
  {
    slug: "midnight-theme",
    kind: "theme",
    name: "Midnight",
    summary: "High-contrast dark theme for product sites.",
    description: "Dark surfaces with sharp accent tokens for SaaS landing pages.",
    pricingModel: "one_time",
    priceCents: 2900,
    minPlanId: "starter",
    categories: ["design"],
    tags: ["theme", "dark", "saas"],
    permissions: ["website.read", "website.write"],
    manifest: manifest(["theme.apply"], ["website.read", "website.write"]),
    versions: [{ version: "1.0.0", changelog: "Initial theme pack." }],
    ratingAverage: 4.5,
    ratingCount: 31,
  },
  {
    slug: "agency-landing",
    kind: "website_template",
    name: "Agency Landing",
    summary: "Multi-section agency landing page template.",
    description:
      "Hero, services, case studies, and contact form blocks ready to customize.",
    pricingModel: "free",
    priceCents: 0,
    minPlanId: "free",
    categories: ["website"],
    tags: ["template", "agency", "landing"],
    permissions: ["website.write"],
    manifest: manifest(["template.apply"], ["website.write"]),
    versions: [{ version: "1.0.0", changelog: "Initial template." }],
    ratingAverage: 4.4,
    ratingCount: 55,
  },
  {
    slug: "saas-starter-site",
    kind: "website_template",
    name: "SaaS Starter Site",
    summary: "Pricing + features + FAQ website template for SaaS launches.",
    description: "Includes pricing table, feature grid, and FAQ accordion sections.",
    pricingModel: "subscription",
    priceCents: 900,
    minPlanId: "pro",
    categories: ["website", "saas"],
    tags: ["template", "saas", "pricing"],
    permissions: ["website.write"],
    manifest: manifest(["template.apply"], ["website.write"]),
    versions: [{ version: "1.0.0", changelog: "Initial template." }],
    ratingAverage: 4.7,
    ratingCount: 22,
  },
  {
    slug: "sales-qualifying-prompt",
    kind: "ai_prompt",
    name: "Sales Qualifying Prompt",
    summary: "Prompt pack for BANT-style lead qualification.",
    description:
      "Installs a reusable AI prompt template for qualifying inbound leads.",
    pricingModel: "free",
    priceCents: 0,
    minPlanId: "free",
    categories: ["ai", "sales"],
    tags: ["prompt", "sales", "qualification"],
    permissions: ["ai.read", "ai.write"],
    manifest: manifest(["prompt.install"], ["ai.read", "ai.write"]),
    versions: [{ version: "1.0.0", changelog: "Initial prompt pack." }],
    ratingAverage: 4.2,
    ratingCount: 14,
  },
  {
    slug: "support-triage-prompt",
    kind: "ai_prompt",
    name: "Support Triage Prompt",
    summary: "Classifies support tickets by urgency and topic.",
    description: "AI prompt for routing support conversations to the right queue.",
    pricingModel: "one_time",
    priceCents: 1200,
    minPlanId: "starter",
    categories: ["ai", "support"],
    tags: ["prompt", "support", "triage"],
    permissions: ["ai.read", "ai.write"],
    manifest: manifest(["prompt.install"], ["ai.read", "ai.write"]),
    versions: [{ version: "1.0.0", changelog: "Initial prompt pack." }],
    ratingAverage: 4.1,
    ratingCount: 9,
  },
  {
    slug: "welcome-lead-workflow",
    kind: "automation_template",
    name: "Welcome Lead Workflow",
    summary: "Automation template that emails new leads and creates a task.",
    description:
      "Installs a draft automation: CRM lead created → send email → create follow-up task.",
    pricingModel: "free",
    priceCents: 0,
    minPlanId: "starter",
    categories: ["automation"],
    tags: ["automation", "leads", "email"],
    permissions: ["automation.write", "crm.read"],
    manifest: manifest(["automation.install"], [
      "automation.write",
      "crm.read",
    ]),
    versions: [{ version: "1.0.0", changelog: "Initial workflow template." }],
    ratingAverage: 4.6,
    ratingCount: 28,
  },
  {
    slug: "deal-stale-nudge",
    kind: "automation_template",
    name: "Deal Stale Nudge",
    summary: "Scheduled automation template to nudge stale open deals.",
    description:
      "Creates a scheduled workflow that notifies owners about deals idle for 7 days.",
    pricingModel: "one_time",
    priceCents: 1500,
    minPlanId: "pro",
    categories: ["automation", "sales"],
    tags: ["automation", "deals", "schedule"],
    permissions: ["automation.write", "crm.read"],
    manifest: manifest(["automation.install"], [
      "automation.write",
      "crm.read",
    ]),
    versions: [{ version: "1.0.0", changelog: "Initial workflow template." }],
    ratingAverage: 4.0,
    ratingCount: 11,
  },
  {
    slug: "b2b-pipeline",
    kind: "crm_template",
    name: "B2B Pipeline",
    summary: "CRM pipeline stages tailored for B2B outbound sales.",
    description:
      "Installs pipeline stages: Prospect → Qualified → Proposal → Negotiation → Won/Lost.",
    pricingModel: "free",
    priceCents: 0,
    minPlanId: "free",
    categories: ["crm"],
    tags: ["crm", "pipeline", "b2b"],
    permissions: ["crm.write"],
    manifest: manifest(["crm.template.apply"], ["crm.write"]),
    versions: [{ version: "1.0.0", changelog: "Initial CRM template." }],
    ratingAverage: 4.5,
    ratingCount: 39,
  },
  {
    slug: "support-inbox-tags",
    kind: "crm_template",
    name: "Support Inbox Tags",
    summary: "Tag set for support and success handoffs.",
    description: "Adds CRM tags for billing, product, and escalation queues.",
    pricingModel: "free",
    priceCents: 0,
    minPlanId: "free",
    categories: ["crm", "support"],
    tags: ["crm", "tags", "support"],
    permissions: ["crm.write"],
    manifest: manifest(["crm.template.apply"], ["crm.write"]),
    versions: [{ version: "1.0.0", changelog: "Initial tag pack." }],
    ratingAverage: 4.0,
    ratingCount: 7,
  },
  {
    slug: "faq-assistant",
    kind: "chatbot_template",
    name: "FAQ Assistant",
    summary: "Chatbot persona and starter prompts for FAQ deflection.",
    description:
      "Installs a chatbot template with greeting, FAQ intents, and handoff rules.",
    pricingModel: "free",
    priceCents: 0,
    minPlanId: "starter",
    categories: ["chatbot"],
    tags: ["chatbot", "faq", "support"],
    permissions: ["chatbot.write"],
    manifest: manifest(["chatbot.template.apply"], ["chatbot.write"]),
    versions: [{ version: "1.0.0", changelog: "Initial chatbot template." }],
    ratingAverage: 4.3,
    ratingCount: 20,
  },
  {
    slug: "lead-capture-bot",
    kind: "chatbot_template",
    name: "Lead Capture Bot",
    summary: "Chatbot template that collects name, email, and intent.",
    description:
      "Guided conversation flow that syncs captured leads into CRM when permissions allow.",
    pricingModel: "subscription",
    priceCents: 1900,
    minPlanId: "pro",
    categories: ["chatbot", "sales"],
    tags: ["chatbot", "leads", "capture"],
    permissions: ["chatbot.write", "crm.write"],
    manifest: manifest(["chatbot.template.apply"], [
      "chatbot.write",
      "crm.write",
    ]),
    versions: [
      { version: "1.0.0", changelog: "Initial chatbot template." },
      { version: "1.0.1", changelog: "Improved email validation copy." },
    ],
    ratingAverage: 4.7,
    ratingCount: 16,
  },
];

export function defaultDeveloperName(workspaceName: string): string {
  return `${workspaceName} Developers`;
}
