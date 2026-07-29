/**
 * Hero generator JSON schema + system prompt (AI Pipeline Phase 3).
 * Contract: structured hero content only — no HTML, JSX, CSS, or components.
 */

import { HERO_LAYOUTS, HERO_STYLES } from "@/lib/website/ai/generators/hero/types";

export const HERO_SECTION_KEYS = [
  "headline",
  "subheadline",
  "primaryCTA",
  "secondaryCTA",
  "imagePrompt",
  "layout",
  "style",
] as const;

export type HeroSectionKey = (typeof HERO_SECTION_KEYS)[number];

/**
 * Keys that indicate the model tried to emit markup or builder data.
 * Presence fails validation and triggers deterministic fallback.
 */
export const HERO_SECTION_FORBIDDEN_KEYS = [
  "html",
  "css",
  "jsx",
  "tsx",
  "components",
  "component",
  "className",
  "class",
  "styles",
  "styleSheet",
  "markup",
  "dom",
  "react",
  "vue",
  "svelte",
  "blueprint",
  "site",
  "siteId",
  "builder",
  "sections",
  "props",
  "children",
] as const;

export const HERO_HEADLINE_MAX_WORDS = 12;
export const HERO_SUBHEADLINE_MAX_WORDS = 30;

export function buildHeroJsonSchemaPrompt(): string {
  return [
    "Return a single JSON object only. No markdown. No commentary.",
    "Do NOT generate HTML, CSS, JSX, TSX, components, or layouts as code.",
    "Only structured marketing content for ONE hero section.",
    "Allowed keys:",
    `- headline: string, benefit-focused, max ${HERO_HEADLINE_MAX_WORDS} words. No clichés. Never start with "Welcome to". Never use meta labels like "product catalog", "services list", "about", or "faq" as the offer noun.`,
    `- subheadline: string, explain the value for this exact industry and audience, max ${HERO_SUBHEADLINE_MAX_WORDS} words. Avoid filler like "without the noise" or "built around your goals".`,
    "- primaryCTA: string, action-oriented call to action that fits the industry (required). Avoid generic Get in touch when a stronger action exists.",
    "- secondaryCTA: string, optional secondary action.",
    "- imagePrompt: string, high-quality scene description for image generation rooted in the industry setting.",
    `- layout: one of ${HERO_LAYOUTS.map((v) => `"${v}"`).join(", ")}`,
    `- style: one of ${HERO_STYLES.map((v) => `"${v}"`).join(", ")}`,
    "Choose layout and style that fit the business industry and tone.",
    "Write as if this business is distinct — do not reuse the same headline across unrelated industries.",
  ].join("\n");
}

export const HERO_GENERATOR_SYSTEM_PROMPT = [
  "You are the MABPS Hero section generator.",
  "Your only job is to write structured content for a single website hero.",
  "You must never generate HTML, JSX, CSS, components, or page structure.",
  buildHeroJsonSchemaPrompt(),
].join("\n");
