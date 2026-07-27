/**
 * Deterministic Website Planning engine (Sprint C5).
 * BI + DNA + Brand Strategy → AiWebsitePlan.
 * No LLM, network, UI, sections, themes, copy, or blueprint JSON.
 */

import type {
  AiBrandStrategy,
  AiBusinessDNA,
  AiBusinessProfile,
  AiContentPriority,
  AiConversionFlow,
  AiCtaFlow,
  AiFooterStrategy,
  AiInternalLinkingStrategy,
  AiNavPattern,
  AiPlanNavigationStructure,
  AiPlanSectionRole,
  AiSeoPriority,
  AiStrategyField,
  AiTrustBuildingFlow,
  AiUserJourney,
  AiWebsitePlan,
  AiWebsitePurpose,
} from "@/lib/website/ai/types";
import {
  BUSINESS_TYPE_TO_PURPOSE,
  CONVERSION_JOURNEY_TO_FLOW,
  CONVERSION_JOURNEY_TO_USER_JOURNEY,
  CONVERSION_TO_PAGE_BIAS,
  CTA_TO_CTA_PAGE,
  CTA_TO_FLOW,
  CTA_TO_PURPOSE,
  EMPTY_WEBSITE_PLAN_DEFAULTS,
  PURPOSE_TO_CONTENT,
  PURPOSE_TO_FOOTER_STRATEGY,
  PURPOSE_TO_LINKING,
  PURPOSE_TO_NAV_PATTERN,
  PURPOSE_TO_SEO,
  SECTION_EMPHASIS_TO_ROLES,
  TRUST_TO_BUILDING_FLOW,
} from "@/lib/website/ai/website-plan/lexicon";
import {
  AI_CONFIDENCE_THRESHOLD,
  type AiWebsitePlanInput,
} from "@/lib/website/ai/website-plan/types";
import type { PageType } from "@/lib/website/types";
import { PAGE_TYPES } from "@/lib/website/types";

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

function profileConf(
  profile: AiBusinessProfile,
  key: keyof AiBusinessProfile["confidence"],
): number {
  return profile.confidence[key] ?? 0;
}

function uniquePages(pages: PageType[]): PageType[] {
  const out: PageType[] = [];
  for (const page of pages) {
    if (!out.includes(page)) out.push(page);
  }
  return out;
}

function isPageType(value: string): value is PageType {
  return (PAGE_TYPES as readonly string[]).includes(value);
}

function ensureCorePages(pages: PageType[]): PageType[] {
  const next = uniquePages(pages.filter(isPageType));
  if (!next.includes("home")) next.unshift("home");
  if (!next.includes("contact")) next.push("contact");
  if (!next.includes("about") && next.length < 5) {
    const contactIndex = next.indexOf("contact");
    next.splice(contactIndex, 0, "about");
  }
  return uniquePages(next);
}

function orderPages(
  required: PageType[],
  preferred: PageType[],
): PageType[] {
  const ordered: PageType[] = [];
  for (const page of preferred) {
    if (required.includes(page) && !ordered.includes(page)) {
      ordered.push(page);
    }
  }
  for (const page of required) {
    if (!ordered.includes(page)) ordered.push(page);
  }
  // Home always first when present.
  const homeIndex = ordered.indexOf("home");
  if (homeIndex > 0) {
    ordered.splice(homeIndex, 1);
    ordered.unshift("home");
  }
  return ordered;
}

function inferWebsitePurpose(
  profile: AiBusinessProfile,
  dna: AiBusinessDNA,
  strategy: AiBrandStrategy,
): { value: AiWebsitePurpose; confidence: number } {
  const ctaPurpose = CTA_TO_PURPOSE[dna.ctaStrategy.value];
  if (ctaPurpose && dnaConf(dna, "ctaStrategy") >= AI_CONFIDENCE_THRESHOLD) {
    return {
      value: ctaPurpose,
      confidence: blend(dnaConf(dna, "ctaStrategy"), 0.85),
    };
  }

  if (
    strategy.conversionJourney.value === "browse_compare_buy" ||
    dna.conversionStrategy.value === "catalog_browse"
  ) {
    return {
      value: "drive_sales",
      confidence: blend(
        strategyConf(strategy, "conversionJourney"),
        dnaConf(dna, "conversionStrategy"),
        0.8,
      ),
    };
  }

  if (
    strategy.coreMessage.value === "expertise_first" ||
    strategy.sectionEmphasis.value === "trust_forward"
  ) {
    return {
      value: "build_authority",
      confidence: blend(
        strategyConf(strategy, "coreMessage"),
        strategyConf(strategy, "sectionEmphasis"),
        0.7,
      ),
    };
  }

  if (
    strategy.storytellingStrategy.value === "mission_driven" ||
    profile.businessType === "nonprofit"
  ) {
    return {
      value: "nurture_community",
      confidence: blend(
        strategyConf(strategy, "storytellingStrategy"),
        profileConf(profile, "businessType") || 0.6,
        0.7,
      ),
    };
  }

  if (
    strategy.sectionEmphasis.value === "story_forward" ||
    profile.businessType === "creator"
  ) {
    return {
      value: "showcase_brand",
      confidence: blend(
        strategyConf(strategy, "sectionEmphasis"),
        profileConf(profile, "businessType") || 0.55,
        0.65,
      ),
    };
  }

  if (profile.businessType) {
    return {
      value: BUSINESS_TYPE_TO_PURPOSE[profile.businessType],
      confidence: blend(profileConf(profile, "businessType") || 0.55, 0.7),
    };
  }

  return {
    value: EMPTY_WEBSITE_PLAN_DEFAULTS.websitePurpose,
    confidence: 0.3,
  };
}

function inferUserJourney(
  strategy: AiBrandStrategy,
): { value: AiUserJourney; confidence: number } {
  return {
    value:
      CONVERSION_JOURNEY_TO_USER_JOURNEY[strategy.conversionJourney.value],
    confidence: blend(strategyConf(strategy, "conversionJourney"), 0.8),
  };
}

function inferRequiredPages(
  profile: AiBusinessProfile,
  dna: AiBusinessDNA,
  strategy: AiBrandStrategy,
): { value: PageType[]; confidence: number } {
  const fromProfile = (profile.suggestedPages ?? []).filter(isPageType);
  let pages = fromProfile.length
    ? [...fromProfile]
    : [...EMPTY_WEBSITE_PLAN_DEFAULTS.requiredPages];

  if (
    dna.ctaStrategy.value === "shop_first" ||
    strategy.conversionJourney.value === "browse_compare_buy"
  ) {
    if (!pages.includes("products")) pages.push("products");
  }

  if (
    strategy.coreMessage.value === "expertise_first" ||
    strategy.conversionJourney.value === "learn_trust_contact" ||
    strategy.conversionJourney.value === "diagnose_advise_convert"
  ) {
    if (!pages.includes("about")) pages.push("about");
    if (!pages.includes("blog") && pages.length < 5) pages.push("blog");
  }

  if (
    strategy.sectionEmphasis.value === "catalog_forward" &&
    !pages.includes("collections") &&
    pages.includes("products")
  ) {
    pages.push("collections");
  }

  pages = ensureCorePages(pages);

  const confidence = blend(
    profileConf(profile, "suggestedPages") ||
      (fromProfile.length ? 0.65 : 0.35),
    dnaConf(dna, "ctaStrategy"),
    strategyConf(strategy, "conversionJourney"),
  );

  return { value: pages, confidence };
}

function inferPageOrder(
  required: PageType[],
  strategy: AiBrandStrategy,
): { value: PageType[]; confidence: number } {
  const bias =
    CONVERSION_TO_PAGE_BIAS[strategy.conversionJourney.value] ??
    EMPTY_WEBSITE_PLAN_DEFAULTS.pageOrder;
  return {
    value: orderPages(required, bias),
    confidence: blend(strategyConf(strategy, "conversionJourney"), 0.75),
  };
}

function inferNavigation(
  purpose: AiWebsitePurpose,
  purposeConfidence: number,
  pageOrder: PageType[],
  dna: AiBusinessDNA,
): { value: AiPlanNavigationStructure; confidence: number } {
  const pattern: AiNavPattern =
    PURPOSE_TO_NAV_PATTERN[purpose] ??
    EMPTY_WEBSITE_PLAN_DEFAULTS.navigationPattern;

  const primaryCap =
    pattern === "minimal_core" ? 3 : pattern === "utility_dense" ? 5 : 4;
  const primaryPages: PageType[] = pageOrder
    .filter((page) => page !== "custom")
    .slice(0, primaryCap);
  const secondaryPages = pageOrder.filter(
    (page) => !primaryPages.includes(page),
  );

  const ctaPage =
    CTA_TO_CTA_PAGE[dna.ctaStrategy.value] &&
    pageOrder.includes(CTA_TO_CTA_PAGE[dna.ctaStrategy.value]!)
      ? CTA_TO_CTA_PAGE[dna.ctaStrategy.value]!
      : pageOrder.includes("contact")
        ? "contact"
        : (pageOrder[pageOrder.length - 1] ?? "contact");

  return {
    value: {
      pattern,
      primaryPages,
      secondaryPages,
      ctaPage,
    },
    confidence: blend(purposeConfidence, dnaConf(dna, "ctaStrategy"), 0.75),
  };
}

function inferSectionPriority(
  strategy: AiBrandStrategy,
  dna: AiBusinessDNA,
): { value: AiPlanSectionRole[]; confidence: number } {
  const fromEmphasis =
    SECTION_EMPHASIS_TO_ROLES[strategy.sectionEmphasis.value];
  if (
    fromEmphasis &&
    strategyConf(strategy, "sectionEmphasis") >= AI_CONFIDENCE_THRESHOLD
  ) {
    return {
      value: [...fromEmphasis],
      confidence: blend(strategyConf(strategy, "sectionEmphasis"), 0.85),
    };
  }

  // Soft fallback: map DNA sectionType priority into plan roles where possible.
  const roleFromSection: Partial<Record<string, AiPlanSectionRole>> = {
    hero: "hero",
    features: "value_proposition",
    products: "catalog",
    collections: "catalog",
    cta: "cta",
    form: "contact",
    gallery: "proof",
    richText: "story",
    blogList: "story",
    image: "story",
  };

  const mapped: AiPlanSectionRole[] = [];
  for (const section of dna.sectionPriority.value) {
    const role = roleFromSection[section];
    if (role && !mapped.includes(role)) {
      mapped.push(role);
    }
  }

  if (mapped.length >= 3) {
    if (!mapped.includes("cta")) mapped.push("cta");
    if (!mapped.includes("contact")) mapped.push("contact");
    return {
      value: mapped,
      confidence: blend(dnaConf(dna, "sectionPriority"), 0.65),
    };
  }

  return {
    value: [...EMPTY_WEBSITE_PLAN_DEFAULTS.sectionPriority],
    confidence: blend(
      strategyConf(strategy, "sectionEmphasis"),
      dnaConf(dna, "sectionPriority"),
      0.4,
    ),
  };
}
function inferCtaFlow(
  dna: AiBusinessDNA,
): { value: AiCtaFlow; confidence: number } {
  return {
    value: CTA_TO_FLOW[dna.ctaStrategy.value],
    confidence: blend(dnaConf(dna, "ctaStrategy"), 0.85),
  };
}

function inferConversionFlow(
  strategy: AiBrandStrategy,
): { value: AiConversionFlow; confidence: number } {
  return {
    value: CONVERSION_JOURNEY_TO_FLOW[strategy.conversionJourney.value],
    confidence: blend(strategyConf(strategy, "conversionJourney"), 0.85),
  };
}

function inferTrustBuildingFlow(
  dna: AiBusinessDNA,
  strategy: AiBrandStrategy,
): { value: AiTrustBuildingFlow; confidence: number } {
  if (
    strategy.emotionalJourney.value === "skepticism_to_trust" ||
    strategy.emotionalJourney.value === "anxiety_to_reassurance"
  ) {
    return {
      value: "credentials_first",
      confidence: blend(strategyConf(strategy, "emotionalJourney"), 0.8),
    };
  }

  if (strategy.storytellingStrategy.value === "founder_origin") {
    return {
      value: "story_then_proof",
      confidence: blend(strategyConf(strategy, "storytellingStrategy"), 0.75),
    };
  }

  return {
    value: TRUST_TO_BUILDING_FLOW[dna.trustStrategy.value],
    confidence: blend(
      dnaConf(dna, "trustStrategy"),
      strategyConf(strategy, "trustStrategy"),
      0.85,
    ),
  };
}

function inferSeoPriorities(
  purpose: AiWebsitePurpose,
  purposeConfidence: number,
  profile: AiBusinessProfile,
): { value: AiSeoPriority[]; confidence: number } {
  const base = [...PURPOSE_TO_SEO[purpose]];
  if (profile.country || profile.region) {
    if (!base.includes("local_presence")) base.unshift("local_presence");
    if (!base.includes("location_modifiers")) base.push("location_modifiers");
  }
  return {
    value: uniquePriorities(base),
    confidence: blend(
      purposeConfidence,
      profileConf(profile, "seoKeywords") || 0.45,
      0.7,
    ),
  };
}

function uniquePriorities<T>(items: T[]): T[] {
  const out: T[] = [];
  for (const item of items) {
    if (!out.includes(item)) out.push(item);
  }
  return out;
}

function inferContentPriorities(
  purpose: AiWebsitePurpose,
  purposeConfidence: number,
  strategy: AiBrandStrategy,
): { value: AiContentPriority[]; confidence: number } {
  const base = [...PURPOSE_TO_CONTENT[purpose]];
  if (strategy.sectionEmphasis.value === "story_forward") {
    if (!base.includes("brand_story")) base.unshift("brand_story");
  }
  if (strategy.sectionEmphasis.value === "proof_forward") {
    if (!base.includes("proof_and_trust")) base.unshift("proof_and_trust");
  }
  return {
    value: uniquePriorities(base).slice(0, 5),
    confidence: blend(
      purposeConfidence,
      strategyConf(strategy, "sectionEmphasis"),
      0.75,
    ),
  };
}

function inferInternalLinking(
  purpose: AiWebsitePurpose,
  purposeConfidence: number,
): { value: AiInternalLinkingStrategy; confidence: number } {
  return {
    value: PURPOSE_TO_LINKING[purpose],
    confidence: blend(purposeConfidence, 0.75),
  };
}

function inferFooterStrategy(
  purpose: AiWebsitePurpose,
  purposeConfidence: number,
  dna: AiBusinessDNA,
): { value: AiFooterStrategy; confidence: number } {
  if (dna.contentDensity.value === "sparse") {
    return {
      value: "minimal_legal",
      confidence: blend(dnaConf(dna, "contentDensity"), 0.7),
    };
  }
  if (dna.contentDensity.value === "dense") {
    return {
      value: "sitemap_dense",
      confidence: blend(dnaConf(dna, "contentDensity"), 0.7),
    };
  }
  return {
    value: PURPOSE_TO_FOOTER_STRATEGY[purpose],
    confidence: blend(purposeConfidence, 0.7),
  };
}

/**
 * Derive Website Plan from BI + DNA + Brand Strategy.
 * Pure / synchronous / deterministic.
 */
export function inferWebsitePlan(input: AiWebsitePlanInput): AiWebsitePlan {
  const { profile, dna, strategy } = input;

  const websitePurpose = inferWebsitePurpose(profile, dna, strategy);
  const userJourney = inferUserJourney(strategy);
  const requiredPages = inferRequiredPages(profile, dna, strategy);
  const pageOrder = inferPageOrder(requiredPages.value, strategy);
  const navigationStructure = inferNavigation(
    websitePurpose.value,
    websitePurpose.confidence,
    pageOrder.value,
    dna,
  );
  const sectionPriority = inferSectionPriority(strategy, dna);
  const ctaFlow = inferCtaFlow(dna);
  const conversionFlow = inferConversionFlow(strategy);
  const trustBuildingFlow = inferTrustBuildingFlow(dna, strategy);
  const seoPriorities = inferSeoPriorities(
    websitePurpose.value,
    websitePurpose.confidence,
    profile,
  );
  const contentPriorities = inferContentPriorities(
    websitePurpose.value,
    websitePurpose.confidence,
    strategy,
  );
  const internalLinkingStrategy = inferInternalLinking(
    websitePurpose.value,
    websitePurpose.confidence,
  );
  const footerStrategy = inferFooterStrategy(
    websitePurpose.value,
    websitePurpose.confidence,
    dna,
  );

  return {
    websitePurpose: field(websitePurpose.value, websitePurpose.confidence),
    userJourney: field(userJourney.value, userJourney.confidence),
    requiredPages: field(requiredPages.value, requiredPages.confidence),
    pageOrder: field(pageOrder.value, pageOrder.confidence),
    navigationStructure: field(
      navigationStructure.value,
      navigationStructure.confidence,
    ),
    sectionPriority: field(sectionPriority.value, sectionPriority.confidence),
    ctaFlow: field(ctaFlow.value, ctaFlow.confidence),
    conversionFlow: field(conversionFlow.value, conversionFlow.confidence),
    trustBuildingFlow: field(
      trustBuildingFlow.value,
      trustBuildingFlow.confidence,
    ),
    seoPriorities: field(seoPriorities.value, seoPriorities.confidence),
    contentPriorities: field(
      contentPriorities.value,
      contentPriorities.confidence,
    ),
    internalLinkingStrategy: field(
      internalLinkingStrategy.value,
      internalLinkingStrategy.confidence,
    ),
    footerStrategy: field(footerStrategy.value, footerStrategy.confidence),
  };
}

/** Convenience: full triple input. */
export function inferWebsitePlanFromInputs(
  profile: AiBusinessProfile,
  dna: AiBusinessDNA,
  strategy: AiBrandStrategy,
): AiWebsitePlan {
  return inferWebsitePlan({ profile, dna, strategy });
}

export function createEmptyWebsitePlan(): AiWebsitePlan {
  const d = EMPTY_WEBSITE_PLAN_DEFAULTS;
  return {
    websitePurpose: field(d.websitePurpose, 0),
    userJourney: field(d.userJourney, 0),
    requiredPages: field([...d.requiredPages], 0),
    pageOrder: field([...d.pageOrder], 0),
    navigationStructure: field(
      {
        pattern: d.navigationPattern,
        primaryPages: [...d.requiredPages],
        secondaryPages: [],
        ctaPage: d.ctaPage,
      },
      0,
    ),
    sectionPriority: field([...d.sectionPriority], 0),
    ctaFlow: field(d.ctaFlow, 0),
    conversionFlow: field(d.conversionFlow, 0),
    trustBuildingFlow: field(d.trustBuildingFlow, 0),
    seoPriorities: field([...d.seoPriorities], 0),
    contentPriorities: field([...d.contentPriorities], 0),
    internalLinkingStrategy: field(d.internalLinkingStrategy, 0),
    footerStrategy: field(d.footerStrategy, 0),
  };
}
