/**
 * Deterministic Website Composer maps (Sprint C6).
 * Plan + DNA + Brand Strategy → section composition. No LLM / network / copy.
 */

import type {
  AiColourDirection,
  AiColourPsychology,
  AiContentDensity,
  AiCtaFlow,
  AiHeroStrategy,
  AiPlanSectionRole,
  AiTrustBuildingFlow,
  AiVisualIdentity,
  AiWebsitePurpose,
} from "@/lib/website/ai/types";
import type { PageType, SectionSettings, SectionType } from "@/lib/website/types";
import type { SiteTemplateId } from "@/lib/website/templates";

/** Structural page titles — not marketing copy. */
export const PAGE_TYPE_META: Record<
  PageType,
  { title: string; slug: string }
> = {
  home: { title: "Home", slug: "home" },
  about: { title: "About", slug: "about" },
  contact: { title: "Contact", slug: "contact" },
  products: { title: "Products", slug: "products" },
  collections: { title: "Collections", slug: "collections" },
  blog: { title: "Blog", slug: "blog" },
  custom: { title: "Page", slug: "page" },
};

/** Primary SectionType for each plan role. Variants refine content/settings later. */
export const ROLE_TO_SECTION_TYPE: Record<AiPlanSectionRole, SectionType> = {
  hero: "hero",
  value_proposition: "features",
  offer: "features",
  proof: "features",
  story: "richText",
  catalog: "products",
  trust: "features",
  faq: "richText",
  contact: "form",
  cta: "cta",
};

/** Max home roles kept by content density (hero always retained). */
export const DENSITY_HOME_ROLE_CAP: Record<AiContentDensity, number> = {
  sparse: 4,
  balanced: 6,
  rich: 8,
  dense: 10,
};

/** Section vertical padding from density (spacing strategy). */
export const DENSITY_TO_PADDING: Record<
  AiContentDensity,
  NonNullable<SectionSettings["paddingY"]>
> = {
  sparse: "xl",
  balanced: "lg",
  rich: "md",
  dense: "sm",
};

/** Spacer height between major blocks (visual rhythm). */
export const DENSITY_TO_SPACER: Record<
  AiContentDensity,
  "sm" | "md" | "lg" | null
> = {
  sparse: "lg",
  balanced: "md",
  rich: null,
  dense: null,
};

export type HeroLayoutVariant = {
  align: "left" | "center";
  height: "sm" | "md" | "lg" | "xl";
  overlay: number;
  animation: "none" | "fade" | "rise";
};

export const HERO_STRATEGY_TO_LAYOUT: Record<AiHeroStrategy, HeroLayoutVariant> =
  {
    product_focus: {
      align: "center",
      height: "lg",
      overlay: 35,
      animation: "fade",
    },
    lifestyle: {
      align: "center",
      height: "xl",
      overlay: 40,
      animation: "rise",
    },
    founder_story: {
      align: "left",
      height: "lg",
      overlay: 45,
      animation: "fade",
    },
    offer_led: {
      align: "center",
      height: "md",
      overlay: 30,
      animation: "fade",
    },
    atmosphere: {
      align: "center",
      height: "xl",
      overlay: 50,
      animation: "rise",
    },
    problem_solution: {
      align: "left",
      height: "md",
      overlay: 35,
      animation: "fade",
    },
    social_proof: {
      align: "center",
      height: "md",
      overlay: 40,
      animation: "fade",
    },
    minimal_statement: {
      align: "center",
      height: "sm",
      overlay: 20,
      animation: "none",
    },
  };

/** Colour psychology → known THEME_PRESETS id. */
export const COLOUR_PSYCHOLOGY_TO_PRESET: Record<AiColourPsychology, string> = {
  trust_blue: "modern-blue",
  energy_warm: "restaurant-earth",
  calm_nature: "nature-green",
  luxury_dark: "luxury-black",
  fresh_vibrant: "startup-neon",
  soft_pastel: "fashion-rose",
  grounded_earth: "restaurant-earth",
  clean_neutral: "minimal-white",
};

export const COLOUR_DIRECTION_TO_PRESET: Record<AiColourDirection, string> = {
  warm: "restaurant-earth",
  cool: "modern-blue",
  neutral: "corporate-gray",
  earth: "nature-green",
  vibrant: "startup-neon",
  monochrome: "minimal-white",
  pastel: "fashion-rose",
  dark_luxury: "luxury-black",
};

export const VISUAL_IDENTITY_TO_PRESET: Partial<
  Record<AiVisualIdentity, string>
> = {
  clean_minimal: "minimal-white",
  bold_graphic: "startup-neon",
  elegant_refined: "elegant-gold",
  warm_organic: "restaurant-earth",
  tech_sharp: "technology-dark",
  editorial_magazine: "creative-purple",
  playful_colorful: "fashion-rose",
  corporate_polished: "corporate-gray",
};

export const PURPOSE_TO_TEMPLATE: Record<AiWebsitePurpose, SiteTemplateId> = {
  generate_leads: "classic",
  drive_sales: "catalog",
  book_appointments: "classic",
  build_authority: "showcase",
  showcase_brand: "showcase",
  inform_educate: "showcase",
  nurture_community: "showcase",
  support_customers: "classic",
};

/**
 * Where a dedicated trust role should sit relative to other roles.
 * Index hints: 0 = right after hero, -1 = just before cta, -2 = before contact.
 */
export const TRUST_FLOW_INSERT: Record<
  AiTrustBuildingFlow,
  "after_hero" | "after_value" | "before_cta" | "before_contact" | "mid"
> = {
  proof_early: "after_hero",
  credentials_first: "after_hero",
  story_then_proof: "after_value",
  results_montage: "mid",
  community_voices: "mid",
  transparency_then_offer: "after_value",
  heritage_then_craft: "after_value",
  guarantees_near_cta: "before_cta",
};

/**
 * Whether a mid-page CTA section should appear (in addition to hero CTAs).
 */
export const CTA_FLOW_MID_SECTION: Record<AiCtaFlow, boolean> = {
  single_primary_everywhere: false,
  hero_mid_footer: true,
  soft_then_hard: true,
  offer_then_contact: true,
  shop_path: true,
  book_path: true,
  multi_path_by_intent: true,
};

/** Roles that imply an image / gallery placeholder when visuals matter. */
export const VISUAL_PLACEHOLDER_ROLES: AiPlanSectionRole[] = [
  "proof",
  "story",
  "catalog",
  "trust",
];

export function pageHref(pageType: PageType, slug: string): string {
  if (pageType === "home") return "/";
  return `/${slug}`;
}
