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
  if (fromFeatures.length) return fromFeatures;

  const lower = prompt.toLowerCase();
  const guessed: string[] = [];
  if (/jewellery|jewelry|gold|diamond/i.test(lower)) {
    guessed.push("bridal jewellery", "custom designs", "in-store consultation");
  }
  if (/restaurant|cafe|dining/i.test(lower)) {
    guessed.push("dine-in", "reservations", "takeaway");
  }
  if (/clinic|dentist|doctor|lawyer|consultant/i.test(lower)) {
    guessed.push("consultations", "appointments");
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
