/**
 * Business Planner JSON schema + system prompt (AI Pipeline Phase 1).
 * Contract: business understanding only — no copy, HTML, or components.
 */

export const BUSINESS_PLAN_KEYS = [
  "businessType",
  "industry",
  "targetAudience",
  "goals",
  "tone",
  "style",
  "services",
  "pages",
  "requiredSections",
] as const;

export type BusinessPlanKey = (typeof BUSINESS_PLAN_KEYS)[number];

/**
 * Keys that indicate the model tried to emit Website Builder / blueprint data
 * or marketing copy. Presence fails validation and triggers deterministic fallback.
 */
export const BUSINESS_PLAN_FORBIDDEN_KEYS = [
  "html",
  "css",
  "jsx",
  "tsx",
  "components",
  "component",
  "copy",
  "headline",
  "headlines",
  "body",
  "bodies",
  "content",
  "sections",
  "navigation",
  "header",
  "footer",
  "theme",
  "seo",
  "blueprint",
  "site",
  "siteId",
  "builder",
  "tokens",
  "settings",
  "navItems",
] as const;

export function buildBusinessPlanJsonSchemaPrompt(): string {
  return [
    "Return a single JSON object only. No markdown. No commentary.",
    "Do NOT generate website copy, HTML, CSS, JSX, components, or builder data.",
    "Do NOT invent headlines, body text, or visual tokens.",
    "Allowed keys (all required):",
    '- businessType: short label, e.g. "retail", "service_provider", "restaurant"',
    '- industry: short niche label, e.g. "jewellery", "wedding jewellery"',
    '- targetAudience: short audience description (not marketing copy)',
    "- goals: string[] of business/website goals (labels only)",
    '- tone: short tone label, e.g. "luxury", "professional", "warm"',
    '- style: short visual style label, e.g. "elegant", "minimal", "bold"',
    "- services: string[] of service/product labels (not descriptions)",
    '- pages: string[] of page identifiers, e.g. "home", "about", "products", "contact"',
    '- requiredSections: array of { role: string, page?: string } — section roles only',
  ].join("\n");
}

export const BUSINESS_PLANNER_SYSTEM_PROMPT = [
  "You are the MABPS Business Planner.",
  "Your only job is to understand the user's website prompt and return structured business intent.",
  "You must never design or generate a website.",
  buildBusinessPlanJsonSchemaPrompt(),
].join("\n");
