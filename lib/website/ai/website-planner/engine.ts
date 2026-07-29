/**
 * Deterministic Website Planner fallback (AI Pipeline Phase 2).
 * Maps BusinessPlan signals into industry-aware website structure — no LLM, no copy.
 */

import type { BusinessPlan } from "@/lib/website/ai/business-planner/types";
import type {
  WebsitePagePlan,
  WebsitePlan,
} from "@/lib/website/ai/website-planner/types";

type IndustryTemplateId =
  | "jewellery"
  | "restaurant"
  | "hospital"
  | "meditation"
  | "retail"
  | "services"
  | "professional"
  | "default";

type IndustryTemplate = {
  id: IndustryTemplateId;
  /** When true, prefer this structure over generic BusinessPlan.pages. */
  specialized: boolean;
  navigation: string[];
  pages: WebsitePagePlan[];
  footerLinks: string[];
  contentRequirements: string[];
};

const DEFAULT_FOOTER = ["Home", "About", "Contact", "Privacy"];

const JEWELLERY_TEMPLATE: IndustryTemplate = {
  id: "jewellery",
  specialized: true,
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
      sections: ["Hero", "Featured", "Collections", "Benefits", "Testimonials", "CTA"],
    },
    { id: "collections", sections: ["Hero", "Gallery", "Filters", "CTA"] },
    { id: "custom-orders", sections: ["Hero", "Process", "Form", "CTA"] },
    { id: "about", sections: ["Hero", "Story", "Trust"] },
    { id: "testimonials", sections: ["Hero", "Testimonials"] },
    { id: "faq", sections: ["Hero", "FAQ"] },
    { id: "contact", sections: ["Hero", "Form", "Details"] },
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

const RESTAURANT_TEMPLATE: IndustryTemplate = {
  id: "restaurant",
  specialized: true,
  navigation: [
    "Home",
    "Menu",
    "Gallery",
    "Reservations",
    "Reviews",
    "Contact",
  ],
  pages: [
    {
      id: "home",
      sections: ["Hero", "Featured", "Menu Preview", "Gallery", "Reviews", "CTA"],
    },
    { id: "menu", sections: ["Hero", "Menu", "Dietary", "CTA"] },
    { id: "gallery", sections: ["Hero", "Gallery"] },
    { id: "reservations", sections: ["Hero", "Form", "Hours", "CTA"] },
    { id: "reviews", sections: ["Hero", "Testimonials"] },
    { id: "contact", sections: ["Hero", "Form", "Location", "Hours"] },
  ],
  footerLinks: ["Home", "Menu", "Reservations", "Contact", "Privacy"],
  contentRequirements: [
    "restaurant name",
    "menu categories",
    "dish imagery",
    "reservation form",
    "opening hours",
    "location / map",
    "reviews",
  ],
};

const HOSPITAL_TEMPLATE: IndustryTemplate = {
  id: "hospital",
  specialized: true,
  navigation: [
    "Home",
    "Doctors",
    "Departments",
    "Appointments",
    "Insurance",
    "FAQ",
    "Contact",
  ],
  pages: [
    {
      id: "home",
      sections: ["Hero", "Departments", "Doctors", "Trust", "CTA"],
    },
    { id: "doctors", sections: ["Hero", "Directory", "Profiles", "CTA"] },
    { id: "departments", sections: ["Hero", "Services", "Details"] },
    { id: "appointments", sections: ["Hero", "Form", "Hours", "CTA"] },
    { id: "insurance", sections: ["Hero", "Partners", "FAQ"] },
    { id: "faq", sections: ["Hero", "FAQ"] },
    { id: "contact", sections: ["Hero", "Form", "Location", "Emergency"] },
  ],
  footerLinks: [
    "Home",
    "Doctors",
    "Appointments",
    "Insurance",
    "Contact",
    "Privacy",
  ],
  contentRequirements: [
    "facility name",
    "doctor directory",
    "department list",
    "appointment form",
    "insurance partners",
    "FAQ items",
    "emergency contact",
    "location / hours",
  ],
};

const MEDITATION_TEMPLATE: IndustryTemplate = {
  id: "meditation",
  specialized: true,
  navigation: [
    "Home",
    "Programs",
    "Meditation",
    "Events",
    "About",
    "FAQ",
    "Contact",
  ],
  pages: [
    {
      id: "home",
      sections: ["Hero", "Programs", "Benefits", "Events", "Testimonials", "CTA"],
    },
    { id: "programs", sections: ["Hero", "Programs", "Details", "CTA"] },
    { id: "meditation", sections: ["Hero", "Practices", "Schedule", "CTA"] },
    { id: "events", sections: ["Hero", "Events", "Calendar", "CTA"] },
    { id: "about", sections: ["Hero", "Story", "Teachers", "Trust"] },
    { id: "faq", sections: ["Hero", "FAQ"] },
    { id: "contact", sections: ["Hero", "Form", "Location"] },
  ],
  footerLinks: ["Home", "Programs", "Events", "About", "Contact", "Privacy"],
  contentRequirements: [
    "centre name",
    "program list",
    "meditation schedule",
    "upcoming events",
    "teacher profiles",
    "FAQ items",
    "contact / location",
  ],
};

const RETAIL_TEMPLATE: IndustryTemplate = {
  id: "retail",
  specialized: false,
  navigation: ["Home", "Products", "Collections", "About", "FAQ", "Contact"],
  pages: [
    {
      id: "home",
      sections: ["Hero", "Featured", "Collections", "Benefits", "Testimonials", "CTA"],
    },
    { id: "products", sections: ["Hero", "Products", "Filters", "CTA"] },
    { id: "collections", sections: ["Hero", "Gallery", "CTA"] },
    { id: "about", sections: ["Hero", "Story", "Trust"] },
    { id: "faq", sections: ["Hero", "FAQ"] },
    { id: "contact", sections: ["Hero", "Form", "Details"] },
  ],
  footerLinks: ["Home", "Products", "About", "Contact", "Privacy"],
  contentRequirements: [
    "business name",
    "product catalog",
    "collection imagery",
    "shipping / returns info",
    "FAQ items",
    "contact details",
  ],
};

const SERVICES_TEMPLATE: IndustryTemplate = {
  id: "services",
  specialized: false,
  navigation: ["Home", "Services", "About", "Testimonials", "FAQ", "Contact"],
  pages: [
    {
      id: "home",
      sections: ["Hero", "Services", "Benefits", "Process", "Testimonials", "CTA"],
    },
    { id: "services", sections: ["Hero", "Services", "Packages", "CTA"] },
    { id: "about", sections: ["Hero", "Story", "Trust"] },
    { id: "testimonials", sections: ["Hero", "Testimonials"] },
    { id: "faq", sections: ["Hero", "FAQ"] },
    { id: "contact", sections: ["Hero", "Form", "Details"] },
  ],
  footerLinks: ["Home", "Services", "About", "Contact", "Privacy"],
  contentRequirements: [
    "business name",
    "service list",
    "process overview",
    "testimonials",
    "FAQ items",
    "quote / contact form",
  ],
};

const PROFESSIONAL_TEMPLATE: IndustryTemplate = {
  id: "professional",
  specialized: false,
  navigation: ["Home", "Services", "About", "FAQ", "Contact"],
  pages: [
    {
      id: "home",
      sections: ["Hero", "Services", "Trust", "Testimonials", "CTA"],
    },
    { id: "services", sections: ["Hero", "Services", "Details", "CTA"] },
    { id: "about", sections: ["Hero", "Story", "Credentials", "Trust"] },
    { id: "faq", sections: ["Hero", "FAQ"] },
    { id: "contact", sections: ["Hero", "Form", "Details"] },
  ],
  footerLinks: ["Home", "Services", "About", "Contact", "Privacy"],
  contentRequirements: [
    "practice name",
    "service list",
    "credentials",
    "appointment / contact form",
    "FAQ items",
    "location / hours",
  ],
};

const DEFAULT_TEMPLATE: IndustryTemplate = {
  id: "default",
  specialized: false,
  navigation: ["Home", "About", "Services", "FAQ", "Contact"],
  pages: [
    {
      id: "home",
      sections: ["Hero", "Featured", "Benefits", "Testimonials", "CTA"],
    },
    { id: "about", sections: ["Hero", "Story", "Trust"] },
    { id: "services", sections: ["Hero", "Services", "CTA"] },
    { id: "faq", sections: ["Hero", "FAQ"] },
    { id: "contact", sections: ["Hero", "Form", "Details"] },
  ],
  footerLinks: [...DEFAULT_FOOTER],
  contentRequirements: [
    "business name",
    "about summary",
    "service list",
    "contact details",
    "FAQ items",
  ],
};

function haystack(plan: BusinessPlan, prompt = ""): string {
  return [
    plan.businessType,
    plan.industry,
    plan.targetAudience,
    plan.tone,
    plan.style,
    ...plan.goals,
    ...plan.services,
    ...plan.pages,
    prompt,
  ]
    .join(" ")
    .toLowerCase();
}

function pickIndustryTemplate(plan: BusinessPlan, prompt = ""): IndustryTemplate {
  const text = haystack(plan, prompt);

  if (
    /jewell?ery|jeweller|bridal|gold|diamond|wedding.*ring/i.test(text)
  ) {
    return JEWELLERY_TEMPLATE;
  }
  if (
    /restaurant|cafe|café|bistro|dining|menu|bakery|bar\b|food/i.test(text)
  ) {
    return RESTAURANT_TEMPLATE;
  }
  if (
    /hospital|clinic|doctor|medical|healthcare|dental|dentist|patient|veterinary|pet clinic|vet\b/i.test(
      text,
    )
  ) {
    return HOSPITAL_TEMPLATE;
  }
  if (
    /meditation|mindful|yoga|retreat|wellness.?centre|wellness.?center|ashram/i.test(
      text,
    )
  ) {
    return MEDITATION_TEMPLATE;
  }
  if (/hotel|resort|hospitality|travel agency|tour operator/i.test(text)) {
    return SERVICES_TEMPLATE;
  }
  if (
    /school|coaching|education|construction|event management|digital agency|interior design|photography|gym|fitness|salon/i.test(
      text,
    )
  ) {
    return SERVICES_TEMPLATE;
  }
  if (
    plan.businessType === "restaurant" ||
    plan.businessType === "online_store" ||
    /retail|shop|store|ecommerce|e-commerce|product|fashion|furniture|electronics|home decor|dealership/i.test(
      text,
    )
  ) {
    if (
      plan.businessType === "restaurant" ||
      /restaurant|cafe|café|dining/i.test(text)
    ) {
      return RESTAURANT_TEMPLATE;
    }
    return RETAIL_TEMPLATE;
  }
  if (
    plan.businessType === "professional_practice" ||
    /lawyer|attorney|accountant|accounting|consultant|clinic|practice|real estate/i.test(
      text,
    )
  ) {
    return PROFESSIONAL_TEMPLATE;
  }
  if (
    plan.businessType === "service_provider" ||
    /service|repair|cleaning|agency|studio/i.test(text)
  ) {
    return SERVICES_TEMPLATE;
  }

  return DEFAULT_TEMPLATE;
}

function titleCaseLabel(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function sectionLabel(role: string): string {
  const map: Record<string, string> = {
    hero: "Hero",
    features: "Features",
    featured: "Featured",
    benefits: "Benefits",
    cta: "CTA",
    form: "Form",
    gallery: "Gallery",
    products: "Products",
    collections: "Collections",
    testimonials: "Testimonials",
    richtext: "Story",
    "rich-text": "Story",
    bloglist: "Blog List",
    "blog-list": "Blog List",
    faq: "FAQ",
    menu: "Menu",
    services: "Services",
  };
  const key = role.trim().toLowerCase();
  return map[key] || titleCaseLabel(role);
}

/**
 * Prefer specialized industry templates (jewellery/restaurant/hospital/…).
 * For generic templates, merge BusinessPlan.pages into a coherent structure.
 */
function mergeWithBusinessPages(
  template: IndustryTemplate,
  plan: BusinessPlan,
): WebsitePlan {
  const businessPages = plan.pages
    .map((page) => page.trim().toLowerCase().replace(/\s+/g, "-"))
    .filter(Boolean);

  // Specialized industry structures beat generic BI page lists (e.g. "products"
  // from restaurant defaults should become Menu / Reservations / Gallery).
  if (template.specialized || !businessPages.length) {
    return cloneTemplate(template);
  }

  const templateIds = new Set(template.pages.map((page) => page.id));
  const overlap = businessPages.filter((id) => templateIds.has(id)).length;
  if (overlap >= Math.min(3, businessPages.length)) {
    return cloneTemplate(template);
  }

  // Otherwise build pages from BusinessPlan.pages + requiredSections.
  const sectionsByPage = new Map<string, string[]>();
  for (const section of plan.requiredSections) {
    const pageId = (section.page || "home").trim().toLowerCase();
    const list = sectionsByPage.get(pageId) || [];
    const label = sectionLabel(section.role);
    if (!list.includes(label)) list.push(label);
    sectionsByPage.set(pageId, list);
  }

  const pages: WebsitePagePlan[] = [];
  const ids = businessPages.includes("home")
    ? businessPages
    : ["home", ...businessPages];

  for (const id of uniqueIds(ids)) {
    const fromPlan = sectionsByPage.get(id) || [];
    const fromTemplate = template.pages.find((page) => page.id === id)?.sections;
    const sections =
      fromPlan.length > 0
        ? fromPlan
        : fromTemplate && fromTemplate.length
          ? [...fromTemplate]
          : id === "home"
            ? ["Hero", "Featured", "Benefits", "CTA"]
            : id === "contact"
              ? ["Hero", "Form", "Details"]
              : ["Hero", "Content"];
    pages.push({ id, sections });
  }

  const navigation = pages.map((page) => titleCaseLabel(page.id));
  const footerLinks = uniqueLabels([
    ...pages.slice(0, 4).map((page) => titleCaseLabel(page.id)),
    "Privacy",
  ]);

  const contentRequirements = uniqueLabels([
    ...template.contentRequirements.slice(0, 3),
    "business name",
    "contact details",
    ...plan.services.slice(0, 3).map((service) => `${service} details`),
  ]).slice(0, 12);

  return {
    navigation,
    pages,
    footerLinks,
    contentRequirements,
  };
}

function uniqueIds(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function uniqueLabels(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value.trim());
  }
  return out;
}

function cloneTemplate(template: IndustryTemplate): WebsitePlan {
  return {
    navigation: [...template.navigation],
    pages: template.pages.map((page) => ({
      id: page.id,
      sections: [...page.sections],
    })),
    footerLinks: [...template.footerLinks],
    contentRequirements: [...template.contentRequirements],
  };
}

/**
 * Deterministic planner: BusinessPlan → WebsitePlan.
 * Pure / sync — safe for unit tests and LLM fallback.
 */
export function inferWebsitePlanFromBusinessPlan(
  businessPlan: BusinessPlan,
  prompt = "",
): WebsitePlan {
  const template = pickIndustryTemplate(businessPlan, prompt);
  return mergeWithBusinessPages(template, businessPlan);
}

/** Alias used by resolve/fallback paths. */
export function inferWebsiteStructurePlan(
  businessPlan: BusinessPlan,
  prompt = "",
): WebsitePlan {
  return inferWebsitePlanFromBusinessPlan(businessPlan, prompt);
}
