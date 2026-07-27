/**
 * Deterministic Brand Strategy maps (Sprint C4).
 * DNA-signal → communication strategy. No LLM / network.
 */

import type {
  AiBrandPosition,
  AiBrandPromise,
  AiColourPsychology,
  AiCommunicationStyle,
  AiContentDensity,
  AiConversionJourney,
  AiConversionStrategy,
  AiCoreMessage,
  AiCtaStrategy,
  AiEmotionalJourney,
  AiEmotionalStyle,
  AiFormalCasualAxis,
  AiHeroMessageStrategy,
  AiHeroStrategy,
  AiIconStyle,
  AiIllustrationStyle,
  AiImageDirection,
  AiImageStyle,
  AiLocalGlobalAxis,
  AiLuxuryFriendlyAxis,
  AiMarketPosition,
  AiModernClassicAxis,
  AiPhotographyDirection,
  AiPriceSegment,
  AiSectionEmphasis,
  AiStorytellingStrategy,
  AiTrustStrategy,
  AiTypographyDirection,
  AiUniqueValueProposition,
  AiVisualIdentity,
  AiVoiceTone,
} from "@/lib/website/ai/types";

/** Baseline strategy when DNA is sparse / empty. */
export type BrandStrategyDefaults = {
  brandPromise: AiBrandPromise;
  coreMessage: AiCoreMessage;
  uniqueValueProposition: AiUniqueValueProposition;
  heroMessageStrategy: AiHeroMessageStrategy;
  ctaStrategy: AiCtaStrategy;
  voiceTone: AiVoiceTone;
  trustStrategy: AiTrustStrategy;
  storytellingStrategy: AiStorytellingStrategy;
  colourPsychology: AiColourPsychology;
  typographyDirection: AiTypographyDirection;
  imageStyle: AiImageStyle;
  illustrationStyle: AiIllustrationStyle;
  iconStyle: AiIconStyle;
  photographyDirection: AiPhotographyDirection;
  sectionEmphasis: AiSectionEmphasis;
  emotionalJourney: AiEmotionalJourney;
  conversionJourney: AiConversionJourney;
};

export const EMPTY_BRAND_STRATEGY_DEFAULTS: BrandStrategyDefaults = {
  brandPromise: "accessible_quality",
  coreMessage: "value_first",
  uniqueValueProposition: "best_value",
  heroMessageStrategy: "minimal_statement",
  ctaStrategy: "single_primary",
  voiceTone: "confident_peer",
  trustStrategy: "transparency",
  storytellingStrategy: "proof_montage",
  colourPsychology: "clean_neutral",
  typographyDirection: "geometric_sans",
  imageStyle: "lifestyle_candid",
  illustrationStyle: "none",
  iconStyle: "outline_thin",
  photographyDirection: "natural_light",
  sectionEmphasis: "balanced_flow",
  emotionalJourney: "curiosity_to_confidence",
  conversionJourney: "awareness_consider_act",
};

export const BRAND_POSITION_TO_PROMISE: Record<
  AiBrandPosition,
  AiBrandPromise
> = {
  leader: "premium_experience",
  challenger: "innovative_edge",
  specialist: "reliable_expertise",
  community: "community_care",
  lifestyle: "premium_experience",
  heritage: "authentic_craft",
  innovator: "innovative_edge",
  accessible: "accessible_quality",
};

export const PRICE_SEGMENT_TO_PROMISE: Partial<
  Record<AiPriceSegment, AiBrandPromise>
> = {
  luxury: "premium_experience",
  premium: "premium_experience",
  budget: "effortless_convenience",
  value: "accessible_quality",
};

export const BRAND_POSITION_TO_UVP: Record<
  AiBrandPosition,
  AiUniqueValueProposition
> = {
  leader: "premium_quality",
  challenger: "innovation_leadership",
  specialist: "specialist_depth",
  community: "personal_care",
  lifestyle: "premium_quality",
  heritage: "heritage_craft",
  innovator: "innovation_leadership",
  accessible: "best_value",
};

export const LOCAL_GLOBAL_TO_UVP: Partial<
  Record<AiLocalGlobalAxis, AiUniqueValueProposition>
> = {
  hyperlocal: "local_presence",
  local: "local_presence",
};

export const COMMUNICATION_TO_CORE_MESSAGE: Record<
  AiCommunicationStyle,
  AiCoreMessage
> = {
  direct: "outcome_first",
  storytelling: "identity_first",
  educational: "expertise_first",
  conversational: "relationship_first",
  authoritative: "expertise_first",
  empathetic: "trust_first",
  witty: "discovery_first",
  minimal: "experience_first",
};

export const HERO_TO_MESSAGE_STRATEGY: Record<
  AiHeroStrategy,
  AiHeroMessageStrategy
> = {
  product_focus: "offer_led",
  lifestyle: "aspirational_vision",
  founder_story: "story_hook",
  offer_led: "offer_led",
  atmosphere: "invitation",
  problem_solution: "empathetic_problem",
  social_proof: "proof_led",
  minimal_statement: "minimal_statement",
};

export const EMOTIONAL_TO_VOICE: Record<AiEmotionalStyle, AiVoiceTone> = {
  warm: "warm_guide",
  calm: "calm_advisor",
  energetic: "energetic_coach",
  inspiring: "energetic_coach",
  reassuring: "calm_advisor",
  bold: "confident_peer",
  intimate: "warm_guide",
  aspirational: "refined_host",
};

export const FORMAL_CASUAL_TO_VOICE: Partial<
  Record<AiFormalCasualAxis, AiVoiceTone>
> = {
  formal: "authoritative_expert",
  polished: "refined_host",
  casual: "playful_friend",
  relaxed: "humble_craftsman",
};

export const COMMUNICATION_TO_VOICE: Partial<
  Record<AiCommunicationStyle, AiVoiceTone>
> = {
  authoritative: "authoritative_expert",
  witty: "playful_friend",
  empathetic: "warm_guide",
  minimal: "refined_host",
};

export const HERO_TO_STORYTELLING: Record<
  AiHeroStrategy,
  AiStorytellingStrategy
> = {
  product_focus: "craft_process",
  lifestyle: "day_in_life",
  founder_story: "founder_origin",
  offer_led: "before_after",
  atmosphere: "place_rooted",
  problem_solution: "customer_transformation",
  social_proof: "proof_montage",
  minimal_statement: "proof_montage",
};

export const BRAND_POSITION_TO_STORYTELLING: Partial<
  Record<AiBrandPosition, AiStorytellingStrategy>
> = {
  heritage: "craft_process",
  community: "place_rooted",
  innovator: "before_after",
};

export const COMMUNICATION_TO_STORYTELLING: Partial<
  Record<AiCommunicationStyle, AiStorytellingStrategy>
> = {
  storytelling: "founder_origin",
  educational: "craft_process",
  empathetic: "customer_transformation",
};

export const VISUAL_TO_IMAGE_STYLE: Record<AiVisualIdentity, AiImageStyle> = {
  clean_minimal: "studio_polished",
  bold_graphic: "product_hero",
  elegant_refined: "editorial_art",
  warm_organic: "lifestyle_candid",
  tech_sharp: "studio_polished",
  editorial_magazine: "editorial_art",
  playful_colorful: "lifestyle_candid",
  corporate_polished: "portrait_led",
};

export const IMAGE_DIRECTION_TO_STYLE: Partial<
  Record<AiImageDirection, AiImageStyle>
> = {
  product: "product_hero",
  people: "portrait_led",
  place: "ambient_mood",
  lifestyle: "lifestyle_candid",
  abstract: "editorial_art",
  process: "process_documentary",
  food: "ambient_mood",
  architecture: "documentary",
};

export const VISUAL_TO_ILLUSTRATION: Record<
  AiVisualIdentity,
  AiIllustrationStyle
> = {
  clean_minimal: "line_minimal",
  bold_graphic: "bold_graphic",
  elegant_refined: "none",
  warm_organic: "hand_drawn_warm",
  tech_sharp: "tech_diagram",
  editorial_magazine: "editorial_ink",
  playful_colorful: "flat_geometric",
  corporate_polished: "none",
};

export const MODERN_CLASSIC_TO_ILLUSTRATION: Partial<
  Record<AiModernClassicAxis, AiIllustrationStyle>
> = {
  classic: "editorial_ink",
  lean_classic: "organic_watercolor",
  modern: "flat_geometric",
};

export const VISUAL_TO_ICON: Record<AiVisualIdentity, AiIconStyle> = {
  clean_minimal: "minimal_glyph",
  bold_graphic: "outline_bold",
  elegant_refined: "outline_thin",
  warm_organic: "hand_crafted",
  tech_sharp: "geometric_sharp",
  editorial_magazine: "outline_thin",
  playful_colorful: "filled_rounded",
  corporate_polished: "solid_simple",
};

export const COLOUR_TO_PHOTOGRAPHY: Record<
  AiColourPsychology,
  AiPhotographyDirection
> = {
  trust_blue: "high_key_clean",
  energy_warm: "natural_light",
  calm_nature: "soft_diffused",
  luxury_dark: "moody_dark",
  fresh_vibrant: "color_pop",
  soft_pastel: "bright_airy",
  grounded_earth: "muted_desaturated",
  clean_neutral: "high_key_clean",
};

export const EMOTIONAL_TO_PHOTOGRAPHY: Partial<
  Record<AiEmotionalStyle, AiPhotographyDirection>
> = {
  bold: "dramatic_contrast",
  aspirational: "dramatic_contrast",
  calm: "soft_diffused",
  intimate: "natural_light",
  energetic: "color_pop",
};

export const CONVERSION_TO_SECTION_EMPHASIS: Record<
  AiConversionStrategy,
  AiSectionEmphasis
> = {
  soft_nurture: "story_forward",
  direct_cta: "offer_forward",
  booking_first: "offer_forward",
  catalog_browse: "catalog_forward",
  lead_capture: "contact_forward",
  consultative: "trust_forward",
  urgency: "offer_forward",
  relationship: "story_forward",
};

export const CTA_TO_SECTION_EMPHASIS: Partial<
  Record<AiCtaStrategy, AiSectionEmphasis>
> = {
  shop_first: "catalog_forward",
  book_first: "offer_forward",
  contact_first: "contact_forward",
  soft_secondary: "story_forward",
};

export const CONTENT_DENSITY_TO_SECTION: Partial<
  Record<AiContentDensity, AiSectionEmphasis>
> = {
  sparse: "hero_dominant",
  dense: "balanced_flow",
};

export const EMOTIONAL_TO_JOURNEY: Record<
  AiEmotionalStyle,
  AiEmotionalJourney
> = {
  warm: "aspiration_to_belonging",
  calm: "calm_to_commitment",
  energetic: "excitement_to_action",
  inspiring: "aspiration_to_belonging",
  reassuring: "anxiety_to_reassurance",
  bold: "excitement_to_action",
  intimate: "curiosity_to_confidence",
  aspirational: "aspiration_to_belonging",
};

export const TRUST_TO_EMOTIONAL_JOURNEY: Partial<
  Record<AiTrustStrategy, AiEmotionalJourney>
> = {
  credentials: "skepticism_to_trust",
  guarantees: "anxiety_to_reassurance",
  social_proof: "skepticism_to_trust",
  expertise: "curiosity_to_confidence",
  results: "problem_to_relief",
};

export const CONVERSION_TO_JOURNEY: Record<
  AiConversionStrategy,
  AiConversionJourney
> = {
  soft_nurture: "hook_nurture_close",
  direct_cta: "awareness_consider_act",
  booking_first: "inspire_desire_book",
  catalog_browse: "browse_compare_buy",
  lead_capture: "explore_shortlist_enquire",
  consultative: "diagnose_advise_convert",
  urgency: "awareness_consider_act",
  relationship: "sample_engage_subscribe",
};

export const CTA_TO_CONVERSION_JOURNEY: Partial<
  Record<AiCtaStrategy, AiConversionJourney>
> = {
  shop_first: "browse_compare_buy",
  book_first: "inspire_desire_book",
  contact_first: "learn_trust_contact",
  multi_path: "explore_shortlist_enquire",
};

export const MARKET_POSITION_TO_UVP: Partial<
  Record<AiMarketPosition, AiUniqueValueProposition>
> = {
  niche: "specialist_depth",
  premium_niche: "premium_quality",
  mass_market: "best_value",
};

export const LUXURY_FRIENDLY_TO_PROMISE: Partial<
  Record<AiLuxuryFriendlyAxis, AiBrandPromise>
> = {
  luxury: "premium_experience",
  elevated: "premium_experience",
  friendly: "community_care",
  approachable: "accessible_quality",
};
