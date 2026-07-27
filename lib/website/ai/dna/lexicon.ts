/**
 * Deterministic DNA defaults (Sprint C3).
 * Profile-signal → identity maps only. No LLM / network.
 */

import type { SiteCategoryId } from "@/lib/website/templates";
import type { SectionType } from "@/lib/website/types";
import type {
  AiBrandPosition,
  AiBusinessType,
  AiColourDirection,
  AiColourPsychology,
  AiCommunicationStyle,
  AiContentDensity,
  AiConversionStrategy,
  AiCtaStrategy,
  AiEmotionalStyle,
  AiFormalCasualAxis,
  AiGenerationTone,
  AiHeroStrategy,
  AiImageDirection,
  AiLocalGlobalAxis,
  AiLuxuryFriendlyAxis,
  AiMarketPosition,
  AiModernClassicAxis,
  AiPriceSegment,
  AiTrustStrategy,
  AiTypographyDirection,
  AiVisualIdentity,
  AiVisualStyle,
} from "@/lib/website/ai/types";

/** Category baseline for how a site in that niche should feel. */
export type CategoryDnaDefaults = {
  brandPosition: AiBrandPosition;
  marketPosition: AiMarketPosition;
  priceSegment: AiPriceSegment;
  emotionalStyle: AiEmotionalStyle;
  communicationStyle: AiCommunicationStyle;
  trustStrategy: AiTrustStrategy;
  conversionStrategy: AiConversionStrategy;
  heroStrategy: AiHeroStrategy;
  ctaStrategy: AiCtaStrategy;
  visualIdentity: AiVisualIdentity;
  contentDensity: AiContentDensity;
  modernClassic: AiModernClassicAxis;
  luxuryFriendly: AiLuxuryFriendlyAxis;
  formalCasual: AiFormalCasualAxis;
  localGlobal: AiLocalGlobalAxis;
  imageDirection: AiImageDirection;
  typographyDirection: AiTypographyDirection;
  colourPsychology: AiColourPsychology;
  sectionPriority: SectionType[];
};

export const CATEGORY_DNA_DEFAULTS: Record<SiteCategoryId, CategoryDnaDefaults> =
  {
    restaurant: {
      brandPosition: "community",
      marketPosition: "niche",
      priceSegment: "mid_market",
      emotionalStyle: "warm",
      communicationStyle: "conversational",
      trustStrategy: "social_proof",
      conversionStrategy: "booking_first",
      heroStrategy: "atmosphere",
      ctaStrategy: "book_first",
      visualIdentity: "warm_organic",
      contentDensity: "balanced",
      modernClassic: "lean_classic",
      luxuryFriendly: "approachable",
      formalCasual: "relaxed",
      localGlobal: "local",
      imageDirection: "food",
      typographyDirection: "humanist_sans",
      colourPsychology: "energy_warm",
      sectionPriority: [
        "hero",
        "features",
        "gallery",
        "cta",
        "form",
        "richText",
      ],
    },
    retail: {
      brandPosition: "lifestyle",
      marketPosition: "mass_market",
      priceSegment: "mid_market",
      emotionalStyle: "energetic",
      communicationStyle: "direct",
      trustStrategy: "social_proof",
      conversionStrategy: "catalog_browse",
      heroStrategy: "product_focus",
      ctaStrategy: "shop_first",
      visualIdentity: "bold_graphic",
      contentDensity: "rich",
      modernClassic: "modern",
      luxuryFriendly: "approachable",
      formalCasual: "casual",
      localGlobal: "national",
      imageDirection: "product",
      typographyDirection: "geometric_sans",
      colourPsychology: "fresh_vibrant",
      sectionPriority: [
        "hero",
        "products",
        "collections",
        "features",
        "cta",
        "form",
      ],
    },
    professional: {
      brandPosition: "specialist",
      marketPosition: "established",
      priceSegment: "premium",
      emotionalStyle: "reassuring",
      communicationStyle: "authoritative",
      trustStrategy: "credentials",
      conversionStrategy: "consultative",
      heroStrategy: "problem_solution",
      ctaStrategy: "contact_first",
      visualIdentity: "corporate_polished",
      contentDensity: "balanced",
      modernClassic: "balanced",
      luxuryFriendly: "elevated",
      formalCasual: "formal",
      localGlobal: "regional",
      imageDirection: "people",
      typographyDirection: "classic_serif",
      colourPsychology: "trust_blue",
      sectionPriority: [
        "hero",
        "features",
        "richText",
        "cta",
        "form",
        "blogList",
      ],
    },
    services: {
      brandPosition: "accessible",
      marketPosition: "regional_leader",
      priceSegment: "value",
      emotionalStyle: "reassuring",
      communicationStyle: "direct",
      trustStrategy: "guarantees",
      conversionStrategy: "lead_capture",
      heroStrategy: "offer_led",
      ctaStrategy: "dual_primary_secondary",
      visualIdentity: "corporate_polished",
      contentDensity: "balanced",
      modernClassic: "lean_modern",
      luxuryFriendly: "friendly",
      formalCasual: "polished",
      localGlobal: "local",
      imageDirection: "process",
      typographyDirection: "humanist_sans",
      colourPsychology: "clean_neutral",
      sectionPriority: [
        "hero",
        "features",
        "gallery",
        "cta",
        "form",
        "richText",
      ],
    },
    creator: {
      brandPosition: "lifestyle",
      marketPosition: "niche",
      priceSegment: "mid_market",
      emotionalStyle: "inspiring",
      communicationStyle: "storytelling",
      trustStrategy: "results",
      conversionStrategy: "relationship",
      heroStrategy: "founder_story",
      ctaStrategy: "soft_secondary",
      visualIdentity: "editorial_magazine",
      contentDensity: "sparse",
      modernClassic: "modern",
      luxuryFriendly: "approachable",
      formalCasual: "casual",
      localGlobal: "global",
      imageDirection: "lifestyle",
      typographyDirection: "mixed_editorial",
      colourPsychology: "fresh_vibrant",
      sectionPriority: [
        "hero",
        "gallery",
        "richText",
        "features",
        "cta",
        "form",
      ],
    },
    other: {
      brandPosition: "accessible",
      marketPosition: "emerging",
      priceSegment: "mid_market",
      emotionalStyle: "calm",
      communicationStyle: "direct",
      trustStrategy: "transparency",
      conversionStrategy: "soft_nurture",
      heroStrategy: "minimal_statement",
      ctaStrategy: "single_primary",
      visualIdentity: "clean_minimal",
      contentDensity: "sparse",
      modernClassic: "balanced",
      luxuryFriendly: "balanced",
      formalCasual: "balanced",
      localGlobal: "national",
      imageDirection: "abstract",
      typographyDirection: "geometric_sans",
      colourPsychology: "clean_neutral",
      sectionPriority: ["hero", "features", "richText", "cta", "form"],
    },
  };

export const TONE_DNA_OVERRIDES: Partial<
  Record<
    AiGenerationTone,
    Partial<
      Pick<
        CategoryDnaDefaults,
        | "emotionalStyle"
        | "communicationStyle"
        | "modernClassic"
        | "luxuryFriendly"
        | "formalCasual"
        | "visualIdentity"
        | "contentDensity"
        | "typographyDirection"
      >
    >
  >
> = {
  professional: {
    emotionalStyle: "reassuring",
    communicationStyle: "authoritative",
    formalCasual: "formal",
    luxuryFriendly: "elevated",
    visualIdentity: "corporate_polished",
  },
  friendly: {
    emotionalStyle: "warm",
    communicationStyle: "conversational",
    formalCasual: "casual",
    luxuryFriendly: "friendly",
  },
  spiritual: {
    emotionalStyle: "calm",
    communicationStyle: "empathetic",
    modernClassic: "lean_classic",
    luxuryFriendly: "approachable",
    visualIdentity: "warm_organic",
    typographyDirection: "humanist_sans",
  },
  luxury: {
    emotionalStyle: "aspirational",
    communicationStyle: "minimal",
    modernClassic: "classic",
    luxuryFriendly: "luxury",
    formalCasual: "polished",
    visualIdentity: "elegant_refined",
    contentDensity: "sparse",
    typographyDirection: "classic_serif",
  },
  playful: {
    emotionalStyle: "energetic",
    communicationStyle: "witty",
    formalCasual: "casual",
    luxuryFriendly: "friendly",
    visualIdentity: "playful_colorful",
    modernClassic: "modern",
  },
  minimal: {
    emotionalStyle: "calm",
    communicationStyle: "minimal",
    contentDensity: "sparse",
    visualIdentity: "clean_minimal",
    modernClassic: "modern",
    typographyDirection: "geometric_sans",
  },
  bold: {
    emotionalStyle: "bold",
    communicationStyle: "direct",
    visualIdentity: "bold_graphic",
    modernClassic: "modern",
    contentDensity: "rich",
  },
  warm: {
    emotionalStyle: "warm",
    communicationStyle: "conversational",
    luxuryFriendly: "friendly",
    formalCasual: "relaxed",
    visualIdentity: "warm_organic",
  },
};

export const VISUAL_STYLE_TO_IDENTITY: Record<AiVisualStyle, AiVisualIdentity> =
  {
    minimal: "clean_minimal",
    bold: "bold_graphic",
    elegant: "elegant_refined",
    playful: "playful_colorful",
    corporate: "corporate_polished",
    organic: "warm_organic",
    tech: "tech_sharp",
    editorial: "editorial_magazine",
  };

export const COLOUR_TO_PSYCHOLOGY: Record<
  AiColourDirection,
  AiColourPsychology
> = {
  warm: "energy_warm",
  cool: "trust_blue",
  neutral: "clean_neutral",
  earth: "grounded_earth",
  vibrant: "fresh_vibrant",
  monochrome: "clean_neutral",
  pastel: "soft_pastel",
  dark_luxury: "luxury_dark",
};

export const BUSINESS_TYPE_DNA_OVERRIDES: Partial<
  Record<
    AiBusinessType,
    Partial<
      Pick<
        CategoryDnaDefaults,
        | "brandPosition"
        | "marketPosition"
        | "priceSegment"
        | "conversionStrategy"
        | "heroStrategy"
        | "ctaStrategy"
        | "localGlobal"
        | "imageDirection"
      >
    >
  >
> = {
  local_business: {
    brandPosition: "community",
    marketPosition: "niche",
    localGlobal: "hyperlocal",
    conversionStrategy: "relationship",
  },
  online_store: {
    brandPosition: "lifestyle",
    marketPosition: "mass_market",
    conversionStrategy: "catalog_browse",
    heroStrategy: "product_focus",
    ctaStrategy: "shop_first",
    imageDirection: "product",
    localGlobal: "national",
  },
  service_provider: {
    brandPosition: "accessible",
    conversionStrategy: "lead_capture",
    heroStrategy: "offer_led",
    imageDirection: "process",
  },
  restaurant: {
    brandPosition: "community",
    conversionStrategy: "booking_first",
    heroStrategy: "atmosphere",
    ctaStrategy: "book_first",
    imageDirection: "food",
    localGlobal: "local",
  },
  professional_practice: {
    brandPosition: "specialist",
    priceSegment: "premium",
    conversionStrategy: "consultative",
    heroStrategy: "problem_solution",
    ctaStrategy: "contact_first",
  },
  creator: {
    brandPosition: "lifestyle",
    marketPosition: "niche",
    conversionStrategy: "relationship",
    heroStrategy: "founder_story",
    imageDirection: "lifestyle",
  },
  nonprofit: {
    brandPosition: "community",
    priceSegment: "value",
    conversionStrategy: "soft_nurture",
    heroStrategy: "social_proof",
    localGlobal: "regional",
  },
  saas: {
    brandPosition: "innovator",
    marketPosition: "emerging",
    conversionStrategy: "direct_cta",
    heroStrategy: "problem_solution",
    ctaStrategy: "dual_primary_secondary",
    imageDirection: "abstract",
    localGlobal: "global",
  },
  other: {},
};

/** Personality → soft axis / emotion nudges. */
export const PERSONALITY_DNA_NUDGES: Partial<
  Record<
    string,
    Partial<
      Pick<
        CategoryDnaDefaults,
        | "emotionalStyle"
        | "brandPosition"
        | "luxuryFriendly"
        | "formalCasual"
        | "modernClassic"
        | "trustStrategy"
      >
    >
  >
> = {
  trustworthy: { trustStrategy: "credentials", emotionalStyle: "reassuring" },
  innovative: { brandPosition: "innovator", modernClassic: "modern" },
  friendly: { luxuryFriendly: "friendly", formalCasual: "casual" },
  premium: { luxuryFriendly: "luxury", brandPosition: "leader" },
  caring: { emotionalStyle: "warm", trustStrategy: "community" },
  expert: { brandPosition: "specialist", trustStrategy: "expertise" },
  energetic: { emotionalStyle: "energetic", modernClassic: "modern" },
  calm: { emotionalStyle: "calm", formalCasual: "relaxed" },
  authentic: { brandPosition: "community", trustStrategy: "transparency" },
  modern: { modernClassic: "modern" },
};
