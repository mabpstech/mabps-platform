/**
 * Deterministic Creative Director engine (Sprint C7).
 * DNA + Brand Strategy + Website Plan → AiCreativeDirection.
 * No LLM, network, UI, pages, sections, copy, or blueprint JSON.
 */

import type {
  AiAnimationPhilosophy,
  AiArtDirection,
  AiBrandStrategy,
  AiBusinessDNA,
  AiCreativeDirection,
  AiCtaEmotion,
  AiFirstImpression,
  AiHeroComposition,
  AiPremiumLevel,
  AiSectionPacing,
  AiStrategyField,
  AiUiDensity,
  AiVisualRhythm,
  AiVisualStorytelling,
  AiWebsitePlan,
  AiWhitespaceStrategy,
} from "@/lib/website/ai/types";
import {
  ART_TO_ANIMATION,
  ART_TO_FIRST_IMPRESSION,
  ART_TO_WHITESPACE,
  CONTENT_PRIORITY_TO_VISUAL,
  CTA_FLOW_TO_EMOTION,
  DENSITY_TO_PACING,
  DENSITY_TO_RHYTHM,
  DENSITY_TO_UI,
  DENSITY_TO_WHITESPACE,
  EMOTIONAL_JOURNEY_TO_CTA,
  EMOTIONAL_TO_FIRST_IMPRESSION,
  EMPTY_CREATIVE_DIRECTION_DEFAULTS,
  HERO_STRATEGY_TO_COMPOSITION,
  LUXURY_TO_PREMIUM,
  PREMIUM_TO_ANIMATION,
  PREMIUM_TO_CTA_EMOTION,
  PRICE_TO_PREMIUM,
  PURPOSE_TO_PACING,
  SECTION_EMPHASIS_TO_VISUAL,
  STORYTELLING_TO_VISUAL,
  VISUAL_IDENTITY_TO_ART,
  VISUAL_STORY_TO_RHYTHM,
} from "@/lib/website/ai/creative-director/lexicon";
import {
  AI_CONFIDENCE_THRESHOLD,
  type AiCreativeDirectorInput,
} from "@/lib/website/ai/creative-director/types";

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

function strategyConf(
  strategy: AiBrandStrategy,
  key: keyof AiBrandStrategy,
): number {
  return strategy[key].confidence;
}

function planConf(plan: AiWebsitePlan, key: keyof AiWebsitePlan): number {
  return plan[key].confidence;
}

function inferArtDirection(
  dna: AiBusinessDNA,
): { value: AiArtDirection; confidence: number } {
  if (
    dna.luxuryFriendly.value === "luxury" &&
    dnaConf(dna, "luxuryFriendly") >= AI_CONFIDENCE_THRESHOLD
  ) {
    return {
      value: "refined_luxury",
      confidence: blend(dnaConf(dna, "luxuryFriendly"), 0.85),
    };
  }

  if (
    dna.visualIdentity.value === "warm_organic" ||
    dna.imageDirection.value === "food" ||
    dna.imageDirection.value === "place"
  ) {
    return {
      value:
        dna.visualIdentity.value === "warm_organic"
          ? "warm_human"
          : "organic_natural",
      confidence: blend(
        dnaConf(dna, "visualIdentity"),
        dnaConf(dna, "imageDirection"),
        0.75,
      ),
    };
  }

  return {
    value: VISUAL_IDENTITY_TO_ART[dna.visualIdentity.value],
    confidence: blend(dnaConf(dna, "visualIdentity"), 0.8),
  };
}

function inferVisualStorytelling(
  strategy: AiBrandStrategy,
  plan: AiWebsitePlan,
): { value: AiVisualStorytelling; confidence: number } {
  for (const priority of plan.contentPriorities.value) {
    const mapped = CONTENT_PRIORITY_TO_VISUAL[priority];
    if (
      mapped &&
      planConf(plan, "contentPriorities") >= AI_CONFIDENCE_THRESHOLD
    ) {
      return {
        value: mapped,
        confidence: blend(planConf(plan, "contentPriorities"), 0.75),
      };
    }
  }

  const fromEmphasis =
    SECTION_EMPHASIS_TO_VISUAL[strategy.sectionEmphasis.value];
  if (
    fromEmphasis &&
    strategyConf(strategy, "sectionEmphasis") >= AI_CONFIDENCE_THRESHOLD
  ) {
    return {
      value: fromEmphasis,
      confidence: blend(strategyConf(strategy, "sectionEmphasis"), 0.75),
    };
  }

  return {
    value: STORYTELLING_TO_VISUAL[strategy.storytellingStrategy.value],
    confidence: blend(strategyConf(strategy, "storytellingStrategy"), 0.8),
  };
}

function inferHeroComposition(
  dna: AiBusinessDNA,
  art: AiArtDirection,
): { value: AiHeroComposition; confidence: number } {
  if (art === "refined_luxury" || art === "minimal_editorial") {
    if (dna.heroStrategy.value === "minimal_statement") {
      return {
        value: "minimal_text_field",
        confidence: blend(
          dnaConf(dna, "heroStrategy"),
          dnaConf(dna, "luxuryFriendly"),
          0.8,
        ),
      };
    }
    if (dna.heroStrategy.value === "atmosphere") {
      return {
        value: "cinematic_wide",
        confidence: blend(dnaConf(dna, "heroStrategy"), 0.8),
      };
    }
  }

  if (
    dna.heroStrategy.value === "product_focus" &&
    dna.imageDirection.value === "product"
  ) {
    return {
      value: "product_stage",
      confidence: blend(
        dnaConf(dna, "heroStrategy"),
        dnaConf(dna, "imageDirection"),
        0.85,
      ),
    };
  }

  return {
    value: HERO_STRATEGY_TO_COMPOSITION[dna.heroStrategy.value],
    confidence: blend(dnaConf(dna, "heroStrategy"), 0.8),
  };
}

function inferWhitespace(
  dna: AiBusinessDNA,
  art: AiArtDirection,
  premium: AiPremiumLevel,
): { value: AiWhitespaceStrategy; confidence: number } {
  if (premium === "ultra_luxury" || premium === "premium") {
    return {
      value: "luxury_void",
      confidence: blend(dnaConf(dna, "priceSegment"), 0.85),
    };
  }

  const artSpace = ART_TO_WHITESPACE[art];
  if (artSpace && (art === "minimal_editorial" || art === "refined_luxury")) {
    return {
      value: artSpace,
      confidence: blend(dnaConf(dna, "visualIdentity"), 0.75),
    };
  }

  return {
    value: DENSITY_TO_WHITESPACE[dna.contentDensity.value],
    confidence: blend(dnaConf(dna, "contentDensity"), 0.8),
  };
}

function inferSectionPacing(
  dna: AiBusinessDNA,
  plan: AiWebsitePlan,
): { value: AiSectionPacing; confidence: number } {
  const purposePacing = PURPOSE_TO_PACING[plan.websitePurpose.value];
  if (
    purposePacing &&
    planConf(plan, "websitePurpose") >= AI_CONFIDENCE_THRESHOLD
  ) {
    return {
      value: purposePacing,
      confidence: blend(planConf(plan, "websitePurpose"), 0.75),
    };
  }

  if (
    plan.contentPriorities.value.includes("visual_showcase") &&
    dna.contentDensity.value === "sparse"
  ) {
    return {
      value: "slow_cinematic",
      confidence: blend(
        planConf(plan, "contentPriorities"),
        dnaConf(dna, "contentDensity"),
        0.75,
      ),
    };
  }

  return {
    value: DENSITY_TO_PACING[dna.contentDensity.value],
    confidence: blend(dnaConf(dna, "contentDensity"), 0.8),
  };
}

function inferUiDensity(
  dna: AiBusinessDNA,
): { value: AiUiDensity; confidence: number } {
  if (
    dna.formalCasual.value === "formal" &&
    dna.contentDensity.value !== "dense"
  ) {
    return {
      value: "comfortable",
      confidence: blend(
        dnaConf(dna, "formalCasual"),
        dnaConf(dna, "contentDensity"),
        0.7,
      ),
    };
  }

  return {
    value: DENSITY_TO_UI[dna.contentDensity.value],
    confidence: blend(dnaConf(dna, "contentDensity"), 0.85),
  };
}

function inferPremiumLevel(
  dna: AiBusinessDNA,
): { value: AiPremiumLevel; confidence: number } {
  const luxury = LUXURY_TO_PREMIUM[dna.luxuryFriendly.value];
  if (
    luxury &&
    (dna.luxuryFriendly.value === "luxury" ||
      dna.luxuryFriendly.value === "elevated") &&
    dnaConf(dna, "luxuryFriendly") >= AI_CONFIDENCE_THRESHOLD
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

  return {
    value: PRICE_TO_PREMIUM[dna.priceSegment.value],
    confidence: blend(dnaConf(dna, "priceSegment"), 0.8),
  };
}

function inferVisualRhythm(
  dna: AiBusinessDNA,
  storytelling: AiVisualStorytelling,
): { value: AiVisualRhythm; confidence: number } {
  const fromStory = VISUAL_STORY_TO_RHYTHM[storytelling];
  if (fromStory) {
    return {
      value: fromStory,
      confidence: blend(dnaConf(dna, "contentDensity"), 0.75),
    };
  }

  return {
    value: DENSITY_TO_RHYTHM[dna.contentDensity.value],
    confidence: blend(dnaConf(dna, "contentDensity"), 0.8),
  };
}

function inferAnimation(
  art: AiArtDirection,
  premium: AiPremiumLevel,
  dna: AiBusinessDNA,
): { value: AiAnimationPhilosophy; confidence: number } {
  const premiumAnim = PREMIUM_TO_ANIMATION[premium];
  if (premiumAnim && premium === "ultra_luxury") {
    return {
      value: premiumAnim,
      confidence: blend(dnaConf(dna, "priceSegment"), 0.8),
    };
  }

  if (premium === "essential" || dna.contentDensity.value === "dense") {
    return {
      value: premium === "essential" ? "none_static" : "subtle_fade",
      confidence: blend(
        dnaConf(dna, "priceSegment"),
        dnaConf(dna, "contentDensity"),
        0.7,
      ),
    };
  }

  return {
    value: ART_TO_ANIMATION[art],
    confidence: blend(dnaConf(dna, "visualIdentity"), 0.75),
  };
}

function inferFirstImpression(
  dna: AiBusinessDNA,
  art: AiArtDirection,
): { value: AiFirstImpression; confidence: number } {
  const artImpression = ART_TO_FIRST_IMPRESSION[art];
  if (
    artImpression &&
    (art === "refined_luxury" || art === "minimal_editorial")
  ) {
    return {
      value: artImpression,
      confidence: blend(dnaConf(dna, "visualIdentity"), 0.8),
    };
  }

  if (
    dna.trustStrategy.value === "credentials" ||
    dna.trustStrategy.value === "expertise"
  ) {
    return {
      value: "trust_first",
      confidence: blend(dnaConf(dna, "trustStrategy"), 0.8),
    };
  }

  return {
    value: EMOTIONAL_TO_FIRST_IMPRESSION[dna.emotionalStyle.value],
    confidence: blend(dnaConf(dna, "emotionalStyle"), 0.8),
  };
}

function inferFinalCtaEmotion(
  strategy: AiBrandStrategy,
  plan: AiWebsitePlan,
  premium: AiPremiumLevel,
): { value: AiCtaEmotion; confidence: number } {
  const premiumEmotion = PREMIUM_TO_CTA_EMOTION[premium];
  if (premiumEmotion && (premium === "ultra_luxury" || premium === "premium")) {
    return {
      value: premiumEmotion,
      confidence: blend(strategyConf(strategy, "emotionalJourney"), 0.8),
    };
  }

  const flowEmotion = CTA_FLOW_TO_EMOTION[plan.ctaFlow.value];
  if (flowEmotion && planConf(plan, "ctaFlow") >= AI_CONFIDENCE_THRESHOLD) {
    return {
      value: flowEmotion,
      confidence: blend(planConf(plan, "ctaFlow"), 0.75),
    };
  }

  return {
    value: EMOTIONAL_JOURNEY_TO_CTA[strategy.emotionalJourney.value],
    confidence: blend(strategyConf(strategy, "emotionalJourney"), 0.8),
  };
}

/**
 * Derive Creative Direction from DNA + Brand Strategy + Website Plan.
 * Pure / synchronous / deterministic.
 */
export function inferCreativeDirection(
  input: AiCreativeDirectorInput,
): AiCreativeDirection {
  const { dna, strategy, plan } = input;

  const artDirection = inferArtDirection(dna);
  const visualStorytelling = inferVisualStorytelling(strategy, plan);
  const premiumLevel = inferPremiumLevel(dna);
  const heroComposition = inferHeroComposition(dna, artDirection.value);
  const whitespaceStrategy = inferWhitespace(
    dna,
    artDirection.value,
    premiumLevel.value,
  );
  const sectionPacing = inferSectionPacing(dna, plan);
  const uiDensity = inferUiDensity(dna);
  const visualRhythm = inferVisualRhythm(dna, visualStorytelling.value);
  const animationPhilosophy = inferAnimation(
    artDirection.value,
    premiumLevel.value,
    dna,
  );
  const firstImpression = inferFirstImpression(dna, artDirection.value);
  const finalCtaEmotion = inferFinalCtaEmotion(
    strategy,
    plan,
    premiumLevel.value,
  );

  return {
    artDirection: field(artDirection.value, artDirection.confidence),
    visualStorytelling: field(
      visualStorytelling.value,
      visualStorytelling.confidence,
    ),
    heroComposition: field(heroComposition.value, heroComposition.confidence),
    whitespaceStrategy: field(
      whitespaceStrategy.value,
      whitespaceStrategy.confidence,
    ),
    sectionPacing: field(sectionPacing.value, sectionPacing.confidence),
    imageStyle: field(
      strategy.imageStyle.value,
      strategy.imageStyle.confidence,
    ),
    photographyDirection: field(
      strategy.photographyDirection.value,
      strategy.photographyDirection.confidence,
    ),
    illustrationDirection: field(
      strategy.illustrationStyle.value,
      strategy.illustrationStyle.confidence,
    ),
    iconStyle: field(strategy.iconStyle.value, strategy.iconStyle.confidence),
    uiDensity: field(uiDensity.value, uiDensity.confidence),
    premiumLevel: field(premiumLevel.value, premiumLevel.confidence),
    visualRhythm: field(visualRhythm.value, visualRhythm.confidence),
    animationPhilosophy: field(
      animationPhilosophy.value,
      animationPhilosophy.confidence,
    ),
    emotionalProgression: field(
      strategy.emotionalJourney.value,
      strategy.emotionalJourney.confidence,
    ),
    firstImpression: field(firstImpression.value, firstImpression.confidence),
    finalCtaEmotion: field(finalCtaEmotion.value, finalCtaEmotion.confidence),
  };
}

/** Convenience: DNA + strategy + plan. */
export function inferCreativeDirectionFromInputs(
  dna: AiBusinessDNA,
  strategy: AiBrandStrategy,
  plan: AiWebsitePlan,
): AiCreativeDirection {
  return inferCreativeDirection({ dna, strategy, plan });
}

export function createEmptyCreativeDirection(): AiCreativeDirection {
  const d = EMPTY_CREATIVE_DIRECTION_DEFAULTS;
  return {
    artDirection: field(d.artDirection, 0),
    visualStorytelling: field(d.visualStorytelling, 0),
    heroComposition: field(d.heroComposition, 0),
    whitespaceStrategy: field(d.whitespaceStrategy, 0),
    sectionPacing: field(d.sectionPacing, 0),
    imageStyle: field(d.imageStyle, 0),
    photographyDirection: field(d.photographyDirection, 0),
    illustrationDirection: field(d.illustrationDirection, 0),
    iconStyle: field(d.iconStyle, 0),
    uiDensity: field(d.uiDensity, 0),
    premiumLevel: field(d.premiumLevel, 0),
    visualRhythm: field(d.visualRhythm, 0),
    animationPhilosophy: field(d.animationPhilosophy, 0),
    emotionalProgression: field(d.emotionalProgression, 0),
    firstImpression: field(d.firstImpression, 0),
    finalCtaEmotion: field(d.finalCtaEmotion, 0),
  };
}
