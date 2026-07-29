/**
 * Deterministic Business Planner fallback (AI Pipeline Phase 1).
 * Maps BI profile signals into a BusinessPlan — no LLM, no website generation.
 */

import type {
  BusinessPlan,
  SectionPlan,
} from "@/lib/website/ai/business-planner/types";
import { clampAiTextByKey } from "@/lib/website/ai/helpers";
import { inferBusinessProfile } from "@/lib/website/ai/intelligence/engine";
import type { AiBusinessProfile } from "@/lib/website/ai/types";

const DEFAULT_SECTIONS: SectionPlan[] = [
  { role: "hero", page: "home" },
  { role: "features", page: "home" },
  { role: "cta", page: "home" },
  { role: "form", page: "contact" },
];

function uniqueStrings(values: string[]): string[] {
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

function deriveGoals(profile: AiBusinessProfile): string[] {
  const goals: string[] = ["establish online presence"];
  if (profile.suggestedFeatures.some((f) => /shop|product|catalog/i.test(f))) {
    goals.push("showcase products");
  }
  if (profile.contactPreferences.includes("booking")) {
    goals.push("drive bookings");
  }
  if (
    profile.contactPreferences.includes("whatsapp") ||
    profile.contactPreferences.includes("form") ||
    profile.contactPreferences.includes("phone")
  ) {
    goals.push("generate enquiries");
  }
  if (profile.businessType === "online_store") {
    goals.push("enable purchases");
  }
  if (/wedding|bridal|luxury|premium/i.test(profile.industry || "")) {
    goals.push("build trust for high-consideration purchases");
  }
  return uniqueStrings(goals).slice(0, 6);
}

function deriveServices(profile: AiBusinessProfile, prompt: string): string[] {
  const fromFeatures = profile.suggestedFeatures
    .map((feature) => feature.trim())
    .filter(Boolean)
    .slice(0, 6);
  // Prefer industry-aware feature labels when they look like real offers.
  const metaFeature =
    /^(product catalog|collections|shipping info|returns policy|services list|credentials|appointment booking|faq|about|contact form|clear navigation|service packages|quote request|before\/after gallery|menu|reservations|location hours|gallery)$/i;
  const usableFeatures = fromFeatures.filter((feature) => !metaFeature.test(feature));
  if (usableFeatures.length) return usableFeatures;

  const lower = prompt.toLowerCase();
  const guessed: string[] = [];
  const push = (...values: string[]) => {
    for (const value of values) guessed.push(value);
  };

  if (/jewell?ery|jewelry|gold|diamond/i.test(lower)) {
    push("bridal jewellery", "custom designs", "in-store consultation");
  } else if (/hospital|multi-specialty|cardiology/i.test(lower)) {
    push("specialist consultations", "diagnostics", "emergency care");
  } else if (/dental|dentist/i.test(lower)) {
    push("checkups", "cosmetic dentistry", "implants");
  } else if (/pet clinic|pet care|pet parents|pet products|veterinary|vet\b/i.test(lower)) {
    push("vet consultations", "nutrition guidance", "pet products");
  } else if (/restaurant|fine dining/i.test(lower)) {
    push("tasting menus", "reservations", "private dining");
  } else if (/cafe|café|coffee/i.test(lower)) {
    push("specialty coffee", "brunch", "takeaway");
  } else if (/bakery|pastry|sourdough/i.test(lower)) {
    push("sourdough", "seasonal pastries", "custom cakes");
  } else if (/law firm|lawyer|attorney/i.test(lower)) {
    push("corporate counsel", "IP advisory", "litigation support");
  } else if (/interior design/i.test(lower)) {
    push("space planning", "material selection", "custom furniture");
  } else if (
    /travel agency|honeymoon|tour|flights?|hotels?|trip booking/i.test(lower)
  ) {
    push("flight bookings", "hotel stays", "holiday packages");
  } else if (/gym|fitness|hiit/i.test(lower)) {
    push("strength training", "group classes", "personal coaching");
  } else if (/school|cbse/i.test(lower)) {
    push("admissions guidance", "student life", "parent partnership");
  } else if (/meditation|mindfulness|breathwork/i.test(lower)) {
    push("guided programs", "silent retreats", "breathwork");
  } else if (/photography|photographer/i.test(lower)) {
    push("wedding stories", "lifestyle shoots", "brand campaigns");
  } else if (/hotel|resort|hospitality/i.test(lower)) {
    push("suites", "spa experiences", "event venues");
  } else if (/fashion|ethnic wear/i.test(lower)) {
    push("festive collections", "ready-to-wear", "seasonal drops");
  } else if (/real estate|apartment|property/i.test(lower)) {
    push("verified listings", "site visits", "buyer guidance");
  } else if (/saas|software|platform|fintech|payments?|billing/i.test(lower)) {
    push("product overview", "integrations", "customer success");
  } else if (/ngo|nonprofit|charity|donation|child rights/i.test(lower)) {
    push("community programs", "impact stories", "donation options");
  } else if (/event management|conference|product launch/i.test(lower)) {
    push("event planning", "on-site production", "guest experience");
  } else if (/salon|bridal makeup|spa package/i.test(lower)) {
    push("bridal makeup", "hair styling", "skincare treatments");
  } else if (/electronics|smartphone|laptop/i.test(lower)) {
    push("device demos", "same-day delivery", "warranty support");
  } else if (/furniture|modular kitchen/i.test(lower)) {
    push("showroom pieces", "custom woodwork", "delivery & install");
  } else if (
    /accounting|chartered|gst|audit|tax|financial advisory|wealth management/i.test(
      lower,
    )
  ) {
    push("tax filing", "audits", "financial advisory");
  } else if (/dealership|test drive|vehicle/i.test(lower)) {
    push("test drives", "financing", "certified service");
  } else if (/yoga|hatha|vinyasa/i.test(lower)) {
    push("group classes", "workshops", "teacher training");
  } else if (/coaching|jee|neet/i.test(lower)) {
    push("structured batches", "mentor support", "mock tests");
  } else if (/construction|builder|apartment project/i.test(lower)) {
    push("project planning", "quality construction", "on-time delivery");
  } else if (/digital agency|marketing agency|seo/i.test(lower)) {
    push("brand strategy", "performance ads", "conversion websites");
  } else if (/home decor|wall art|styling consultation/i.test(lower)) {
    push("curated lighting", "textiles", "styling consultations");
  } else if (/clinic|doctor|lawyer|consultant/i.test(lower)) {
    push("consultations", "appointments");
  }

  if (!guessed.length && profile.industry) {
    guessed.push(profile.industry);
  }
  return uniqueStrings(guessed).slice(0, 6);
}

function deriveSections(pages: string[]): SectionPlan[] {
  const sections: SectionPlan[] = [];
  if (pages.includes("home")) {
    sections.push(
      { role: "hero", page: "home" },
      { role: "features", page: "home" },
      { role: "cta", page: "home" },
    );
  }
  if (pages.includes("products") || pages.includes("collections")) {
    sections.push({
      role: "products",
      page: pages.includes("products") ? "products" : "collections",
    });
    sections.push({ role: "gallery", page: "home" });
  }
  if (pages.includes("about")) {
    sections.push({ role: "richText", page: "about" });
  }
  if (pages.includes("contact")) {
    sections.push({ role: "form", page: "contact" });
  }
  if (pages.includes("blog")) {
    sections.push({ role: "blogList", page: "blog" });
  }
  return sections.length ? sections : DEFAULT_SECTIONS;
}

/** Map an existing BI profile into a BusinessPlan (unit-testable, sync). */
export function businessPlanFromProfile(
  profile: AiBusinessProfile,
  prompt = "",
): BusinessPlan {
  const pages = uniqueStrings(
    profile.suggestedPages.length
      ? profile.suggestedPages
      : ["home", "about", "contact"],
  );

  return {
    businessType: profile.businessType || profile.category || "other",
    industry: profile.industry || profile.category || "general",
    targetAudience:
      profile.audience ||
      "local customers researching this business online",
    goals: deriveGoals(profile),
    tone: profile.tone || "professional",
    style: profile.visualStyle || "minimal",
    services: deriveServices(profile, prompt),
    pages,
    requiredSections: deriveSections(pages),
  };
}

/**
 * Deterministic planner: prompt → BusinessPlan.
 * Pure / sync — safe for unit tests and LLM fallback.
 */
export function inferBusinessPlan(prompt: string): BusinessPlan {
  const normalized = clampAiTextByKey(prompt, "prompt");
  const profile = inferBusinessProfile({ prompt: normalized });
  return businessPlanFromProfile(profile, normalized);
}
