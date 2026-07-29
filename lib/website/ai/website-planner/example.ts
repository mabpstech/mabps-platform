/**
 * Example Website Planner output for the jewellery / Kerala weddings BusinessPlan.
 * Illustrative only — not used at runtime.
 */

import type { BusinessPlan } from "@/lib/website/ai/business-planner/types";
import { EXAMPLE_BUSINESS_PLAN } from "@/lib/website/ai/business-planner/example";
import type { WebsitePlan } from "@/lib/website/ai/website-planner/types";

export const EXAMPLE_WEBSITE_PLANNER_BUSINESS_PLAN: BusinessPlan =
  EXAMPLE_BUSINESS_PLAN;

export const EXAMPLE_WEBSITE_PLAN: WebsitePlan = {
  navigation: [
    "Home",
    "Collections",
    "Custom Orders",
    "About",
    "Testimonials",
    "FAQ",
    "Contact",
  ],
  pages: [
    {
      id: "home",
      sections: [
        "Hero",
        "Featured",
        "Collections",
        "Benefits",
        "Testimonials",
        "CTA",
      ],
    },
    {
      id: "collections",
      sections: ["Hero", "Gallery", "Filters", "CTA"],
    },
    {
      id: "custom-orders",
      sections: ["Hero", "Process", "Form", "CTA"],
    },
    {
      id: "about",
      sections: ["Hero", "Story", "Trust"],
    },
    {
      id: "testimonials",
      sections: ["Hero", "Testimonials"],
    },
    {
      id: "faq",
      sections: ["Hero", "FAQ"],
    },
    {
      id: "contact",
      sections: ["Hero", "Form", "Details"],
    },
  ],
  footerLinks: ["Home", "Collections", "Custom Orders", "Contact", "Privacy"],
  contentRequirements: [
    "business name",
    "collection categories",
    "product imagery",
    "custom order enquiry form",
    "testimonials",
    "FAQ items",
    "showroom contact details",
  ],
};
