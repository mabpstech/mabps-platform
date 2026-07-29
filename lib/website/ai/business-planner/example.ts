/**
 * Example Business Planner output for the jewellery / Kerala weddings prompt.
 * Illustrative only — not used at runtime.
 */

import type { BusinessPlan } from "@/lib/website/ai/business-planner/types";

/** Example prompt: "Create a premium jewellery website for Kerala weddings." */
export const EXAMPLE_BUSINESS_PLANNER_PROMPT =
  "Create a premium jewellery website for Kerala weddings.";

export const EXAMPLE_BUSINESS_PLAN: BusinessPlan = {
  businessType: "retail",
  industry: "wedding jewellery",
  targetAudience: "Kerala couples and families shopping for bridal jewellery",
  goals: [
    "showcase bridal collections",
    "build trust for high-consideration purchases",
    "generate showroom enquiries",
  ],
  tone: "luxury",
  style: "elegant",
  services: [
    "bridal jewellery",
    "custom designs",
    "gold and diamond sets",
    "in-store consultation",
  ],
  pages: ["home", "collections", "about", "contact"],
  requiredSections: [
    { role: "hero", page: "home" },
    { role: "collections", page: "home" },
    { role: "gallery", page: "home" },
    { role: "features", page: "home" },
    { role: "cta", page: "home" },
    { role: "products", page: "collections" },
    { role: "richText", page: "about" },
    { role: "form", page: "contact" },
  ],
};
