/**
 * Shared AI Website Generator models (Commit C1).
 *
 * These types describe the structured blueprint the generator emits.
 * Persistence targets the existing Website Builder graph — do not invent
 * parallel page/section/theme schemas here.
 */

import type {
  SiteCategoryId,
  SiteTemplateId,
} from "@/lib/website/templates";
import type {
  ThemeBrandTokens,
  ThemeColorPalette,
  ThemeTokens,
  ThemeTypographyTokens,
} from "@/lib/website/theme/types";
import type {
  ButtonStyle,
  FooterColumn,
  FooterSocialLink,
  PageType,
  SectionSettings,
  SectionType,
} from "@/lib/website/types";

/** Blueprint schema version — bump when the JSON contract changes. */
export const AI_WEBSITE_BLUEPRINT_VERSION = 1 as const;
export type AiWebsiteBlueprintVersion =
  typeof AI_WEBSITE_BLUEPRINT_VERSION;

export const AI_GENERATION_TONES = [
  "professional",
  "friendly",
  "spiritual",
  "luxury",
  "playful",
  "minimal",
  "bold",
  "warm",
] as const;
export type AiGenerationTone = (typeof AI_GENERATION_TONES)[number];

export const AI_GENERATION_STATUSES = [
  "pending",
  "parsing",
  "generating",
  "validating",
  "applying",
  "succeeded",
  "failed",
] as const;
export type AiGenerationStatus = (typeof AI_GENERATION_STATUSES)[number];

/**
 * Parsed intent extracted from the user prompt (before content generation).
 * Recipe selection (template / category / page set) builds on this.
 */
export type AiGenerationIntent = {
  /** Original user prompt. */
  prompt: string;
  /** BCP-47-ish locale tag, e.g. "en", "ml", "en-IN". */
  locale: string;
  category: SiteCategoryId;
  template: SiteTemplateId;
  tone: AiGenerationTone;
  /** Best-effort business / org name from the prompt. */
  businessName: string | null;
  /** Free-text industry / niche label (not a new enum). */
  industry: string | null;
  /** Preferred page types the recipe should include. */
  requestedPageTypes: PageType[];
};

/** High-level business model inferred from the prompt (C2). */
export const AI_BUSINESS_TYPES = [
  "local_business",
  "online_store",
  "service_provider",
  "restaurant",
  "professional_practice",
  "creator",
  "nonprofit",
  "saas",
  "other",
] as const;
export type AiBusinessType = (typeof AI_BUSINESS_TYPES)[number];

export const AI_CONTACT_PREFERENCES = [
  "form",
  "phone",
  "email",
  "whatsapp",
  "booking",
  "chat",
] as const;
export type AiContactPreference = (typeof AI_CONTACT_PREFERENCES)[number];

export const AI_VISUAL_STYLES = [
  "minimal",
  "bold",
  "elegant",
  "playful",
  "corporate",
  "organic",
  "tech",
  "editorial",
] as const;
export type AiVisualStyle = (typeof AI_VISUAL_STYLES)[number];

export const AI_COLOUR_DIRECTIONS = [
  "warm",
  "cool",
  "neutral",
  "earth",
  "vibrant",
  "monochrome",
  "pastel",
  "dark_luxury",
] as const;
export type AiColourDirection = (typeof AI_COLOUR_DIRECTIONS)[number];

export const AI_BRAND_PERSONALITIES = [
  "trustworthy",
  "innovative",
  "friendly",
  "premium",
  "caring",
  "expert",
  "energetic",
  "calm",
  "authentic",
  "modern",
] as const;
export type AiBrandPersonality = (typeof AI_BRAND_PERSONALITIES)[number];

/** Profile fields that may carry a 0–1 confidence score. */
export const AI_BUSINESS_PROFILE_CONFIDENCE_FIELDS = [
  "name",
  "description",
  "slogan",
  "category",
  "industry",
  "businessType",
  "audience",
  "tone",
  "brandPersonality",
  "language",
  "country",
  "region",
  "primaryCta",
  "suggestedPages",
  "suggestedFeatures",
  "trustSignals",
  "contactPreferences",
  "seoKeywords",
  "visualStyle",
  "colourDirection",
] as const;
export type AiBusinessProfileConfidenceField =
  (typeof AI_BUSINESS_PROFILE_CONFIDENCE_FIELDS)[number];

export type AiBusinessProfileConfidence = Partial<
  Record<AiBusinessProfileConfidenceField, number>
>;

export type AiPrimaryCta = {
  label: string;
  href: string;
};

/**
 * Brand / business profile used across theme.brand, header, SEO, and copy.
 * Maps onto existing ThemeBrandTokens + site name — no separate brand table.
 *
 * C2 expands this into the Business Intelligence output: inferred fields plus
 * per-field confidence. Low-confidence fields stay null/empty rather than guessed.
 */
export type AiBusinessProfile = {
  name: string;
  description: string;
  slogan: string | null;
  industry: string | null;
  /** BCP-47-ish locale (language + optional region), e.g. "en", "en-IN", "ml". */
  locale: string;
  audience: string | null;

  /** Site category mapped to Website Builder categories. */
  category: SiteCategoryId | null;
  businessType: AiBusinessType | null;
  tone: AiGenerationTone | null;
  brandPersonality: AiBrandPersonality[];
  /** ISO 639-1 language code when detectable. */
  language: string | null;
  /** ISO 3166-1 alpha-2 country code when detectable. */
  country: string | null;
  /** Free-text region / city / state when detectable. */
  region: string | null;
  primaryCta: AiPrimaryCta | null;
  suggestedPages: PageType[];
  suggestedFeatures: string[];
  trustSignals: string[];
  contactPreferences: AiContactPreference[];
  seoKeywords: string[];
  visualStyle: AiVisualStyle | null;
  colourDirection: AiColourDirection | null;

  /**
   * Confidence 0–1 per field. Always recorded for uncertain inferences;
   * omit only when the engine did not evaluate that field.
   */
  confidence: AiBusinessProfileConfidence;
};

/**
 * Theme overlay for AI generation.
 * Prefer a known THEME_PRESETS id, then optional token patches.
 * Full ThemeTokens are resolved later (C3) via normalizeThemeTokens — do not
 * invent a parallel theme schema.
 */
export type AiThemeTokenPatch = {
  brand?: Partial<ThemeBrandTokens>;
  colors?: Partial<ThemeColorPalette>;
  typography?: Partial<ThemeTypographyTokens>;
};

export type AiGeneratedTheme = {
  presetId: string | null;
  tokens: AiThemeTokenPatch;
};

/**
 * Section payload for a generated page.
 * `type` reuses SECTION_TYPES; `content` is the existing JSON shape
 * (see section-defaults / repository defaults). Do not duplicate section schemas.
 */
export type AiGeneratedSection = {
  type: SectionType;
  content: Record<string, unknown>;
  settings?: SectionSettings;
};

export type AiGeneratedPage = {
  title: string;
  slug: string;
  pageType: PageType;
  seoTitle: string | null;
  seoDescription: string | null;
  sections: AiGeneratedSection[];
};

/** Header fields the generator may set (subset of WebsiteHeader). */
export type AiGeneratedHeader = {
  logoText: string | null;
  showLogo: boolean;
  sticky: boolean;
  ctaLabel: string | null;
  ctaHref: string | null;
  ctaStyle: ButtonStyle;
  announcementText?: string | null;
  announcementEnabled?: boolean;
};

/** Footer fields the generator may set (subset of WebsiteFooter). */
export type AiGeneratedFooter = {
  copyrightText: string | null;
  showSocial: boolean;
  socialLinks: FooterSocialLink[];
  columns: FooterColumn[];
};

/** Site-level SEO fields (subset of WebsiteSeo). */
export type AiGeneratedSeo = {
  defaultTitle: string | null;
  defaultDescription: string | null;
  robots: string;
  twitterHandle: string | null;
};

/**
 * Nav item before pageIds exist. Resolved to website_nav_item on apply
 * by matching pageSlug or pageType against generated pages.
 */
export type AiGeneratedNavItem = {
  label: string;
  /** Prefer linking by slug when the page exists in the blueprint. */
  pageSlug: string | null;
  /** Fallback when slug is unknown — matched against AiGeneratedPage.pageType. */
  pageType: PageType | null;
  /** External or absolute path when not page-linked. */
  href: string | null;
  openInNewTab: boolean;
  children?: AiGeneratedNavItem[];
};

export type AiGeneratedSiteMeta = {
  name: string;
  /** Latin slug hint; uniqueness enforced on persist. */
  slug: string | null;
};

/**
 * Canonical structured output of the AI Website Generator.
 * Persist only through createSite + apply (later commits) — never as code.
 */
export type AiWebsiteBlueprint = {
  version: AiWebsiteBlueprintVersion;
  intent: AiGenerationIntent;
  site: AiGeneratedSiteMeta;
  brand: AiBusinessProfile;
  theme: AiGeneratedTheme;
  header: AiGeneratedHeader;
  footer: AiGeneratedFooter;
  seo: AiGeneratedSeo;
  pages: AiGeneratedPage[];
  navigation: AiGeneratedNavItem[];
};

/** Optional knobs for a generate request (API later; types only here). */
export type AiGenerationOptions = {
  locale?: string;
  category?: SiteCategoryId;
  template?: SiteTemplateId;
  tone?: AiGenerationTone;
  /** Force inclusion of these page types in the recipe. */
  includePageTypes?: PageType[];
  /** Prefer a specific theme preset id when set. */
  themePresetId?: string;
};

/** Pipeline input contract (no LLM / DB in C1). */
export type AiWebsiteGenerateInput = {
  workspaceId: string;
  prompt: string;
  options?: AiGenerationOptions;
};

/** Pipeline success shape (site write happens in later commits). */
export type AiWebsiteGenerateResult = {
  siteId: string;
  blueprint: AiWebsiteBlueprint;
};

/** Lightweight audit / metering fields (table lands in C9). */
export type AiWebsiteGenerationRecord = {
  id: string;
  workspaceId: string;
  siteId: string | null;
  prompt: string;
  locale: string;
  status: AiGenerationStatus;
  blueprint: AiWebsiteBlueprint | null;
  provider: string | null;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Re-export ThemeTokens alias so callers can type full resolved themes. */
export type AiResolvedThemeTokens = ThemeTokens;
