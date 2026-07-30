/**
 * Helper utilities for AI Website Generator blueprints (Commit C1).
 * No LLM calls, persistence, or section-schema duplication.
 */

import { slugify } from "@/lib/website/defaults";
import type { PageType, SectionType } from "@/lib/website/types";
import {
  AI_WEBSITE_BLUEPRINT_VERSION,
  type AiBusinessProfile,
  type AiGeneratedNavItem,
  type AiGeneratedPage,
  type AiGeneratedSection,
  type AiGenerationIntent,
  type AiGenerationOptions,
  type AiWebsiteBlueprint,
  type AiWebsiteGenerateInput,
} from "@/lib/website/ai/types";

/** Soft limits for generator copy (enforced in C4 normalize). */
export const AI_TEXT_LIMITS = {
  siteName: 80,
  slogan: 160,
  description: 800,
  pageTitle: 120,
  seoTitle: 70,
  seoDescription: 160,
  sectionHeading: 160,
  navLabel: 48,
  prompt: 4000,
} as const;

export type AiTextLimitKey = keyof typeof AI_TEXT_LIMITS;

export function clampAiText(
  value: string,
  max: number,
): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trimEnd();
}

export function clampAiTextByKey(
  value: string,
  key: AiTextLimitKey,
): string {
  return clampAiText(value, AI_TEXT_LIMITS[key]);
}

/** Latin slug for sites/pages; Unicode content stays in titles/copy. */
export function aiSafeSlug(input: string, fallback = "page"): string {
  return slugify(input) || fallback;
}

/** True when a name is empty or the forbidden public placeholder. */
export function isPlaceholderSiteName(
  name: string | null | undefined,
): boolean {
  const normalized = name?.trim().toLowerCase() ?? "";
  return !normalized || normalized === "new website";
}

/**
 * Public sites must never brand as "New website".
 * Prefer a real candidate, then workspace name — never the placeholder.
 */
export function resolvePublicSiteName(
  candidate: string | null | undefined,
  workspaceName?: string | null,
): string {
  if (!isPlaceholderSiteName(candidate)) {
    return clampAiTextByKey(candidate!.trim(), "siteName");
  }
  if (!isPlaceholderSiteName(workspaceName)) {
    return clampAiTextByKey(workspaceName!.trim(), "siteName");
  }
  return "Untitled website";
}

export function createEmptyIntent(
  prompt = "",
): AiGenerationIntent {
  return {
    prompt,
    locale: "en",
    category: "other",
    template: "classic",
    tone: "professional",
    businessName: null,
    industry: null,
    requestedPageTypes: ["home", "about", "contact"],
  };
}

export function createEmptyBusinessProfile(
  name = "New website",
): AiBusinessProfile {
  return {
    name,
    description: "",
    slogan: null,
    industry: null,
    locale: "en",
    audience: null,
    category: null,
    businessType: null,
    tone: null,
    brandPersonality: [],
    language: "en",
    country: null,
    region: null,
    primaryCta: null,
    suggestedPages: ["home", "about", "contact"],
    suggestedFeatures: [],
    trustSignals: [],
    contactPreferences: ["form", "email"],
    seoKeywords: [],
    visualStyle: null,
    colourDirection: null,
    confidence: {},
  };
}

export function createEmptyBlueprint(
  overrides: Partial<AiWebsiteBlueprint> = {},
): AiWebsiteBlueprint {
  const intent = overrides.intent ?? createEmptyIntent();
  const brand =
    overrides.brand ??
    createEmptyBusinessProfile(intent.businessName ?? "New website");

  return {
    version: AI_WEBSITE_BLUEPRINT_VERSION,
    intent,
    site: overrides.site ?? {
      name: brand.name,
      slug: aiSafeSlug(brand.name, "site"),
    },
    brand,
    theme: overrides.theme ?? {
      presetId: null,
      tokens: {
        brand: {
          businessName: brand.name,
          slogan: brand.slogan,
          logoMediaId: null,
          faviconMediaId: null,
          brandImageMediaId: null,
        },
      },
    },
    header: overrides.header ?? {
      logoText: brand.name,
      showLogo: true,
      sticky: true,
      ctaLabel: "Contact",
      ctaHref: "/contact",
      ctaStyle: "primary",
      announcementText: null,
      announcementEnabled: false,
    },
    footer: overrides.footer ?? {
      copyrightText: `© ${new Date().getUTCFullYear()} ${brand.name}`,
      showSocial: false,
      socialLinks: [],
      columns: [],
    },
    seo: overrides.seo ?? {
      defaultTitle: brand.name,
      defaultDescription: brand.description || null,
      robots: "index,follow",
      twitterHandle: null,
    },
    pages: overrides.pages ?? [],
    navigation: overrides.navigation ?? [],
  };
}

export function createGeneratedSection(
  type: SectionType,
  content: Record<string, unknown> = {},
): AiGeneratedSection {
  return { type, content };
}

export function createGeneratedPage(input: {
  title: string;
  slug?: string;
  pageType: PageType;
  seoTitle?: string | null;
  seoDescription?: string | null;
  sections?: AiGeneratedSection[];
}): AiGeneratedPage {
  return {
    title: input.title,
    slug: input.slug ? aiSafeSlug(input.slug) : aiSafeSlug(input.title),
    pageType: input.pageType,
    seoTitle: input.seoTitle ?? null,
    seoDescription: input.seoDescription ?? null,
    sections: input.sections ?? [],
  };
}

export function listBlueprintPageSlugs(
  blueprint: AiWebsiteBlueprint,
): string[] {
  return blueprint.pages.map((page) => page.slug);
}

export function findBlueprintPage(
  blueprint: AiWebsiteBlueprint,
  matcher: { slug?: string; pageType?: PageType },
): AiGeneratedPage | null {
  if (matcher.slug) {
    const bySlug = blueprint.pages.find((page) => page.slug === matcher.slug);
    if (bySlug) return bySlug;
  }
  if (matcher.pageType) {
    return (
      blueprint.pages.find((page) => page.pageType === matcher.pageType) ??
      null
    );
  }
  return null;
}

/** Resolve a nav item to a page path hint before pageIds exist. */
export function resolveNavHref(
  item: AiGeneratedNavItem,
  pages: AiGeneratedPage[],
): string {
  if (item.href) return item.href;
  if (item.pageSlug) {
    const page = pages.find((entry) => entry.slug === item.pageSlug);
    if (page) return page.pageType === "home" ? "/" : `/${page.slug}`;
    return `/${item.pageSlug}`;
  }
  if (item.pageType) {
    const page = pages.find((entry) => entry.pageType === item.pageType);
    if (page) return page.pageType === "home" ? "/" : `/${page.slug}`;
    if (item.pageType === "home") return "/";
    return `/${item.pageType}`;
  }
  return "/";
}

export function flattenNavItems(
  items: AiGeneratedNavItem[],
): AiGeneratedNavItem[] {
  const out: AiGeneratedNavItem[] = [];
  for (const item of items) {
    out.push(item);
    if (item.children?.length) {
      out.push(...flattenNavItems(item.children));
    }
  }
  return out;
}

export function countBlueprintSections(
  blueprint: AiWebsiteBlueprint,
): number {
  return blueprint.pages.reduce(
    (total, page) => total + page.sections.length,
    0,
  );
}

export function mergeGenerationOptions(
  intent: AiGenerationIntent,
  options?: AiGenerationOptions,
): AiGenerationIntent {
  if (!options) return intent;
  return {
    ...intent,
    locale: options.locale?.trim() || intent.locale,
    category: options.category ?? intent.category,
    template: options.template ?? intent.template,
    tone: options.tone ?? intent.tone,
    requestedPageTypes:
      options.includePageTypes && options.includePageTypes.length > 0
        ? options.includePageTypes
        : intent.requestedPageTypes,
  };
}

export function normalizeGenerateInput(
  input: AiWebsiteGenerateInput,
): AiWebsiteGenerateInput {
  return {
    workspaceId: input.workspaceId.trim(),
    prompt: clampAiTextByKey(input.prompt, "prompt"),
    options: input.options,
  };
}

/** Default V1 page set when the recipe has not chosen yet. */
export const AI_DEFAULT_PAGE_TYPES: PageType[] = [
  "home",
  "about",
  "contact",
  "products",
];

export function ensureHomePageFirst(
  pages: AiGeneratedPage[],
): AiGeneratedPage[] {
  const homeIndex = pages.findIndex((page) => page.pageType === "home");
  if (homeIndex <= 0) return pages;
  const next = [...pages];
  const [home] = next.splice(homeIndex, 1);
  return [home, ...next];
}
