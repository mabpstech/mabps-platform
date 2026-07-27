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
 * Single DNA signal: a chosen value plus 0–1 confidence.
 * Low confidence means later stages should treat the value as a soft hint.
 */
export type AiDnaField<T> = {
  value: T;
  confidence: number;
};

export const AI_BRAND_POSITIONS = [
  "leader",
  "challenger",
  "specialist",
  "community",
  "lifestyle",
  "heritage",
  "innovator",
  "accessible",
] as const;
export type AiBrandPosition = (typeof AI_BRAND_POSITIONS)[number];

export const AI_MARKET_POSITIONS = [
  "niche",
  "mass_market",
  "premium_niche",
  "regional_leader",
  "emerging",
  "established",
] as const;
export type AiMarketPosition = (typeof AI_MARKET_POSITIONS)[number];

export const AI_PRICE_SEGMENTS = [
  "budget",
  "value",
  "mid_market",
  "premium",
  "luxury",
] as const;
export type AiPriceSegment = (typeof AI_PRICE_SEGMENTS)[number];

export const AI_EMOTIONAL_STYLES = [
  "warm",
  "calm",
  "energetic",
  "inspiring",
  "reassuring",
  "bold",
  "intimate",
  "aspirational",
] as const;
export type AiEmotionalStyle = (typeof AI_EMOTIONAL_STYLES)[number];

export const AI_COMMUNICATION_STYLES = [
  "direct",
  "storytelling",
  "educational",
  "conversational",
  "authoritative",
  "empathetic",
  "witty",
  "minimal",
] as const;
export type AiCommunicationStyle = (typeof AI_COMMUNICATION_STYLES)[number];

export const AI_TRUST_STRATEGIES = [
  "social_proof",
  "credentials",
  "transparency",
  "guarantees",
  "expertise",
  "community",
  "heritage",
  "results",
] as const;
export type AiTrustStrategy = (typeof AI_TRUST_STRATEGIES)[number];

export const AI_CONVERSION_STRATEGIES = [
  "soft_nurture",
  "direct_cta",
  "booking_first",
  "catalog_browse",
  "lead_capture",
  "consultative",
  "urgency",
  "relationship",
] as const;
export type AiConversionStrategy = (typeof AI_CONVERSION_STRATEGIES)[number];

export const AI_HERO_STRATEGIES = [
  "product_focus",
  "lifestyle",
  "founder_story",
  "offer_led",
  "atmosphere",
  "problem_solution",
  "social_proof",
  "minimal_statement",
] as const;
export type AiHeroStrategy = (typeof AI_HERO_STRATEGIES)[number];

export const AI_CTA_STRATEGIES = [
  "single_primary",
  "dual_primary_secondary",
  "soft_secondary",
  "contact_first",
  "shop_first",
  "book_first",
  "multi_path",
] as const;
export type AiCtaStrategy = (typeof AI_CTA_STRATEGIES)[number];

export const AI_VISUAL_IDENTITIES = [
  "clean_minimal",
  "bold_graphic",
  "elegant_refined",
  "warm_organic",
  "tech_sharp",
  "editorial_magazine",
  "playful_colorful",
  "corporate_polished",
] as const;
export type AiVisualIdentity = (typeof AI_VISUAL_IDENTITIES)[number];

export const AI_CONTENT_DENSITIES = [
  "sparse",
  "balanced",
  "rich",
  "dense",
] as const;
export type AiContentDensity = (typeof AI_CONTENT_DENSITIES)[number];

/** Modern ←→ classic axis (how the site should feel temporally). */
export const AI_MODERN_CLASSIC_AXIS = [
  "modern",
  "lean_modern",
  "balanced",
  "lean_classic",
  "classic",
] as const;
export type AiModernClassicAxis = (typeof AI_MODERN_CLASSIC_AXIS)[number];

/** Luxury ←→ friendly axis. */
export const AI_LUXURY_FRIENDLY_AXIS = [
  "luxury",
  "elevated",
  "balanced",
  "approachable",
  "friendly",
] as const;
export type AiLuxuryFriendlyAxis = (typeof AI_LUXURY_FRIENDLY_AXIS)[number];

/** Formal ←→ casual axis. */
export const AI_FORMAL_CASUAL_AXIS = [
  "formal",
  "polished",
  "balanced",
  "relaxed",
  "casual",
] as const;
export type AiFormalCasualAxis = (typeof AI_FORMAL_CASUAL_AXIS)[number];

/** Local ←→ global axis. */
export const AI_LOCAL_GLOBAL_AXIS = [
  "hyperlocal",
  "local",
  "regional",
  "national",
  "global",
] as const;
export type AiLocalGlobalAxis = (typeof AI_LOCAL_GLOBAL_AXIS)[number];

export const AI_IMAGE_DIRECTIONS = [
  "product",
  "people",
  "place",
  "lifestyle",
  "abstract",
  "process",
  "food",
  "architecture",
] as const;
export type AiImageDirection = (typeof AI_IMAGE_DIRECTIONS)[number];

export const AI_TYPOGRAPHY_DIRECTIONS = [
  "geometric_sans",
  "humanist_sans",
  "classic_serif",
  "modern_serif",
  "mixed_editorial",
  "display_accent",
  "monospace_tech",
] as const;
export type AiTypographyDirection = (typeof AI_TYPOGRAPHY_DIRECTIONS)[number];

export const AI_COLOUR_PSYCHOLOGIES = [
  "trust_blue",
  "energy_warm",
  "calm_nature",
  "luxury_dark",
  "fresh_vibrant",
  "soft_pastel",
  "grounded_earth",
  "clean_neutral",
] as const;
export type AiColourPsychology = (typeof AI_COLOUR_PSYCHOLOGIES)[number];

/** DNA fields that always carry a confidence score. */
export const AI_BUSINESS_DNA_FIELDS = [
  "brandPosition",
  "marketPosition",
  "priceSegment",
  "emotionalStyle",
  "communicationStyle",
  "trustStrategy",
  "conversionStrategy",
  "heroStrategy",
  "ctaStrategy",
  "visualIdentity",
  "contentDensity",
  "modernClassic",
  "luxuryFriendly",
  "formalCasual",
  "localGlobal",
  "imageDirection",
  "typographyDirection",
  "colourPsychology",
  "sectionPriority",
] as const;
export type AiBusinessDnaFieldName = (typeof AI_BUSINESS_DNA_FIELDS)[number];

/**
 * Business DNA — how the website should feel (Sprint C3).
 * Derived from AiBusinessProfile. Does not generate pages, sections, or themes.
 */
export type AiBusinessDNA = {
  brandPosition: AiDnaField<AiBrandPosition>;
  marketPosition: AiDnaField<AiMarketPosition>;
  priceSegment: AiDnaField<AiPriceSegment>;
  emotionalStyle: AiDnaField<AiEmotionalStyle>;
  communicationStyle: AiDnaField<AiCommunicationStyle>;
  trustStrategy: AiDnaField<AiTrustStrategy>;
  conversionStrategy: AiDnaField<AiConversionStrategy>;
  heroStrategy: AiDnaField<AiHeroStrategy>;
  ctaStrategy: AiDnaField<AiCtaStrategy>;
  visualIdentity: AiDnaField<AiVisualIdentity>;
  contentDensity: AiDnaField<AiContentDensity>;
  modernClassic: AiDnaField<AiModernClassicAxis>;
  luxuryFriendly: AiDnaField<AiLuxuryFriendlyAxis>;
  formalCasual: AiDnaField<AiFormalCasualAxis>;
  localGlobal: AiDnaField<AiLocalGlobalAxis>;
  imageDirection: AiDnaField<AiImageDirection>;
  typographyDirection: AiDnaField<AiTypographyDirection>;
  colourPsychology: AiDnaField<AiColourPsychology>;
  /** Preferred home-page section order / emphasis — not generated sections. */
  sectionPriority: AiDnaField<SectionType[]>;
};

/** Shared confidence wrapper for strategy signals (same shape as DNA fields). */
export type AiStrategyField<T> = AiDnaField<T>;

export const AI_BRAND_PROMISES = [
  "reliable_expertise",
  "premium_experience",
  "accessible_quality",
  "community_care",
  "innovative_edge",
  "authentic_craft",
  "transformative_results",
  "effortless_convenience",
] as const;
export type AiBrandPromise = (typeof AI_BRAND_PROMISES)[number];

export const AI_CORE_MESSAGES = [
  "expertise_first",
  "outcome_first",
  "experience_first",
  "value_first",
  "trust_first",
  "identity_first",
  "discovery_first",
  "relationship_first",
] as const;
export type AiCoreMessage = (typeof AI_CORE_MESSAGES)[number];

export const AI_UNIQUE_VALUE_PROPOSITIONS = [
  "specialist_depth",
  "premium_quality",
  "local_presence",
  "speed_convenience",
  "personal_care",
  "innovation_leadership",
  "heritage_craft",
  "best_value",
] as const;
export type AiUniqueValueProposition =
  (typeof AI_UNIQUE_VALUE_PROPOSITIONS)[number];

export const AI_HERO_MESSAGE_STRATEGIES = [
  "bold_claim",
  "empathetic_problem",
  "aspirational_vision",
  "proof_led",
  "offer_led",
  "invitation",
  "story_hook",
  "minimal_statement",
] as const;
export type AiHeroMessageStrategy =
  (typeof AI_HERO_MESSAGE_STRATEGIES)[number];

export const AI_VOICE_TONES = [
  "authoritative_expert",
  "warm_guide",
  "confident_peer",
  "refined_host",
  "energetic_coach",
  "calm_advisor",
  "playful_friend",
  "humble_craftsman",
] as const;
export type AiVoiceTone = (typeof AI_VOICE_TONES)[number];

export const AI_STORYTELLING_STRATEGIES = [
  "founder_origin",
  "customer_transformation",
  "craft_process",
  "place_rooted",
  "mission_driven",
  "before_after",
  "day_in_life",
  "proof_montage",
] as const;
export type AiStorytellingStrategy =
  (typeof AI_STORYTELLING_STRATEGIES)[number];

export const AI_IMAGE_STYLES = [
  "documentary",
  "studio_polished",
  "lifestyle_candid",
  "editorial_art",
  "product_hero",
  "ambient_mood",
  "process_documentary",
  "portrait_led",
] as const;
export type AiImageStyle = (typeof AI_IMAGE_STYLES)[number];

export const AI_ILLUSTRATION_STYLES = [
  "none",
  "flat_geometric",
  "line_minimal",
  "hand_drawn_warm",
  "editorial_ink",
  "tech_diagram",
  "organic_watercolor",
  "bold_graphic",
] as const;
export type AiIllustrationStyle = (typeof AI_ILLUSTRATION_STYLES)[number];

export const AI_ICON_STYLES = [
  "outline_thin",
  "outline_bold",
  "solid_simple",
  "duotone",
  "filled_rounded",
  "geometric_sharp",
  "hand_crafted",
  "minimal_glyph",
] as const;
export type AiIconStyle = (typeof AI_ICON_STYLES)[number];

export const AI_PHOTOGRAPHY_DIRECTIONS = [
  "natural_light",
  "dramatic_contrast",
  "soft_diffused",
  "bright_airy",
  "moody_dark",
  "color_pop",
  "muted_desaturated",
  "high_key_clean",
] as const;
export type AiPhotographyDirection =
  (typeof AI_PHOTOGRAPHY_DIRECTIONS)[number];

/** Strategic emphasis pattern — not concrete section generation. */
export const AI_SECTION_EMPHASES = [
  "hero_dominant",
  "proof_forward",
  "offer_forward",
  "story_forward",
  "catalog_forward",
  "trust_forward",
  "contact_forward",
  "balanced_flow",
] as const;
export type AiSectionEmphasis = (typeof AI_SECTION_EMPHASES)[number];

export const AI_EMOTIONAL_JOURNEYS = [
  "curiosity_to_confidence",
  "anxiety_to_reassurance",
  "aspiration_to_belonging",
  "problem_to_relief",
  "discovery_to_delight",
  "skepticism_to_trust",
  "excitement_to_action",
  "calm_to_commitment",
] as const;
export type AiEmotionalJourney = (typeof AI_EMOTIONAL_JOURNEYS)[number];

export const AI_CONVERSION_JOURNEYS = [
  "awareness_consider_act",
  "browse_compare_buy",
  "learn_trust_contact",
  "inspire_desire_book",
  "diagnose_advise_convert",
  "sample_engage_subscribe",
  "explore_shortlist_enquire",
  "hook_nurture_close",
] as const;
export type AiConversionJourney = (typeof AI_CONVERSION_JOURNEYS)[number];

/** Brand strategy fields that always carry a confidence score. */
export const AI_BRAND_STRATEGY_FIELDS = [
  "brandPromise",
  "coreMessage",
  "uniqueValueProposition",
  "heroMessageStrategy",
  "ctaStrategy",
  "voiceTone",
  "trustStrategy",
  "storytellingStrategy",
  "colourPsychology",
  "typographyDirection",
  "imageStyle",
  "illustrationStyle",
  "iconStyle",
  "photographyDirection",
  "sectionEmphasis",
  "emotionalJourney",
  "conversionJourney",
] as const;
export type AiBrandStrategyFieldName =
  (typeof AI_BRAND_STRATEGY_FIELDS)[number];

/**
 * Brand Strategy — how the brand communicates visually and emotionally (Sprint C4).
 * Derived from AiBusinessDNA. Does not generate pages, sections, themes, or blueprints.
 */
export type AiBrandStrategy = {
  brandPromise: AiStrategyField<AiBrandPromise>;
  coreMessage: AiStrategyField<AiCoreMessage>;
  uniqueValueProposition: AiStrategyField<AiUniqueValueProposition>;
  heroMessageStrategy: AiStrategyField<AiHeroMessageStrategy>;
  ctaStrategy: AiStrategyField<AiCtaStrategy>;
  voiceTone: AiStrategyField<AiVoiceTone>;
  trustStrategy: AiStrategyField<AiTrustStrategy>;
  storytellingStrategy: AiStrategyField<AiStorytellingStrategy>;
  colourPsychology: AiStrategyField<AiColourPsychology>;
  typographyDirection: AiStrategyField<AiTypographyDirection>;
  imageStyle: AiStrategyField<AiImageStyle>;
  illustrationStyle: AiStrategyField<AiIllustrationStyle>;
  iconStyle: AiStrategyField<AiIconStyle>;
  photographyDirection: AiStrategyField<AiPhotographyDirection>;
  sectionEmphasis: AiStrategyField<AiSectionEmphasis>;
  emotionalJourney: AiStrategyField<AiEmotionalJourney>;
  conversionJourney: AiStrategyField<AiConversionJourney>;
};

/**
 * Theme overlay for AI generation.
 * Prefer a known THEME_PRESETS id, then optional token patches.
 * Full ThemeTokens are resolved in a later sprint via normalizeThemeTokens —
 * do not invent a parallel theme schema.
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
