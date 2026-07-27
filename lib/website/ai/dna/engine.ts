/**
 * Deterministic Business DNA engine (Sprint C3).
 * AiBusinessProfile → AiBusinessDNA. No LLM, network, UI, pages, sections, or themes.
 */

import type {
  AiBrandPosition,
  AiBusinessDNA,
  AiBusinessProfile,
  AiColourPsychology,
  AiCommunicationStyle,
  AiContentDensity,
  AiConversionStrategy,
  AiCtaStrategy,
  AiDnaField,
  AiEmotionalStyle,
  AiFormalCasualAxis,
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
} from "@/lib/website/ai/types";
import type { SectionType } from "@/lib/website/types";
import {
  BUSINESS_TYPE_DNA_OVERRIDES,
  CATEGORY_DNA_DEFAULTS,
  COLOUR_TO_PSYCHOLOGY,
  PERSONALITY_DNA_NUDGES,
  TONE_DNA_OVERRIDES,
  VISUAL_STYLE_TO_IDENTITY,
  type CategoryDnaDefaults,
} from "@/lib/website/ai/dna/lexicon";
import {
  AI_CONFIDENCE_THRESHOLD,
  type AiBusinessDnaInput,
} from "@/lib/website/ai/dna/types";

function field<T>(value: T, confidence: number): AiDnaField<T> {
  return {
    value,
    confidence: Math.round(Math.min(1, Math.max(0, confidence)) * 100) / 100,
  };
}

function profileConfidence(
  profile: AiBusinessProfile,
  key: keyof AiBusinessProfile["confidence"],
  fallback = 0.35,
): number {
  const score = profile.confidence[key];
  return typeof score === "number" ? score : fallback;
}

function blend(...scores: number[]): number {
  if (scores.length === 0) return 0.35;
  const sum = scores.reduce((a, b) => a + b, 0);
  return Math.min(1, sum / scores.length);
}

function mergeDefaults(
  base: CategoryDnaDefaults,
  ...patches: Array<Partial<CategoryDnaDefaults> | undefined>
): CategoryDnaDefaults {
  let next = { ...base, sectionPriority: [...base.sectionPriority] };
  for (const patch of patches) {
    if (!patch) continue;
    next = {
      ...next,
      ...patch,
      sectionPriority: patch.sectionPriority
        ? [...patch.sectionPriority]
        : next.sectionPriority,
    };
  }
  return next;
}

function inferLocalGlobal(
  profile: AiBusinessProfile,
  fallback: AiLocalGlobalAxis,
): { value: AiLocalGlobalAxis; confidence: number } {
  const regionConf = profileConfidence(profile, "region", 0);
  const countryConf = profileConfidence(profile, "country", 0);
  const type = profile.businessType;

  if (type === "local_business" || type === "restaurant") {
    if (profile.region && regionConf >= AI_CONFIDENCE_THRESHOLD) {
      return { value: "hyperlocal", confidence: blend(regionConf, 0.75) };
    }
    if (profile.country && countryConf >= AI_CONFIDENCE_THRESHOLD) {
      return { value: "local", confidence: blend(countryConf, 0.7) };
    }
  }

  if (type === "saas" || type === "creator") {
    return {
      value: "global",
      confidence: blend(profileConfidence(profile, "businessType", 0.5), 0.65),
    };
  }

  if (profile.region && regionConf >= AI_CONFIDENCE_THRESHOLD) {
    return { value: "local", confidence: regionConf };
  }
  if (profile.country && countryConf >= AI_CONFIDENCE_THRESHOLD) {
    return { value: "regional", confidence: countryConf * 0.9 };
  }

  return {
    value: fallback,
    confidence: profile.category
      ? blend(profileConfidence(profile, "category"), 0.55)
      : 0.4,
  };
}

function inferPriceSegment(
  profile: AiBusinessProfile,
  fallback: AiPriceSegment,
): { value: AiPriceSegment; confidence: number } {
  const tone = profile.tone;
  const personality = profile.brandPersonality;
  const colour = profile.colourDirection;

  if (
    tone === "luxury" ||
    colour === "dark_luxury" ||
    personality.includes("premium")
  ) {
    return {
      value: "luxury",
      confidence: blend(
        profileConfidence(profile, "tone", 0.5),
        profileConfidence(profile, "colourDirection", 0.5),
        profileConfidence(profile, "brandPersonality", 0.5),
        0.85,
      ),
    };
  }

  if (tone === "professional" || personality.includes("expert")) {
    return {
      value: "premium",
      confidence: blend(
        profileConfidence(profile, "tone", 0.5),
        profileConfidence(profile, "brandPersonality", 0.5),
        0.65,
      ),
    };
  }

  if (tone === "friendly" || tone === "playful" || tone === "warm") {
    return {
      value: fallback === "luxury" ? "mid_market" : fallback,
      confidence: blend(profileConfidence(profile, "tone", 0.5), 0.6),
    };
  }

  return {
    value: fallback,
    confidence: profile.category
      ? blend(profileConfidence(profile, "category"), 0.55)
      : 0.4,
  };
}

function inferTrustStrategy(
  profile: AiBusinessProfile,
  fallback: AiTrustStrategy,
): { value: AiTrustStrategy; confidence: number } {
  const signals = profile.trustSignals.map((s) => s.toLowerCase());
  const joined = signals.join(" ");

  if (
    signals.some((s) => s.includes("credential") || s.includes("certif")) ||
    joined.includes("license") ||
    joined.includes("years of experience")
  ) {
    return {
      value: "credentials",
      confidence: blend(profileConfidence(profile, "trustSignals"), 0.8),
    };
  }
  if (
    signals.some(
      (s) => s.includes("review") || s.includes("testimonial"),
    )
  ) {
    return {
      value: "social_proof",
      confidence: blend(profileConfidence(profile, "trustSignals"), 0.8),
    };
  }
  if (joined.includes("guarantee") || joined.includes("insured")) {
    return {
      value: "guarantees",
      confidence: blend(profileConfidence(profile, "trustSignals"), 0.75),
    };
  }
  if (joined.includes("press") || joined.includes("featured")) {
    return {
      value: "results",
      confidence: blend(profileConfidence(profile, "trustSignals"), 0.7),
    };
  }

  return {
    value: fallback,
    confidence: profile.trustSignals.length
      ? blend(profileConfidence(profile, "trustSignals"), 0.55)
      : profile.category
        ? 0.55
        : 0.4,
  };
}

function inferCtaStrategy(
  profile: AiBusinessProfile,
  fallback: AiCtaStrategy,
): { value: AiCtaStrategy; confidence: number } {
  const href = profile.primaryCta?.href?.toLowerCase() ?? "";
  const label = profile.primaryCta?.label?.toLowerCase() ?? "";
  const contacts = profile.contactPreferences;
  const isProfessional =
    profile.businessType === "professional_practice" ||
    profile.category === "professional";

  if (
    href.includes("product") ||
    label.includes("shop") ||
    label.includes("buy")
  ) {
    return {
      value: "shop_first",
      confidence: blend(profileConfidence(profile, "primaryCta"), 0.85),
    };
  }
  // Consultation / quote CTAs are contact-led even when worded as "book a …".
  if (
    label.includes("consult") ||
    label.includes("quote") ||
    (isProfessional && label.includes("book"))
  ) {
    return {
      value: "contact_first",
      confidence: blend(profileConfidence(profile, "primaryCta"), 0.8),
    };
  }
  if (
    label.includes("book") ||
    label.includes("reserve") ||
    contacts.includes("booking")
  ) {
    return {
      value: "book_first",
      confidence: blend(
        profileConfidence(profile, "primaryCta"),
        profileConfidence(profile, "contactPreferences"),
        0.8,
      ),
    };
  }
  if (label.includes("contact")) {
    return {
      value: "contact_first",
      confidence: blend(profileConfidence(profile, "primaryCta"), 0.8),
    };
  }
  if (contacts.includes("chat") && contacts.includes("whatsapp")) {
    return {
      value: "multi_path",
      confidence: blend(profileConfidence(profile, "contactPreferences"), 0.65),
    };
  }

  return {
    value: fallback,
    confidence: profile.primaryCta
      ? blend(profileConfidence(profile, "primaryCta"), 0.6)
      : profile.category
        ? 0.55
        : 0.4,
  };
}

function inferConversionStrategy(
  profile: AiBusinessProfile,
  fallback: AiConversionStrategy,
  cta: AiCtaStrategy,
): { value: AiConversionStrategy; confidence: number } {
  if (cta === "shop_first") {
    return {
      value: "catalog_browse",
      confidence: blend(profileConfidence(profile, "primaryCta"), 0.75),
    };
  }
  if (cta === "book_first") {
    return {
      value: "booking_first",
      confidence: blend(profileConfidence(profile, "primaryCta"), 0.75),
    };
  }
  if (cta === "contact_first") {
    const consultative =
      profile.businessType === "professional_practice" ||
      profile.category === "professional";
    return {
      value: consultative ? "consultative" : "lead_capture",
      confidence: blend(profileConfidence(profile, "primaryCta"), 0.7),
    };
  }

  return {
    value: fallback,
    confidence: profile.businessType
      ? blend(profileConfidence(profile, "businessType"), 0.6)
      : 0.45,
  };
}

function inferHeroStrategy(
  profile: AiBusinessProfile,
  fallback: AiHeroStrategy,
): { value: AiHeroStrategy; confidence: number } {
  if (profile.visualStyle === "minimal" || profile.tone === "minimal") {
    return {
      value: "minimal_statement",
      confidence: blend(
        profileConfidence(profile, "visualStyle"),
        profileConfidence(profile, "tone"),
        0.7,
      ),
    };
  }
  if (profile.category === "restaurant") {
    return {
      value: "atmosphere",
      confidence: blend(profileConfidence(profile, "category"), 0.7),
    };
  }
  if (profile.category === "retail" || profile.businessType === "online_store") {
    return {
      value: "product_focus",
      confidence: blend(
        profileConfidence(profile, "category"),
        profileConfidence(profile, "businessType"),
        0.7,
      ),
    };
  }
  if (profile.businessType === "creator") {
    return {
      value: "founder_story",
      confidence: blend(profileConfidence(profile, "businessType"), 0.7),
    };
  }
  if (profile.brandPersonality.includes("authentic")) {
    return {
      value: "founder_story",
      confidence: blend(profileConfidence(profile, "brandPersonality"), 0.65),
    };
  }

  return {
    value: fallback,
    confidence: profile.category
      ? blend(profileConfidence(profile, "category"), 0.55)
      : 0.4,
  };
}

function inferVisualIdentity(
  profile: AiBusinessProfile,
  fallback: AiVisualIdentity,
): { value: AiVisualIdentity; confidence: number } {
  if (profile.visualStyle) {
    return {
      value: VISUAL_STYLE_TO_IDENTITY[profile.visualStyle],
      confidence: blend(profileConfidence(profile, "visualStyle"), 0.85),
    };
  }
  return {
    value: fallback,
    confidence: profile.category
      ? blend(profileConfidence(profile, "category"), 0.55)
      : 0.4,
  };
}

function inferColourPsychology(
  profile: AiBusinessProfile,
  fallback: AiColourPsychology,
): { value: AiColourPsychology; confidence: number } {
  if (profile.colourDirection) {
    return {
      value: COLOUR_TO_PSYCHOLOGY[profile.colourDirection],
      confidence: blend(profileConfidence(profile, "colourDirection"), 0.85),
    };
  }
  return {
    value: fallback,
    confidence: profile.category
      ? blend(profileConfidence(profile, "category"), 0.55)
      : 0.4,
  };
}

function inferTypography(
  profile: AiBusinessProfile,
  fallback: AiTypographyDirection,
): { value: AiTypographyDirection; confidence: number } {
  if (profile.tone === "luxury" || profile.visualStyle === "elegant") {
    return {
      value: "classic_serif",
      confidence: blend(
        profileConfidence(profile, "tone"),
        profileConfidence(profile, "visualStyle"),
        0.75,
      ),
    };
  }
  if (profile.visualStyle === "tech" || profile.businessType === "saas") {
    return {
      value: "monospace_tech",
      confidence: blend(
        profileConfidence(profile, "visualStyle"),
        profileConfidence(profile, "businessType"),
        0.7,
      ),
    };
  }
  if (profile.visualStyle === "editorial" || profile.businessType === "creator") {
    return {
      value: "mixed_editorial",
      confidence: blend(
        profileConfidence(profile, "visualStyle"),
        profileConfidence(profile, "businessType"),
        0.7,
      ),
    };
  }
  if (profile.visualStyle === "bold" || profile.tone === "bold") {
    return {
      value: "display_accent",
      confidence: blend(
        profileConfidence(profile, "visualStyle"),
        profileConfidence(profile, "tone"),
        0.7,
      ),
    };
  }
  if (profile.tone === "professional" || profile.visualStyle === "corporate") {
    return {
      value: "geometric_sans",
      confidence: blend(
        profileConfidence(profile, "tone"),
        profileConfidence(profile, "visualStyle"),
        0.65,
      ),
    };
  }

  return {
    value: fallback,
    confidence: profile.category
      ? blend(profileConfidence(profile, "category"), 0.55)
      : 0.4,
  };
}

function inferContentDensity(
  profile: AiBusinessProfile,
  fallback: AiContentDensity,
): { value: AiContentDensity; confidence: number } {
  if (profile.tone === "minimal" || profile.visualStyle === "minimal") {
    return {
      value: "sparse",
      confidence: blend(
        profileConfidence(profile, "tone"),
        profileConfidence(profile, "visualStyle"),
        0.75,
      ),
    };
  }
  if (profile.tone === "luxury") {
    return {
      value: "sparse",
      confidence: blend(profileConfidence(profile, "tone"), 0.7),
    };
  }
  if (
    profile.category === "retail" ||
    profile.suggestedFeatures.length >= 4
  ) {
    return {
      value: "rich",
      confidence: blend(
        profileConfidence(profile, "category"),
        profileConfidence(profile, "suggestedFeatures"),
        0.65,
      ),
    };
  }

  return {
    value: fallback,
    confidence: profile.category
      ? blend(profileConfidence(profile, "category"), 0.55)
      : 0.4,
  };
}

function resolveBaseline(profile: AiBusinessProfile): {
  defaults: CategoryDnaDefaults;
  baseConfidence: number;
} {
  const category = profile.category ?? "other";
  const categoryDefaults = CATEGORY_DNA_DEFAULTS[category];
  const tonePatch = profile.tone ? TONE_DNA_OVERRIDES[profile.tone] : undefined;
  const typePatch = profile.businessType
    ? BUSINESS_TYPE_DNA_OVERRIDES[profile.businessType]
    : undefined;

  const personalityPatches = profile.brandPersonality.map(
    (p) => PERSONALITY_DNA_NUDGES[p],
  );

  const defaults = mergeDefaults(
    categoryDefaults,
    typePatch,
    tonePatch,
    ...personalityPatches,
  );

  const baseConfidence = blend(
    profile.category
      ? profileConfidence(profile, "category")
      : 0.35,
    profile.tone ? profileConfidence(profile, "tone") : 0.35,
    profile.businessType
      ? profileConfidence(profile, "businessType")
      : 0.35,
  );

  return { defaults, baseConfidence };
}

/**
 * Derive Business DNA from a structured business profile.
 * Pure / synchronous / deterministic.
 */
export function inferBusinessDna(input: AiBusinessDnaInput): AiBusinessDNA {
  const { profile } = input;
  const { defaults, baseConfidence } = resolveBaseline(profile);

  const localGlobal = inferLocalGlobal(profile, defaults.localGlobal);
  const priceSegment = inferPriceSegment(profile, defaults.priceSegment);
  const trustStrategy = inferTrustStrategy(profile, defaults.trustStrategy);
  const ctaStrategy = inferCtaStrategy(profile, defaults.ctaStrategy);
  const conversionStrategy = inferConversionStrategy(
    profile,
    defaults.conversionStrategy,
    ctaStrategy.value,
  );
  const heroStrategy = inferHeroStrategy(profile, defaults.heroStrategy);
  const visualIdentity = inferVisualIdentity(profile, defaults.visualIdentity);
  const colourPsychology = inferColourPsychology(
    profile,
    defaults.colourPsychology,
  );
  const typographyDirection = inferTypography(
    profile,
    defaults.typographyDirection,
  );
  const contentDensity = inferContentDensity(profile, defaults.contentDensity);

  const brandPosition: AiDnaField<AiBrandPosition> = field(
    defaults.brandPosition,
    blend(
      baseConfidence,
      profileConfidence(profile, "brandPersonality"),
      profileConfidence(profile, "businessType"),
    ),
  );

  const marketPosition: AiDnaField<AiMarketPosition> = field(
    defaults.marketPosition,
    blend(baseConfidence, profileConfidence(profile, "businessType")),
  );

  const emotionalStyle: AiDnaField<AiEmotionalStyle> = field(
    defaults.emotionalStyle,
    blend(
      baseConfidence,
      profileConfidence(profile, "tone"),
      profileConfidence(profile, "brandPersonality"),
    ),
  );

  const communicationStyle: AiDnaField<AiCommunicationStyle> = field(
    defaults.communicationStyle,
    blend(baseConfidence, profileConfidence(profile, "tone")),
  );

  const modernClassic: AiDnaField<AiModernClassicAxis> = field(
    defaults.modernClassic,
    blend(
      baseConfidence,
      profileConfidence(profile, "visualStyle"),
      profileConfidence(profile, "tone"),
    ),
  );

  const luxuryFriendly: AiDnaField<AiLuxuryFriendlyAxis> = field(
    defaults.luxuryFriendly,
    blend(
      baseConfidence,
      profileConfidence(profile, "tone"),
      priceSegment.confidence,
    ),
  );

  const formalCasual: AiDnaField<AiFormalCasualAxis> = field(
    defaults.formalCasual,
    blend(baseConfidence, profileConfidence(profile, "tone")),
  );

  const imageDirection: AiDnaField<AiImageDirection> = field(
    defaults.imageDirection,
    blend(
      baseConfidence,
      profileConfidence(profile, "category"),
      profileConfidence(profile, "businessType"),
    ),
  );

  const sectionPriority: AiDnaField<SectionType[]> = field(
    [...defaults.sectionPriority],
    blend(
      baseConfidence,
      profileConfidence(profile, "suggestedPages"),
      profile.category ? 0.7 : 0.4,
    ),
  );

  return {
    brandPosition,
    marketPosition,
    priceSegment: field(priceSegment.value, priceSegment.confidence),
    emotionalStyle,
    communicationStyle,
    trustStrategy: field(trustStrategy.value, trustStrategy.confidence),
    conversionStrategy: field(
      conversionStrategy.value,
      conversionStrategy.confidence,
    ),
    heroStrategy: field(heroStrategy.value, heroStrategy.confidence),
    ctaStrategy: field(ctaStrategy.value, ctaStrategy.confidence),
    visualIdentity: field(visualIdentity.value, visualIdentity.confidence),
    contentDensity: field(contentDensity.value, contentDensity.confidence),
    modernClassic,
    luxuryFriendly,
    formalCasual,
    localGlobal: field(localGlobal.value, localGlobal.confidence),
    imageDirection,
    typographyDirection: field(
      typographyDirection.value,
      typographyDirection.confidence,
    ),
    colourPsychology: field(
      colourPsychology.value,
      colourPsychology.confidence,
    ),
    sectionPriority,
  };
}

/** Convenience: profile only. */
export function inferBusinessDnaFromProfile(
  profile: AiBusinessProfile,
): AiBusinessDNA {
  return inferBusinessDna({ profile });
}

export function createEmptyBusinessDna(): AiBusinessDNA {
  const d = CATEGORY_DNA_DEFAULTS.other;
  return {
    brandPosition: field(d.brandPosition, 0),
    marketPosition: field(d.marketPosition, 0),
    priceSegment: field(d.priceSegment, 0),
    emotionalStyle: field(d.emotionalStyle, 0),
    communicationStyle: field(d.communicationStyle, 0),
    trustStrategy: field(d.trustStrategy, 0),
    conversionStrategy: field(d.conversionStrategy, 0),
    heroStrategy: field(d.heroStrategy, 0),
    ctaStrategy: field(d.ctaStrategy, 0),
    visualIdentity: field(d.visualIdentity, 0),
    contentDensity: field(d.contentDensity, 0),
    modernClassic: field(d.modernClassic, 0),
    luxuryFriendly: field(d.luxuryFriendly, 0),
    formalCasual: field(d.formalCasual, 0),
    localGlobal: field(d.localGlobal, 0),
    imageDirection: field(d.imageDirection, 0),
    typographyDirection: field(d.typographyDirection, 0),
    colourPsychology: field(d.colourPsychology, 0),
    sectionPriority: field([...d.sectionPriority], 0),
  };
}
