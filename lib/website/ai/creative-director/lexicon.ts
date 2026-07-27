/**
 * Deterministic Creative Director maps (Sprint C7).
 * DNA + Brand Strategy + Website Plan → art direction. No LLM / network / copy.
 */

import type {
  AiAnimationPhilosophy,
  AiArtDirection,
  AiContentDensity,
  AiContentPriority,
  AiCtaEmotion,
  AiCtaFlow,
  AiEmotionalJourney,
  AiEmotionalStyle,
  AiFirstImpression,
  AiHeroComposition,
  AiHeroStrategy,
  AiIconStyle,
  AiIllustrationStyle,
  AiImageStyle,
  AiLuxuryFriendlyAxis,
  AiPhotographyDirection,
  AiPremiumLevel,
  AiPriceSegment,
  AiSectionEmphasis,
  AiSectionPacing,
  AiStorytellingStrategy,
  AiUiDensity,
  AiVisualIdentity,
  AiVisualRhythm,
  AiVisualStorytelling,
  AiWebsitePurpose,
  AiWhitespaceStrategy,
} from "@/lib/website/ai/types";

/** Baseline creative direction when inputs are sparse / empty. */
export type CreativeDirectionDefaults = {
  artDirection: AiArtDirection;
  visualStorytelling: AiVisualStorytelling;
  heroComposition: AiHeroComposition;
  whitespaceStrategy: AiWhitespaceStrategy;
  sectionPacing: AiSectionPacing;
  imageStyle: AiImageStyle;
  photographyDirection: AiPhotographyDirection;
  illustrationDirection: AiIllustrationStyle;
  iconStyle: AiIconStyle;
  uiDensity: AiUiDensity;
  premiumLevel: AiPremiumLevel;
  visualRhythm: AiVisualRhythm;
  animationPhilosophy: AiAnimationPhilosophy;
  emotionalProgression: AiEmotionalJourney;
  firstImpression: AiFirstImpression;
  finalCtaEmotion: AiCtaEmotion;
};

export const EMPTY_CREATIVE_DIRECTION_DEFAULTS: CreativeDirectionDefaults = {
  artDirection: "corporate_clear",
  visualStorytelling: "single_hero_narrative",
  heroComposition: "stacked_statement",
  whitespaceStrategy: "balanced_margins",
  sectionPacing: "steady_march",
  imageStyle: "lifestyle_candid",
  photographyDirection: "natural_light",
  illustrationDirection: "none",
  iconStyle: "outline_thin",
  uiDensity: "comfortable",
  premiumLevel: "polished",
  visualRhythm: "even_pulse",
  animationPhilosophy: "subtle_fade",
  emotionalProgression: "curiosity_to_confidence",
  firstImpression: "quiet_confidence",
  finalCtaEmotion: "practical_next_step",
};

export const VISUAL_IDENTITY_TO_ART: Record<AiVisualIdentity, AiArtDirection> =
  {
    clean_minimal: "minimal_editorial",
    bold_graphic: "bold_expressive",
    elegant_refined: "refined_luxury",
    warm_organic: "warm_human",
    tech_sharp: "tech_precise",
    editorial_magazine: "minimal_editorial",
    playful_colorful: "playful_dynamic",
    corporate_polished: "corporate_clear",
  };

export const STORYTELLING_TO_VISUAL: Record<
  AiStorytellingStrategy,
  AiVisualStorytelling
> = {
  founder_origin: "founder_led_arc",
  customer_transformation: "chaptered_scroll",
  craft_process: "chaptered_scroll",
  place_rooted: "atmosphere_immersion",
  mission_driven: "single_hero_narrative",
  before_after: "offer_ladder",
  day_in_life: "atmosphere_immersion",
  proof_montage: "proof_cascade",
};

export const SECTION_EMPHASIS_TO_VISUAL: Partial<
  Record<AiSectionEmphasis, AiVisualStorytelling>
> = {
  catalog_forward: "product_spotlight_chain",
  proof_forward: "proof_cascade",
  offer_forward: "offer_ladder",
  story_forward: "chaptered_scroll",
  hero_dominant: "single_hero_narrative",
};

export const CONTENT_PRIORITY_TO_VISUAL: Partial<
  Record<AiContentPriority, AiVisualStorytelling>
> = {
  visual_showcase: "montage_gallery",
  brand_story: "founder_led_arc",
  proof_and_trust: "proof_cascade",
  offer_clarity: "offer_ladder",
};

export const HERO_STRATEGY_TO_COMPOSITION: Record<
  AiHeroStrategy,
  AiHeroComposition
> = {
  product_focus: "product_stage",
  lifestyle: "full_bleed_centered",
  founder_story: "split_media_left",
  offer_led: "stacked_statement",
  atmosphere: "cinematic_wide",
  problem_solution: "split_media_right",
  social_proof: "overlay_on_imagery",
  minimal_statement: "minimal_text_field",
};

export const DENSITY_TO_WHITESPACE: Record<
  AiContentDensity,
  AiWhitespaceStrategy
> = {
  sparse: "generous_breathing",
  balanced: "balanced_margins",
  rich: "compact_efficient",
  dense: "tight_grid",
};

export const ART_TO_WHITESPACE: Partial<
  Record<AiArtDirection, AiWhitespaceStrategy>
> = {
  refined_luxury: "luxury_void",
  minimal_editorial: "editorial_asymmetric",
  bold_expressive: "compact_efficient",
};

export const DENSITY_TO_PACING: Record<AiContentDensity, AiSectionPacing> = {
  sparse: "slow_cinematic",
  balanced: "measured_reveal",
  rich: "steady_march",
  dense: "dense_catalog",
};

export const PURPOSE_TO_PACING: Partial<
  Record<AiWebsitePurpose, AiSectionPacing>
> = {
  drive_sales: "quick_scan",
  showcase_brand: "slow_cinematic",
  inform_educate: "measured_reveal",
  nurture_community: "burst_then_pause",
};

export const DENSITY_TO_UI: Record<AiContentDensity, AiUiDensity> = {
  sparse: "airy",
  balanced: "comfortable",
  rich: "compact",
  dense: "dense",
};

export const PRICE_TO_PREMIUM: Record<AiPriceSegment, AiPremiumLevel> = {
  budget: "essential",
  value: "polished",
  mid_market: "polished",
  premium: "premium",
  luxury: "ultra_luxury",
};

export const LUXURY_TO_PREMIUM: Partial<
  Record<AiLuxuryFriendlyAxis, AiPremiumLevel>
> = {
  luxury: "ultra_luxury",
  elevated: "elevated",
  approachable: "polished",
  friendly: "essential",
};

export const DENSITY_TO_RHYTHM: Record<AiContentDensity, AiVisualRhythm> = {
  sparse: "hero_then_calm",
  balanced: "even_pulse",
  rich: "wave_emphasis",
  dense: "staccato_blocks",
};

export const VISUAL_STORY_TO_RHYTHM: Partial<
  Record<AiVisualStorytelling, AiVisualRhythm>
> = {
  montage_gallery: "gallery_beats",
  chaptered_scroll: "long_form_flow",
  atmosphere_immersion: "hero_then_calm",
  product_spotlight_chain: "staccato_blocks",
};

export const ART_TO_ANIMATION: Record<AiArtDirection, AiAnimationPhilosophy> = {
  minimal_editorial: "editorial_reveal",
  bold_expressive: "confident_snap",
  refined_luxury: "subtle_fade",
  warm_human: "gentle_rise",
  tech_precise: "confident_snap",
  organic_natural: "gentle_rise",
  playful_dynamic: "playful_micro",
  corporate_clear: "subtle_fade",
};

export const PREMIUM_TO_ANIMATION: Partial<
  Record<AiPremiumLevel, AiAnimationPhilosophy>
> = {
  ultra_luxury: "cinematic_parallax",
  essential: "none_static",
};

export const EMOTIONAL_TO_FIRST_IMPRESSION: Record<
  AiEmotionalStyle,
  AiFirstImpression
> = {
  warm: "warm_welcome",
  calm: "calm_authority",
  energetic: "energy_burst",
  inspiring: "curious_invite",
  reassuring: "trust_first",
  bold: "bold_impact",
  intimate: "warm_welcome",
  aspirational: "refined_elegance",
};

export const ART_TO_FIRST_IMPRESSION: Partial<
  Record<AiArtDirection, AiFirstImpression>
> = {
  refined_luxury: "refined_elegance",
  minimal_editorial: "quiet_confidence",
  corporate_clear: "calm_authority",
  tech_precise: "bold_impact",
};

export const EMOTIONAL_JOURNEY_TO_CTA: Record<
  AiEmotionalJourney,
  AiCtaEmotion
> = {
  curiosity_to_confidence: "confident_clarity",
  anxiety_to_reassurance: "reassuring_safety",
  aspiration_to_belonging: "aspirational_pull",
  problem_to_relief: "practical_next_step",
  discovery_to_delight: "friendly_invite",
  skepticism_to_trust: "reassuring_safety",
  excitement_to_action: "urgent_momentum",
  calm_to_commitment: "warm_encouragement",
};

export const CTA_FLOW_TO_EMOTION: Partial<Record<AiCtaFlow, AiCtaEmotion>> = {
  soft_then_hard: "warm_encouragement",
  shop_path: "urgent_momentum",
  book_path: "practical_next_step",
  multi_path_by_intent: "friendly_invite",
  offer_then_contact: "confident_clarity",
};

export const PREMIUM_TO_CTA_EMOTION: Partial<
  Record<AiPremiumLevel, AiCtaEmotion>
> = {
  ultra_luxury: "exclusive_access",
  premium: "aspirational_pull",
};
