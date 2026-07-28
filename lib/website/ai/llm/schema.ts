/**
 * Structured JSON schema for website AI LLM responses (Sprint B3).
 * Enumerates allowed keys and documents the contract for providers.
 */

import {
  AI_BRAND_PERSONALITIES,
  AI_BUSINESS_TYPES,
  AI_COLOUR_DIRECTIONS,
  AI_CONTACT_PREFERENCES,
  AI_GENERATION_TONES,
  AI_VISUAL_STYLES,
} from "@/lib/website/ai/types";
import { SITE_CATEGORY_IDS } from "@/lib/website/templates";
import { PAGE_TYPES } from "@/lib/website/types";

/** Keys the LLM may return. Anything else is rejected. */
export const AI_WEBSITE_PROMPT_SIGNAL_KEYS = [
  "businessName",
  "description",
  "slogan",
  "industry",
  "audience",
  "locale",
  "language",
  "country",
  "region",
  "category",
  "businessType",
  "tone",
  "brandPersonality",
  "visualStyle",
  "colourDirection",
  "primaryCta",
  "suggestedPages",
  "suggestedFeatures",
  "trustSignals",
  "contactPreferences",
  "seoKeywords",
] as const;

export type AiWebsitePromptSignalKey =
  (typeof AI_WEBSITE_PROMPT_SIGNAL_KEYS)[number];

/**
 * Keys that indicate the model tried to emit Website Builder / blueprint data.
 * Presence of any of these fails validation and triggers deterministic fallback.
 */
export const AI_WEBSITE_LLM_FORBIDDEN_KEYS = [
  "pages",
  "sections",
  "navigation",
  "header",
  "footer",
  "theme",
  "seo",
  "blueprint",
  "site",
  "siteId",
  "intent",
  "brand",
  "version",
  "tokens",
  "content",
  "settings",
  "navItems",
  "builder",
] as const;

/** Compact schema text embedded in the system prompt. */
export function buildPromptSignalsJsonSchemaPrompt(): string {
  return [
    "Return a single JSON object only. No markdown. No commentary.",
    "Do NOT include pages, sections, navigation, header, footer, theme, seo, blueprint, or builder fields.",
    "Allowed keys (all optional):",
    "- businessName: string",
    "- description: string",
    "- slogan: string",
    "- industry: string",
    "- audience: string",
    "- locale: string (e.g. en, en-IN)",
    "- language: string (ISO 639-1)",
    "- country: string (ISO 3166-1 alpha-2)",
    "- region: string",
    `- category: one of ${SITE_CATEGORY_IDS.join(", ")}`,
    `- businessType: one of ${AI_BUSINESS_TYPES.join(", ")}`,
    `- tone: one of ${AI_GENERATION_TONES.join(", ")}`,
    `- brandPersonality: array of ${AI_BRAND_PERSONALITIES.join(", ")}`,
    `- visualStyle: one of ${AI_VISUAL_STYLES.join(", ")}`,
    `- colourDirection: one of ${AI_COLOUR_DIRECTIONS.join(", ")}`,
    "- primaryCta: { label: string, href: string }",
    `- suggestedPages: array of ${PAGE_TYPES.join(", ")}`,
    "- suggestedFeatures: string[]",
    "- trustSignals: string[]",
    `- contactPreferences: array of ${AI_CONTACT_PREFERENCES.join(", ")}`,
    "- seoKeywords: string[]",
  ].join("\n");
}

export const AI_WEBSITE_LLM_SYSTEM_PROMPT = [
  "You extract structured business website signals from a user prompt.",
  "You output JSON only.",
  "The MABPS deterministic engine will build the website — you must never invent site structure or builder data.",
  buildPromptSignalsJsonSchemaPrompt(),
].join("\n");
