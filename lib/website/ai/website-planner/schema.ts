/**
 * Website Planner JSON schema + system prompt (AI Pipeline Phase 2).
 * Contract: website structure only — no copy, HTML, components, colours, or typography.
 */

export const WEBSITE_PLAN_KEYS = [
  "navigation",
  "pages",
  "footerLinks",
  "contentRequirements",
] as const;

export type WebsitePlanKey = (typeof WEBSITE_PLAN_KEYS)[number];

/**
 * Keys that indicate the model tried to emit copy, visuals, or builder data.
 * Presence fails validation and triggers deterministic fallback.
 */
export const WEBSITE_PLAN_FORBIDDEN_KEYS = [
  "html",
  "css",
  "jsx",
  "tsx",
  "components",
  "component",
  "layouts",
  "layout",
  "copy",
  "headline",
  "headlines",
  "body",
  "bodies",
  "content",
  "colours",
  "colors",
  "colour",
  "color",
  "typography",
  "fonts",
  "font",
  "theme",
  "tokens",
  "seo",
  "blueprint",
  "site",
  "siteId",
  "builder",
  "settings",
  "navItems",
  "header",
  "footer",
  "images",
  "image",
  "styles",
  "style",
] as const;

export function buildWebsitePlanJsonSchemaPrompt(): string {
  return [
    "Return a single JSON object only. No markdown. No commentary.",
    "Do NOT generate marketing copy, HTML, CSS, JSX, components, or layouts.",
    "Do NOT choose colours, typography, themes, or visual tokens.",
    "Do NOT invent headlines, body text, or component props.",
    "Allowed keys (all required):",
    '- navigation: string[] of nav labels in order, e.g. "Home", "About", "Contact"',
    "- pages: array of { id: string, sections: string[] }",
    '  - id: page slug, e.g. "home", "menu", "contact"',
    '  - sections: section type labels for that page, e.g. "Hero", "Gallery", "CTA"',
    '- footerLinks: string[] of footer link labels, e.g. "Privacy", "Contact"',
    "- contentRequirements: string[] of content needs (labels only), e.g. \"business name\", \"contact details\"",
    "Infer industry-appropriate structure from the BusinessPlan (jewellery ≠ restaurant ≠ hospital).",
    "Page array order is the page hierarchy. Navigation should match primary pages.",
  ].join("\n");
}

export const WEBSITE_PLANNER_SYSTEM_PROMPT = [
  "You are the MABPS Website Planner.",
  "Your only job is to decide what the website should contain — structure only.",
  "You must never generate marketing copy, HTML, components, layouts, colours, or typography.",
  buildWebsitePlanJsonSchemaPrompt(),
].join("\n");
