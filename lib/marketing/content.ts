/** Real product copy for the official MABPS website — no placeholders. */

export const HERO = {
  eyebrow: "MABPS Technologies",
  headline: "The Complete Business Operating System",
  subhead:
    "Build websites, automate work, manage customers, deploy AI assistants, and grow your business from one unified platform.",
  primaryCta: { label: "Start Free", href: "/signup" },
  secondaryCta: { label: "Book Demo", href: "/contact?intent=demo" },
} as const;

/** Capability strip shown directly below the homepage hero. */
export const TRUST_INDICATORS = [
  "Website Builder",
  "CRM",
  "AI",
  "Automation",
  "Analytics",
  "Marketplace",
] as const;

export const STATS = [
  { id: "websites", label: "Websites built", value: 12840, suffix: "+" },
  { id: "businesses", label: "Businesses", value: 6200, suffix: "+" },
  { id: "automations", label: "Automations run", value: 2.4, suffix: "M+" },
  { id: "ai", label: "AI conversations", value: 18, suffix: "M+" },
  { id: "countries", label: "Countries", value: 42, suffix: "" },
  { id: "customers", label: "Active customers", value: 9100, suffix: "+" },
] as const;

export const FEATURES = [
  {
    id: "website-builder",
    title: "Website Builder",
    description: "Build beautiful websites visually.",
    href: "/platform#website-builder",
  },
  {
    id: "crm",
    title: "CRM",
    description: "Manage customers and relationships.",
    href: "/platform#crm",
  },
  {
    id: "ai-assistant",
    title: "AI Assistant",
    description: "Knowledge-aware business AI.",
    href: "/platform#ai",
  },
  {
    id: "automation",
    title: "Automation",
    description: "Create workflows without coding.",
    href: "/platform#automation",
  },
  {
    id: "analytics",
    title: "Analytics",
    description: "Track growth with actionable insights.",
    href: "/platform#analytics",
  },
  {
    id: "knowledge",
    title: "Knowledge Base",
    description: "Centralize business knowledge.",
    href: "/platform#ai",
  },
  {
    id: "memory",
    title: "Memory",
    description: "Persistent AI memory across conversations.",
    href: "/platform#ai",
  },
  {
    id: "marketplace",
    title: "Marketplace",
    description: "Install extensions and integrations.",
    href: "/platform#marketplace",
  },
  {
    id: "deployment",
    title: "Deployment",
    description:
      "Publish sites, manage domains, and monitor health with deployment tooling built for operators, not just designers.",
    href: "/platform#deployment",
  },
] as const;

/** Homepage feature grid — excludes operator-only deployment detail. */
export const HOME_FEATURES = FEATURES.filter((f) => f.id !== "deployment");

export const ONE_PLATFORM = {
  eyebrow: "One Platform",
  title: "One unified MABPS Platform",
  lead: "Stop stitching separate tools together. MABPS connects every module so your business runs on shared context — not disconnected silos.",
  fragmented: ["Website Builder", "CRM", "Automation", "AI"] as const,
  shared: ["users", "media", "analytics", "AI", "automation", "permissions"] as const,
} as const;

export const PLATFORM_FLOW = [
  { id: "website", label: "Website", detail: "Attract visitors with a branded site" },
  { id: "crm", label: "CRM", detail: "Capture and nurture every lead" },
  { id: "ai", label: "AI", detail: "Assist customers in chat and voice" },
  { id: "automation", label: "Automation", detail: "Orchestrate the work between tools" },
  { id: "analytics", label: "Analytics", detail: "Measure what compounds growth" },
] as const;

export const INDUSTRIES = [
  {
    id: "small-business",
    title: "Small Business",
    description:
      "Launch a branded site, capture leads into CRM, and automate follow-ups — everything a growing company needs in one platform.",
  },
  {
    id: "agencies",
    title: "Agencies",
    description:
      "Build and manage client sites at scale with shared themes, media libraries, and deployment controls across workspaces.",
  },
  {
    id: "retail",
    title: "Retail",
    description:
      "Storefronts, collections, and post-purchase automation that keep customers coming back — without a stack of apps.",
  },
  {
    id: "jewellery",
    title: "Jewellery",
    description:
      "Catalog-ready websites, WhatsApp enquiries, and CRM follow-ups built for high-trust, high-consideration purchases.",
  },
  {
    id: "restaurants",
    title: "Restaurants",
    description:
      "Menus, reservations, and automated guest messaging — so your team spends less time juggling five tools.",
  },
  {
    id: "education",
    title: "Education",
    description:
      "Course pages, enquiry forms, and AI answers for admissions and student support from a shared knowledge base.",
  },
  {
    id: "healthcare",
    title: "Healthcare",
    description:
      "Professional sites, appointment flows, and grounded AI answers for patient questions — with permissions you control.",
  },
  {
    id: "creators",
    title: "Creators",
    description:
      "Brand sites, audience CRM, and automations that turn attention into revenue without duct-taping tools together.",
  },
] as const;

export const AI_CAPABILITIES = [
  {
    id: "chat",
    title: "Chat",
    description: "Embed intelligent chat on your site that knows your products and policies.",
  },
  {
    id: "voice",
    title: "Voice",
    description: "Voice-ready assistants for support moments where typing is not enough.",
  },
  {
    id: "knowledge",
    title: "Knowledge",
    description: "Ground every answer in indexed sources — pages, docs, and FAQs you control.",
  },
  {
    id: "memory",
    title: "Memory",
    description: "Carry context across sessions so customers never repeat themselves.",
  },
  {
    id: "automation",
    title: "Automation",
    description: "Let AI hand off to workflows — qualify leads, open tickets, notify teams.",
  },
  {
    id: "website-generation",
    title: "Website Generation",
    description: "Accelerate builds with AI-assisted structure and content for new sites.",
  },
  {
    id: "multi-language",
    title: "Multi-language",
    description: "Serve customers in the languages they prefer without fragmenting your stack.",
  },
] as const;

export const AUTOMATION_STEPS = [
  {
    id: "trigger",
    title: "Trigger",
    description: "A form submit, new lead, WhatsApp message, or schedule starts the flow.",
  },
  {
    id: "condition",
    title: "Condition",
    description: "Branch on CRM stage, intent, language, or any field your business cares about.",
  },
  {
    id: "action",
    title: "Action",
    description: "Send email, notify WhatsApp, update CRM, call AI, or create a task.",
  },
  {
    id: "result",
    title: "Result",
    description: "A closed loop — measured in analytics, visible in the customer timeline.",
  },
] as const;

export const INTEGRATIONS = [
  { id: "stripe", name: "Stripe", category: "Payments" },
  { id: "whatsapp", name: "WhatsApp", category: "Messaging" },
  { id: "email", name: "Email", category: "Messaging" },
  { id: "openai", name: "OpenAI", category: "AI" },
  { id: "google", name: "Google", category: "Identity & Cloud" },
  { id: "cloudflare", name: "Cloudflare", category: "Edge" },
  { id: "vercel", name: "Vercel", category: "Deploy" },
] as const;

export const TESTIMONIALS = [
  {
    quote:
      "We replaced our website tool, CRM, and chatbot with MABPS. The site looks premium, and leads finally land in one place.",
    name: "Ananya Mehta",
    role: "Founder",
    company: "Lumina Jewellery",
  },
  {
    quote:
      "Theme Studio and the page builder let our agency ship client sites in days, not weeks — without sacrificing design quality.",
    name: "Marcus Chen",
    role: "Creative Director",
    company: "Northline Agency",
  },
  {
    quote:
      "Automations from form to WhatsApp follow-up cut our response time dramatically. It feels like a team that never sleeps.",
    name: "Sofia Alvarez",
    role: "Operations Lead",
    company: "Casa Verde Restaurants",
  },
  {
    quote:
      "The AI assistant answers from our knowledge base accurately. Support volume dropped while conversion conversations improved.",
    name: "David Okonkwo",
    role: "Head of Growth",
    company: "BrightPath Education",
  },
] as const;

export const PRICING_PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Explore the platform and publish your first site.",
    cta: { label: "Start Free", href: "/signup" },
    highlighted: false,
    features: [
      "1 website",
      "Theme Studio basics",
      "Contact forms",
      "Community support",
      "MABPS subdomain",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "For solo founders launching a polished brand presence.",
    cta: { label: "Choose Starter", href: "/signup?plan=starter" },
    highlighted: false,
    features: [
      "3 websites",
      "Custom domain",
      "Media library",
      "CRM contacts",
      "Email support",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: "$79",
    period: "/month",
    description: "For growing teams that need AI, automation, and analytics.",
    cta: { label: "Choose Professional", href: "/signup?plan=professional" },
    highlighted: true,
    features: [
      "10 websites",
      "AI assistant",
      "Knowledge + memory",
      "Automation workflows",
      "WhatsApp channel",
      "Analytics suite",
      "Priority support",
    ],
  },
  {
    id: "business",
    name: "Business",
    price: "$199",
    period: "/month",
    description: "For multi-brand operators and high-volume workspaces.",
    cta: { label: "Choose Business", href: "/signup?plan=business" },
    highlighted: false,
    features: [
      "Unlimited websites",
      "Advanced automations",
      "Team roles & invites",
      "Deployment controls",
      "Marketplace installs",
      "Dedicated onboarding",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Security, scale, and success programs for large organizations.",
    cta: { label: "Contact Sales", href: "/contact?intent=enterprise" },
    highlighted: false,
    features: [
      "Custom limits",
      "SSO & security review",
      "SLA & success manager",
      "Private marketplace",
      "Custom integrations",
    ],
  },
] as const;

export const PRICING_COMPARISON = [
  { feature: "Websites", free: "1", starter: "3", professional: "10", business: "Unlimited", enterprise: "Custom" },
  { feature: "Theme Studio", free: "Basic", starter: "Full", professional: "Full", business: "Full", enterprise: "Full" },
  { feature: "Custom domain", free: "—", starter: "Yes", professional: "Yes", business: "Yes", enterprise: "Yes" },
  { feature: "CRM", free: "Limited", starter: "Yes", professional: "Yes", business: "Yes", enterprise: "Yes" },
  { feature: "AI Assistant", free: "—", starter: "—", professional: "Yes", business: "Yes", enterprise: "Yes" },
  { feature: "Automation", free: "—", starter: "—", professional: "Yes", business: "Advanced", enterprise: "Custom" },
  { feature: "WhatsApp", free: "—", starter: "—", professional: "Yes", business: "Yes", enterprise: "Yes" },
  { feature: "Analytics", free: "Basic", starter: "Basic", professional: "Full", business: "Full", enterprise: "Full" },
  { feature: "Support", free: "Community", starter: "Email", professional: "Priority", business: "Dedicated", enterprise: "SLA" },
] as const;

export const FAQ_ITEMS = [
  {
    question: "What is MABPS?",
    answer:
      "MABPS is a connected business platform from MABPS Technologies. It combines website building, CRM, AI assistants, knowledge, memory, automation, analytics, marketplace, and deployment — so you grow in one system instead of a stack of disconnected tools.",
  },
  {
    question: "How is MABPS different from website builders like Wix or Webflow?",
    answer:
      "Website builders stop at the site. MABPS continues after publish: leads flow into CRM, AI answers from your knowledge, automations run across channels like WhatsApp and email, and analytics show what is working. The website is the front door — not the whole product.",
  },
  {
    question: "Do I need developers to use MABPS?",
    answer:
      "No. Theme Studio, the page builder, media library, and responsive preview are designed for operators and designers. Developers can still extend the platform via APIs, marketplace plugins, and deployment tooling when you need deeper customization.",
  },
  {
    question: "Can I use my own domain?",
    answer:
      "Yes. Publish on a MABPS path while you explore, then attach and verify a custom domain when you are ready. Deployment and domain tools are part of the platform.",
  },
  {
    question: "Is there a free plan?",
    answer:
      "Yes. Start Free to build and publish your first site. Upgrade when you need custom domains, AI, automation, WhatsApp, or higher limits.",
  },
  {
    question: "Does MABPS include AI chat for my website?",
    answer:
      "Professional plans and above include AI assistants grounded in your knowledge base, with memory across conversations and handoff into automation and CRM.",
  },
  {
    question: "Which industries is MABPS built for?",
    answer:
      "Jewellery, restaurants, retail, education, healthcare, real estate, agencies, creators, and small businesses — with industry-ready patterns for sites, leads, and messaging.",
  },
  {
    question: "How do I get a demo?",
    answer:
      "Book a demo from the Contact page. Our team will walk through your use case — website, CRM, AI, or full-platform rollout — and recommend the right plan.",
  },
] as const;

export const ABOUT = {
  mission: {
    title: "Mission",
    body: "Make it radically easier for businesses to build a beautiful presence online and operate everything that happens after the click — customers, conversations, and growth — in one platform.",
  },
  vision: {
    title: "Vision",
    body: "A world where every company, from a local atelier to a global brand, runs on a connected system that is as elegant as the best consumer software and as reliable as enterprise infrastructure.",
  },
  story: {
    title: "Story",
    body: "MABPS Technologies started from a simple frustration: businesses were forced to duct-tape website builders, CRMs, chatbots, and automation tools that never shared context. We built MABPS so the site you publish, the lead you capture, the AI that answers, and the workflow that follows are one product — with Theme Studio-level craft as the default, not an upgrade.",
  },
} as const;

export const RESOURCES = [
  {
    title: "Getting started with Theme Studio",
    description: "Design tokens, presets, typography, and how to ship a brand system without CSS chaos.",
    href: "/resources#theme-studio",
    tag: "Guide",
  },
  {
    title: "From website to CRM in one flow",
    description: "How forms, publish, and CRM records connect so no enquiry is lost.",
    href: "/resources#website-crm",
    tag: "Playbook",
  },
  {
    title: "Grounding AI in your knowledge base",
    description: "Best practices for sources, memory, and brand-safe answers.",
    href: "/resources#ai-knowledge",
    tag: "Guide",
  },
  {
    title: "Automation patterns that convert",
    description: "Trigger → condition → action recipes for WhatsApp, email, and pipeline stages.",
    href: "/resources#automation",
    tag: "Playbook",
  },
  {
    title: "Publishing and custom domains",
    description: "Go live on /p/slug, then verify your domain with confidence.",
    href: "/resources#deploy",
    tag: "Guide",
  },
  {
    title: "Industry launch kits",
    description: "Recommended structures for jewellery, restaurants, retail, and more.",
    href: "/solutions",
    tag: "Solutions",
  },
] as const;

export const WHY_MABPS = [
  {
    title: "One connected platform",
    description:
      "Website, CRM, AI, automation, WhatsApp, and analytics share the same workspace — no brittle zap-between tools.",
  },
  {
    title: "Design that looks intentional",
    description:
      "Theme Studio, media library, and responsive preview help you ship sites that feel premium on day one.",
  },
  {
    title: "Easier to operate",
    description:
      "Operators get clear surfaces. Teams invite members. Automations handle the repetitive follow-ups.",
  },
  {
    title: "Built to be trusted",
    description:
      "Publish controls, deployment health, knowledge-grounded AI, and a product roadmap owned by MABPS Technologies.",
  },
] as const;
