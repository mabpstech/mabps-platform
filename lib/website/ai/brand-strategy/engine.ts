/**
 * Deterministic Brand Strategy engine (Sprint C4).
 * AiBusinessDNA → AiBrandStrategy. No LLM, network, UI, pages, sections, or themes.
 */

import type {
  AiBrandPromise,
  AiBrandStrategy,
  AiBusinessDNA,
  AiConversionJourney,
  AiCoreMessage,
  AiEmotionalJourney,
  AiHeroMessageStrategy,
  AiIconStyle,
  AiIllustrationStyle,
  AiImageStyle,
  AiPhotographyDirection,
  AiSectionEmphasis,
  AiStorytellingStrategy,
  AiStrategyField,
  AiUniqueValueProposition,
  AiVoiceTone,
} from "@/lib/website/ai/types";
import {
  BRAND_POSITION_TO_PROMISE,
  BRAND_POSITION_TO_STORYTELLING,
  BRAND_POSITION_TO_UVP,
  COLOUR_TO_PHOTOGRAPHY,
  COMMUNICATION_TO_CORE_MESSAGE,
  COMMUNICATION_TO_STORYTELLING,
  COMMUNICATION_TO_VOICE,
  CONTENT_DENSITY_TO_SECTION,
  CONVERSION_TO_JOURNEY,
  CONVERSION_TO_SECTION_EMPHASIS,
  CTA_TO_CONVERSION_JOURNEY,
  CTA_TO_SECTION_EMPHASIS,
  EMOTIONAL_TO_JOURNEY,
  EMOTIONAL_TO_PHOTOGRAPHY,
  EMOTIONAL_TO_VOICE,
  EMPTY_BRAND_STRATEGY_DEFAULTS,
  FORMAL_CASUAL_TO_VOICE,
  HERO_TO_MESSAGE_STRATEGY,
  HERO_TO_STORYTELLING,
  IMAGE_DIRECTION_TO_STYLE,
  LOCAL_GLOBAL_TO_UVP,
  LUXURY_FRIENDLY_TO_PROMISE,
  MARKET_POSITION_TO_UVP,
  MODERN_CLASSIC_TO_ILLUSTRATION,
  PRICE_SEGMENT_TO_PROMISE,
  TRUST_TO_EMOTIONAL_JOURNEY,
  VISUAL_TO_ICON,
  VISUAL_TO_ILLUSTRATION,
  VISUAL_TO_IMAGE_STYLE,
} from "@/lib/website/ai/brand-strategy/lexicon";
import {
  AI_CONFIDENCE_THRESHOLD,
  type AiBrandStrategyInput,
} from "@/lib/website/ai/brand-strategy/types";

function field<T>(value: T, confidence: number): AiStrategyField<T> {
  return {
    value,
    confidence: Math.round(Math.min(1, Math.max(0, confidence)) * 100) / 100,
  };
}

function blend(...scores: number[]): number {
  if (scores.length === 0) return 0.35;
  const sum = scores.reduce((a, b) => a + b, 0);
  return Math.min(1, sum / scores.length);
}

function dnaConf(dna: AiBusinessDNA, key: keyof AiBusinessDNA): number {
  return dna[key].confidence;
}

function inferBrandPromise(
  dna: AiBusinessDNA,
): { value: AiBrandPromise; confidence: number } {
  const luxury = LUXURY_FRIENDLY_TO_PROMISE[dna.luxuryFriendly.value];
  if (
    luxury &&
    (dna.luxuryFriendly.value === "luxury" ||
      dna.priceSegment.value === "luxury")
  ) {
    return {
      value: luxury,
      confidence: blend(
        dnaConf(dna, "luxuryFriendly"),
        dnaConf(dna, "priceSegment"),
        0.85,
      ),
    };
  }

  const pricePromise = PRICE_SEGMENT_TO_PROMISE[dna.priceSegment.value];
  if (pricePromise && dnaConf(dna, "priceSegment") >= AI_CONFIDENCE_THRESHOLD) {
    return {
      value: pricePromise,
      confidence: blend(dnaConf(dna, "priceSegment"), 0.75),
    };
  }

  if (
    dna.emotionalStyle.value === "inspiring" ||
    dna.conversionStrategy.value === "consultative"
  ) {
    return {
      value: "transformative_results",
      confidence: blend(
        dnaConf(dna, "emotionalStyle"),
        dnaConf(dna, "conversionStrategy"),
        0.7,
      ),
    };
  }

  if (
    dna.ctaStrategy.value === "shop_first" ||
    dna.conversionStrategy.value === "catalog_browse"
  ) {
    return {
      value: "effortless_convenience",
      confidence: blend(
        dnaConf(dna, "ctaStrategy"),
        dnaConf(dna, "conversionStrategy"),
        0.7,
      ),
    };
  }

  return {
    value: BRAND_POSITION_TO_PROMISE[dna.brandPosition.value],
    confidence: blend(dnaConf(dna, "brandPosition"), 0.7),
  };
}

function inferCoreMessage(
  dna: AiBusinessDNA,
): { value: AiCoreMessage; confidence: number } {
  if (dna.trustStrategy.value === "credentials" || dna.trustStrategy.value === "expertise") {
    return {
      value: "expertise_first",
      confidence: blend(dnaConf(dna, "trustStrategy"), 0.75),
    };
  }
  if (dna.priceSegment.value === "value" || dna.priceSegment.value === "budget") {
    return {
      value: "value_first",
      confidence: blend(dnaConf(dna, "priceSegment"), 0.7),
    };
  }
  if (
    dna.heroStrategy.value === "atmosphere" ||
    dna.luxuryFriendly.value === "luxury"
  ) {
    return {
      value: "experience_first",
      confidence: blend(
        dnaConf(dna, "heroStrategy"),
        dnaConf(dna, "luxuryFriendly"),
        0.7,
      ),
    };
  }
  if (dna.conversionStrategy.value === "relationship") {
    return {
      value: "relationship_first",
      confidence: blend(dnaConf(dna, "conversionStrategy"), 0.7),
    };
  }

  return {
    value: COMMUNICATION_TO_CORE_MESSAGE[dna.communicationStyle.value],
    confidence: blend(dnaConf(dna, "communicationStyle"), 0.7),
  };
}

function inferUvp(
  dna: AiBusinessDNA,
): { value: AiUniqueValueProposition; confidence: number } {
  const localUvp = LOCAL_GLOBAL_TO_UVP[dna.localGlobal.value];
  if (localUvp && dnaConf(dna, "localGlobal") >= AI_CONFIDENCE_THRESHOLD) {
    return {
      value: localUvp,
      confidence: blend(dnaConf(dna, "localGlobal"), 0.75),
    };
  }

  const marketUvp = MARKET_POSITION_TO_UVP[dna.marketPosition.value];
  if (
    marketUvp &&
    dna.marketPosition.value === "premium_niche" &&
    dnaConf(dna, "marketPosition") >= AI_CONFIDENCE_THRESHOLD
  ) {
    return {
      value: marketUvp,
      confidence: blend(dnaConf(dna, "marketPosition"), 0.75),
    };
  }

  if (
    dna.priceSegment.value === "luxury" ||
    dna.luxuryFriendly.value === "luxury"
  ) {
    return {
      value: "premium_quality",
      confidence: blend(
        dnaConf(dna, "priceSegment"),
        dnaConf(dna, "luxuryFriendly"),
        0.8,
      ),
    };
  }

  if (dna.ctaStrategy.value === "shop_first") {
    return {
      value: "speed_convenience",
      confidence: blend(dnaConf(dna, "ctaStrategy"), 0.7),
    };
  }

  if (
    dna.emotionalStyle.value === "warm" ||
    dna.emotionalStyle.value === "intimate"
  ) {
    return {
      value: "personal_care",
      confidence: blend(dnaConf(dna, "emotionalStyle"), 0.7),
    };
  }

  return {
    value: BRAND_POSITION_TO_UVP[dna.brandPosition.value],
    confidence: blend(
      dnaConf(dna, "brandPosition"),
      dnaConf(dna, "marketPosition"),
      0.7,
    ),
  };
}

function inferHeroMessage(
  dna: AiBusinessDNA,
): { value: AiHeroMessageStrategy; confidence: number } {
  if (
    dna.emotionalStyle.value === "bold" &&
    dna.heroStrategy.value !== "minimal_statement"
  ) {
    return {
      value: "bold_claim",
      confidence: blend(
        dnaConf(dna, "emotionalStyle"),
        dnaConf(dna, "heroStrategy"),
        0.75,
      ),
    };
  }
  if (dna.emotionalStyle.value === "aspirational") {
    return {
      value: "aspirational_vision",
      confidence: blend(dnaConf(dna, "emotionalStyle"), 0.75),
    };
  }

  return {
    value: HERO_TO_MESSAGE_STRATEGY[dna.heroStrategy.value],
    confidence: blend(dnaConf(dna, "heroStrategy"), 0.8),
  };
}

function inferVoiceTone(
  dna: AiBusinessDNA,
): { value: AiVoiceTone; confidence: number } {
  const formalVoice = FORMAL_CASUAL_TO_VOICE[dna.formalCasual.value];
  if (
    formalVoice &&
    (dna.formalCasual.value === "formal" ||
      dna.formalCasual.value === "polished") &&
    dnaConf(dna, "formalCasual") >= AI_CONFIDENCE_THRESHOLD
  ) {
    return {
      value: formalVoice,
      confidence: blend(dnaConf(dna, "formalCasual"), 0.75),
    };
  }

  const commVoice = COMMUNICATION_TO_VOICE[dna.communicationStyle.value];
  if (commVoice && dnaConf(dna, "communicationStyle") >= AI_CONFIDENCE_THRESHOLD) {
    return {
      value: commVoice,
      confidence: blend(dnaConf(dna, "communicationStyle"), 0.75),
    };
  }

  if (
    dna.brandPosition.value === "heritage" ||
    dna.visualIdentity.value === "warm_organic"
  ) {
    return {
      value: "humble_craftsman",
      confidence: blend(
        dnaConf(dna, "brandPosition"),
        dnaConf(dna, "visualIdentity"),
        0.7,
      ),
    };
  }

  return {
    value: EMOTIONAL_TO_VOICE[dna.emotionalStyle.value],
    confidence: blend(
      dnaConf(dna, "emotionalStyle"),
      dnaConf(dna, "formalCasual"),
      0.7,
    ),
  };
}

function inferStorytelling(
  dna: AiBusinessDNA,
): { value: AiStorytellingStrategy; confidence: number } {
  const positionStory =
    BRAND_POSITION_TO_STORYTELLING[dna.brandPosition.value];
  if (
    positionStory &&
    dnaConf(dna, "brandPosition") >= AI_CONFIDENCE_THRESHOLD
  ) {
    return {
      value: positionStory,
      confidence: blend(dnaConf(dna, "brandPosition"), 0.75),
    };
  }

  const commStory =
    COMMUNICATION_TO_STORYTELLING[dna.communicationStyle.value];
  if (
    commStory &&
    dnaConf(dna, "communicationStyle") >= AI_CONFIDENCE_THRESHOLD
  ) {
    return {
      value: commStory,
      confidence: blend(dnaConf(dna, "communicationStyle"), 0.75),
    };
  }

  if (
    dna.localGlobal.value === "hyperlocal" ||
    dna.localGlobal.value === "local"
  ) {
    return {
      value: "place_rooted",
      confidence: blend(dnaConf(dna, "localGlobal"), 0.7),
    };
  }

  return {
    value: HERO_TO_STORYTELLING[dna.heroStrategy.value],
    confidence: blend(dnaConf(dna, "heroStrategy"), 0.75),
  };
}

function inferImageStyle(
  dna: AiBusinessDNA,
): { value: AiImageStyle; confidence: number } {
  const fromDirection = IMAGE_DIRECTION_TO_STYLE[dna.imageDirection.value];
  if (
    fromDirection &&
    dnaConf(dna, "imageDirection") >= AI_CONFIDENCE_THRESHOLD
  ) {
    return {
      value: fromDirection,
      confidence: blend(dnaConf(dna, "imageDirection"), 0.8),
    };
  }

  return {
    value: VISUAL_TO_IMAGE_STYLE[dna.visualIdentity.value],
    confidence: blend(dnaConf(dna, "visualIdentity"), 0.75),
  };
}

function inferIllustration(
  dna: AiBusinessDNA,
): { value: AiIllustrationStyle; confidence: number } {
  if (
    dna.visualIdentity.value === "elegant_refined" ||
    dna.luxuryFriendly.value === "luxury"
  ) {
    return {
      value: "none",
      confidence: blend(
        dnaConf(dna, "visualIdentity"),
        dnaConf(dna, "luxuryFriendly"),
        0.75,
      ),
    };
  }

  const classicIll =
    MODERN_CLASSIC_TO_ILLUSTRATION[dna.modernClassic.value];
  if (
    classicIll &&
    (dna.modernClassic.value === "classic" ||
      dna.modernClassic.value === "lean_classic") &&
    dnaConf(dna, "modernClassic") >= AI_CONFIDENCE_THRESHOLD
  ) {
    return {
      value: classicIll,
      confidence: blend(dnaConf(dna, "modernClassic"), 0.7),
    };
  }

  return {
    value: VISUAL_TO_ILLUSTRATION[dna.visualIdentity.value],
    confidence: blend(dnaConf(dna, "visualIdentity"), 0.75),
  };
}

function inferIconStyle(
  dna: AiBusinessDNA,
): { value: AiIconStyle; confidence: number } {
  if (dna.formalCasual.value === "formal") {
    return {
      value: "solid_simple",
      confidence: blend(dnaConf(dna, "formalCasual"), 0.7),
    };
  }
  if (dna.visualIdentity.value === "tech_sharp") {
    return {
      value: "geometric_sharp",
      confidence: blend(dnaConf(dna, "visualIdentity"), 0.8),
    };
  }

  return {
    value: VISUAL_TO_ICON[dna.visualIdentity.value],
    confidence: blend(
      dnaConf(dna, "visualIdentity"),
      dnaConf(dna, "formalCasual"),
      0.7,
    ),
  };
}

function inferPhotography(
  dna: AiBusinessDNA,
): { value: AiPhotographyDirection; confidence: number } {
  const emotionalPhoto = EMOTIONAL_TO_PHOTOGRAPHY[dna.emotionalStyle.value];
  if (
    emotionalPhoto &&
    dnaConf(dna, "emotionalStyle") >= AI_CONFIDENCE_THRESHOLD &&
    (dna.emotionalStyle.value === "bold" ||
      dna.emotionalStyle.value === "aspirational")
  ) {
    return {
      value: emotionalPhoto,
      confidence: blend(dnaConf(dna, "emotionalStyle"), 0.75),
    };
  }

  if (dna.colourPsychology.value === "luxury_dark") {
    return {
      value: "moody_dark",
      confidence: blend(dnaConf(dna, "colourPsychology"), 0.85),
    };
  }

  return {
    value: COLOUR_TO_PHOTOGRAPHY[dna.colourPsychology.value],
    confidence: blend(
      dnaConf(dna, "colourPsychology"),
      dnaConf(dna, "emotionalStyle"),
      0.75,
    ),
  };
}

function inferSectionEmphasis(
  dna: AiBusinessDNA,
): { value: AiSectionEmphasis; confidence: number } {
  const ctaEmphasis = CTA_TO_SECTION_EMPHASIS[dna.ctaStrategy.value];
  if (ctaEmphasis && dnaConf(dna, "ctaStrategy") >= AI_CONFIDENCE_THRESHOLD) {
    return {
      value: ctaEmphasis,
      confidence: blend(dnaConf(dna, "ctaStrategy"), 0.8),
    };
  }

  if (
    dna.trustStrategy.value === "credentials" ||
    dna.trustStrategy.value === "expertise"
  ) {
    return {
      value: "trust_forward",
      confidence: blend(dnaConf(dna, "trustStrategy"), 0.75),
    };
  }

  const densityEmphasis =
    CONTENT_DENSITY_TO_SECTION[dna.contentDensity.value];
  if (
    densityEmphasis &&
    dna.contentDensity.value === "sparse" &&
    dnaConf(dna, "contentDensity") >= AI_CONFIDENCE_THRESHOLD
  ) {
    return {
      value: densityEmphasis,
      confidence: blend(dnaConf(dna, "contentDensity"), 0.7),
    };
  }

  if (dna.heroStrategy.value === "social_proof") {
    return {
      value: "proof_forward",
      confidence: blend(dnaConf(dna, "heroStrategy"), 0.75),
    };
  }

  return {
    value: CONVERSION_TO_SECTION_EMPHASIS[dna.conversionStrategy.value],
    confidence: blend(dnaConf(dna, "conversionStrategy"), 0.75),
  };
}

function inferEmotionalJourney(
  dna: AiBusinessDNA,
): { value: AiEmotionalJourney; confidence: number } {
  const trustJourney = TRUST_TO_EMOTIONAL_JOURNEY[dna.trustStrategy.value];
  if (
    trustJourney &&
    dnaConf(dna, "trustStrategy") >= AI_CONFIDENCE_THRESHOLD
  ) {
    return {
      value: trustJourney,
      confidence: blend(dnaConf(dna, "trustStrategy"), 0.75),
    };
  }

  if (dna.heroStrategy.value === "problem_solution") {
    return {
      value: "problem_to_relief",
      confidence: blend(dnaConf(dna, "heroStrategy"), 0.75),
    };
  }

  if (
    dna.heroStrategy.value === "atmosphere" ||
    dna.imageDirection.value === "food"
  ) {
    return {
      value: "discovery_to_delight",
      confidence: blend(
        dnaConf(dna, "heroStrategy"),
        dnaConf(dna, "imageDirection"),
        0.7,
      ),
    };
  }

  return {
    value: EMOTIONAL_TO_JOURNEY[dna.emotionalStyle.value],
    confidence: blend(dnaConf(dna, "emotionalStyle"), 0.75),
  };
}

function inferConversionJourney(
  dna: AiBusinessDNA,
): { value: AiConversionJourney; confidence: number } {
  const ctaJourney = CTA_TO_CONVERSION_JOURNEY[dna.ctaStrategy.value];
  if (ctaJourney && dnaConf(dna, "ctaStrategy") >= AI_CONFIDENCE_THRESHOLD) {
    return {
      value: ctaJourney,
      confidence: blend(dnaConf(dna, "ctaStrategy"), 0.8),
    };
  }

  return {
    value: CONVERSION_TO_JOURNEY[dna.conversionStrategy.value],
    confidence: blend(dnaConf(dna, "conversionStrategy"), 0.8),
  };
}

/**
 * Derive Brand Strategy from Business DNA.
 * Pure / synchronous / deterministic.
 */
export function inferBrandStrategy(
  input: AiBrandStrategyInput,
): AiBrandStrategy {
  const { dna } = input;

  const brandPromise = inferBrandPromise(dna);
  const coreMessage = inferCoreMessage(dna);
  const uniqueValueProposition = inferUvp(dna);
  const heroMessageStrategy = inferHeroMessage(dna);
  const voiceTone = inferVoiceTone(dna);
  const storytellingStrategy = inferStorytelling(dna);
  const imageStyle = inferImageStyle(dna);
  const illustrationStyle = inferIllustration(dna);
  const iconStyle = inferIconStyle(dna);
  const photographyDirection = inferPhotography(dna);
  const sectionEmphasis = inferSectionEmphasis(dna);
  const emotionalJourney = inferEmotionalJourney(dna);
  const conversionJourney = inferConversionJourney(dna);

  return {
    brandPromise: field(brandPromise.value, brandPromise.confidence),
    coreMessage: field(coreMessage.value, coreMessage.confidence),
    uniqueValueProposition: field(
      uniqueValueProposition.value,
      uniqueValueProposition.confidence,
    ),
    heroMessageStrategy: field(
      heroMessageStrategy.value,
      heroMessageStrategy.confidence,
    ),
    ctaStrategy: field(dna.ctaStrategy.value, dna.ctaStrategy.confidence),
    voiceTone: field(voiceTone.value, voiceTone.confidence),
    trustStrategy: field(
      dna.trustStrategy.value,
      dna.trustStrategy.confidence,
    ),
    storytellingStrategy: field(
      storytellingStrategy.value,
      storytellingStrategy.confidence,
    ),
    colourPsychology: field(
      dna.colourPsychology.value,
      dna.colourPsychology.confidence,
    ),
    typographyDirection: field(
      dna.typographyDirection.value,
      dna.typographyDirection.confidence,
    ),
    imageStyle: field(imageStyle.value, imageStyle.confidence),
    illustrationStyle: field(
      illustrationStyle.value,
      illustrationStyle.confidence,
    ),
    iconStyle: field(iconStyle.value, iconStyle.confidence),
    photographyDirection: field(
      photographyDirection.value,
      photographyDirection.confidence,
    ),
    sectionEmphasis: field(sectionEmphasis.value, sectionEmphasis.confidence),
    emotionalJourney: field(
      emotionalJourney.value,
      emotionalJourney.confidence,
    ),
    conversionJourney: field(
      conversionJourney.value,
      conversionJourney.confidence,
    ),
  };
}

/** Convenience: DNA only. */
export function inferBrandStrategyFromDna(
  dna: AiBusinessDNA,
): AiBrandStrategy {
  return inferBrandStrategy({ dna });
}

export function createEmptyBrandStrategy(): AiBrandStrategy {
  const d = EMPTY_BRAND_STRATEGY_DEFAULTS;
  return {
    brandPromise: field(d.brandPromise, 0),
    coreMessage: field(d.coreMessage, 0),
    uniqueValueProposition: field(d.uniqueValueProposition, 0),
    heroMessageStrategy: field(d.heroMessageStrategy, 0),
    ctaStrategy: field(d.ctaStrategy, 0),
    voiceTone: field(d.voiceTone, 0),
    trustStrategy: field(d.trustStrategy, 0),
    storytellingStrategy: field(d.storytellingStrategy, 0),
    colourPsychology: field(d.colourPsychology, 0),
    typographyDirection: field(d.typographyDirection, 0),
    imageStyle: field(d.imageStyle, 0),
    illustrationStyle: field(d.illustrationStyle, 0),
    iconStyle: field(d.iconStyle, 0),
    photographyDirection: field(d.photographyDirection, 0),
    sectionEmphasis: field(d.sectionEmphasis, 0),
    emotionalJourney: field(d.emotionalJourney, 0),
    conversionJourney: field(d.conversionJourney, 0),
  };
}
