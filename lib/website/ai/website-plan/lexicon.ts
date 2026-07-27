/**
 * Deterministic Website Planning maps (Sprint C5).
 * BI + DNA + Brand Strategy → architecture signals. No LLM / network / copy.
 */

import type {
  AiBusinessType,
  AiContentPriority,
  AiConversionFlow,
  AiConversionJourney,
  AiCtaFlow,
  AiCtaStrategy,
  AiFooterStrategy,
  AiInternalLinkingStrategy,
  AiNavPattern,
  AiPlanSectionRole,
  AiSectionEmphasis,
  AiSeoPriority,
  AiTrustBuildingFlow,
  AiTrustStrategy,
  AiUserJourney,
  AiWebsitePurpose,
} from "@/lib/website/ai/types";
import type { PageType } from "@/lib/website/types";

/** Baseline plan when inputs are sparse / empty. */
export type WebsitePlanDefaults = {
  websitePurpose: AiWebsitePurpose;
  userJourney: AiUserJourney;
  requiredPages: PageType[];
  pageOrder: PageType[];
  navigationPattern: AiNavPattern;
  ctaPage: PageType;
  sectionPriority: AiPlanSectionRole[];
  ctaFlow: AiCtaFlow;
  conversionFlow: AiConversionFlow;
  trustBuildingFlow: AiTrustBuildingFlow;
  seoPriorities: AiSeoPriority[];
  contentPriorities: AiContentPriority[];
  internalLinkingStrategy: AiInternalLinkingStrategy;
  footerStrategy: AiFooterStrategy;
};

export const EMPTY_WEBSITE_PLAN_DEFAULTS: WebsitePlanDefaults = {
  websitePurpose: "generate_leads",
  userJourney: "land_explore_act",
  requiredPages: ["home", "about", "contact"],
  pageOrder: ["home", "about", "contact"],
  navigationPattern: "minimal_core",
  ctaPage: "contact",
  sectionPriority: [
    "hero",
    "value_proposition",
    "proof",
    "offer",
    "contact",
    "cta",
  ],
  ctaFlow: "hero_mid_footer",
  conversionFlow: "home_to_contact",
  trustBuildingFlow: "proof_early",
  seoPriorities: ["brand_name", "category_authority", "conversion_landing"],
  contentPriorities: ["offer_clarity", "proof_and_trust", "practical_details"],
  internalLinkingStrategy: "hub_spoke_home",
  footerStrategy: "nav_mirror",
};

export const BUSINESS_TYPE_TO_PURPOSE: Record<
  AiBusinessType,
  AiWebsitePurpose
> = {
  local_business: "generate_leads",
  online_store: "drive_sales",
  service_provider: "generate_leads",
  restaurant: "book_appointments",
  professional_practice: "book_appointments",
  creator: "showcase_brand",
  nonprofit: "nurture_community",
  saas: "generate_leads",
  other: "generate_leads",
};

export const CTA_TO_PURPOSE: Partial<Record<AiCtaStrategy, AiWebsitePurpose>> =
  {
    shop_first: "drive_sales",
    book_first: "book_appointments",
    contact_first: "generate_leads",
  };

export const CONVERSION_JOURNEY_TO_USER_JOURNEY: Record<
  AiConversionJourney,
  AiUserJourney
> = {
  awareness_consider_act: "land_explore_act",
  browse_compare_buy: "land_browse_buy",
  learn_trust_contact: "land_learn_trust_contact",
  inspire_desire_book: "land_inspire_book",
  diagnose_advise_convert: "land_diagnose_convert",
  sample_engage_subscribe: "land_sample_subscribe",
  explore_shortlist_enquire: "land_compare_enquire",
  hook_nurture_close: "land_story_belong",
};

export const CTA_TO_FLOW: Record<AiCtaStrategy, AiCtaFlow> = {
  single_primary: "single_primary_everywhere",
  dual_primary_secondary: "hero_mid_footer",
  soft_secondary: "soft_then_hard",
  contact_first: "offer_then_contact",
  shop_first: "shop_path",
  book_first: "book_path",
  multi_path: "multi_path_by_intent",
};

export const CONVERSION_JOURNEY_TO_FLOW: Record<
  AiConversionJourney,
  AiConversionFlow
> = {
  awareness_consider_act: "home_to_offer_to_contact",
  browse_compare_buy: "home_to_catalog_to_purchase",
  learn_trust_contact: "home_to_about_to_contact",
  inspire_desire_book: "home_to_book",
  diagnose_advise_convert: "home_to_offer_to_contact",
  sample_engage_subscribe: "multi_touch_nurture",
  explore_shortlist_enquire: "home_to_offer_to_contact",
  hook_nurture_close: "multi_touch_nurture",
};

export const TRUST_TO_BUILDING_FLOW: Record<
  AiTrustStrategy,
  AiTrustBuildingFlow
> = {
  social_proof: "proof_early",
  credentials: "credentials_first",
  transparency: "transparency_then_offer",
  guarantees: "guarantees_near_cta",
  expertise: "credentials_first",
  community: "community_voices",
  heritage: "heritage_then_craft",
  results: "results_montage",
};

export const SECTION_EMPHASIS_TO_ROLES: Record<
  AiSectionEmphasis,
  AiPlanSectionRole[]
> = {
  hero_dominant: [
    "hero",
    "value_proposition",
    "offer",
    "proof",
    "cta",
    "contact",
  ],
  proof_forward: [
    "hero",
    "proof",
    "trust",
    "value_proposition",
    "offer",
    "cta",
    "contact",
  ],
  offer_forward: [
    "hero",
    "offer",
    "value_proposition",
    "proof",
    "cta",
    "contact",
  ],
  story_forward: [
    "hero",
    "story",
    "value_proposition",
    "proof",
    "offer",
    "cta",
    "contact",
  ],
  catalog_forward: [
    "hero",
    "catalog",
    "offer",
    "proof",
    "value_proposition",
    "cta",
    "contact",
  ],
  trust_forward: [
    "hero",
    "trust",
    "proof",
    "value_proposition",
    "offer",
    "faq",
    "cta",
    "contact",
  ],
  contact_forward: [
    "hero",
    "value_proposition",
    "contact",
    "proof",
    "offer",
    "cta",
  ],
  balanced_flow: [
    "hero",
    "value_proposition",
    "offer",
    "proof",
    "story",
    "cta",
    "contact",
  ],
};

export const PURPOSE_TO_NAV_PATTERN: Record<AiWebsitePurpose, AiNavPattern> = {
  generate_leads: "offer_forward",
  drive_sales: "catalog_forward",
  book_appointments: "offer_forward",
  build_authority: "authority_forward",
  showcase_brand: "story_forward",
  inform_educate: "authority_forward",
  nurture_community: "story_forward",
  support_customers: "utility_dense",
};

export const PURPOSE_TO_SEO: Record<AiWebsitePurpose, AiSeoPriority[]> = {
  generate_leads: [
    "service_keywords",
    "local_presence",
    "conversion_landing",
    "brand_name",
  ],
  drive_sales: [
    "product_keywords",
    "category_authority",
    "conversion_landing",
    "brand_name",
  ],
  book_appointments: [
    "local_presence",
    "service_keywords",
    "location_modifiers",
    "conversion_landing",
  ],
  build_authority: [
    "informational_content",
    "category_authority",
    "brand_name",
    "service_keywords",
  ],
  showcase_brand: [
    "brand_name",
    "category_authority",
    "informational_content",
  ],
  inform_educate: [
    "informational_content",
    "category_authority",
    "brand_name",
  ],
  nurture_community: [
    "brand_name",
    "local_presence",
    "informational_content",
  ],
  support_customers: [
    "brand_name",
    "service_keywords",
    "informational_content",
  ],
};

export const PURPOSE_TO_CONTENT: Record<AiWebsitePurpose, AiContentPriority[]> =
  {
    generate_leads: [
      "offer_clarity",
      "proof_and_trust",
      "faq_objections",
      "practical_details",
    ],
    drive_sales: [
      "offer_clarity",
      "visual_showcase",
      "proof_and_trust",
      "practical_details",
    ],
    book_appointments: [
      "offer_clarity",
      "practical_details",
      "proof_and_trust",
      "faq_objections",
    ],
    build_authority: [
      "educational_depth",
      "proof_and_trust",
      "brand_story",
      "faq_objections",
    ],
    showcase_brand: [
      "visual_showcase",
      "brand_story",
      "offer_clarity",
      "community_social",
    ],
    inform_educate: [
      "educational_depth",
      "faq_objections",
      "practical_details",
      "proof_and_trust",
    ],
    nurture_community: [
      "community_social",
      "brand_story",
      "visual_showcase",
      "offer_clarity",
    ],
    support_customers: [
      "practical_details",
      "faq_objections",
      "educational_depth",
      "offer_clarity",
    ],
  };

export const PURPOSE_TO_LINKING: Record<
  AiWebsitePurpose,
  AiInternalLinkingStrategy
> = {
  generate_leads: "proof_to_contact",
  drive_sales: "catalog_cross_sell",
  book_appointments: "linear_funnel",
  build_authority: "blog_to_service",
  showcase_brand: "about_to_offer",
  inform_educate: "blog_to_service",
  nurture_community: "reciprocal_core_pages",
  support_customers: "hub_spoke_home",
};

export const PURPOSE_TO_FOOTER_STRATEGY: Record<
  AiWebsitePurpose,
  AiFooterStrategy
> = {
  generate_leads: "contact_heavy",
  drive_sales: "multi_column_utility",
  book_appointments: "trust_and_contact",
  build_authority: "sitemap_dense",
  showcase_brand: "brand_story_brief",
  inform_educate: "sitemap_dense",
  nurture_community: "brand_story_brief",
  support_customers: "nav_mirror",
};

export const CTA_TO_CTA_PAGE: Partial<Record<AiCtaStrategy, PageType>> = {
  shop_first: "products",
  book_first: "contact",
  contact_first: "contact",
};

/** Preferred page order hints by conversion journey. */
export const CONVERSION_TO_PAGE_BIAS: Partial<
  Record<AiConversionJourney, PageType[]>
> = {
  browse_compare_buy: ["home", "products", "collections", "about", "contact"],
  learn_trust_contact: ["home", "about", "blog", "contact"],
  inspire_desire_book: ["home", "products", "about", "contact"],
  diagnose_advise_convert: ["home", "about", "blog", "contact"],
  sample_engage_subscribe: ["home", "blog", "about", "contact"],
  explore_shortlist_enquire: ["home", "products", "about", "contact"],
};
