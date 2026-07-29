/**
 * Deterministic Hero generator fallback (AI Pipeline Phase 3).
 * Maps BusinessPlan signals into HeroSectionContent — no LLM, no markup.
 */

import type { BusinessPlan } from "@/lib/website/ai/business-planner/types";
import type { GenerationTask } from "@/lib/website/ai/orchestrator/types";
import type { WebsitePlan } from "@/lib/website/ai/website-planner/types";
import {
  HERO_HEADLINE_MAX_WORDS,
  HERO_SUBHEADLINE_MAX_WORDS,
} from "@/lib/website/ai/generators/hero/schema";
import type {
  HeroLayout,
  HeroSectionContent,
  HeroStyle,
} from "@/lib/website/ai/generators/hero/types";
import { countWords } from "@/lib/website/ai/generators/hero/validate";

function haystack(plan: BusinessPlan): string {
  return [
    plan.businessType,
    plan.industry,
    plan.targetAudience,
    plan.tone,
    plan.style,
    ...plan.goals,
    ...plan.services,
  ]
    .join(" ")
    .toLowerCase();
}

function clampWords(value: string, maxWords: number): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return words.slice(0, maxWords).join(" ");
}

function shortPhrase(value: string, maxWords: number): string {
  return clampWords(value.trim() || "", maxWords);
}

function pickStyle(plan: BusinessPlan): HeroStyle {
  const text = haystack(plan);

  if (
    /hospital|clinic|doctor|medical|healthcare|dental|dentist|patient/i.test(
      text,
    )
  ) {
    return "healthcare";
  }
  if (
    /restaurant|cafe|café|bistro|dining|bakery|bar\b|food/i.test(text) ||
    plan.businessType === "restaurant"
  ) {
    return "restaurant";
  }
  if (
    /meditation|mindful|yoga|retreat|spiritual|ashram|wellness/i.test(text)
  ) {
    return "spiritual";
  }
  if (
    /luxury|premium|elegant|bridal|jewell?ery|gold|diamond|wedding/i.test(
      text,
    ) ||
    /luxury|elegant|premium/i.test(plan.tone) ||
    /luxury|elegant|premium/i.test(plan.style)
  ) {
    return "luxury";
  }
  if (/minimal|clean|simple|sparse/i.test(text)) {
    return "minimal";
  }
  if (
    /corporate|professional|b2b|enterprise|lawyer|consultant|accountant/i.test(
      text,
    ) ||
    plan.businessType === "professional_practice"
  ) {
    return "corporate";
  }
  if (/modern|contemporary|tech|digital/i.test(text)) {
    return "modern";
  }

  return "modern";
}

function pickLayout(style: HeroStyle): HeroLayout {
  switch (style) {
    case "restaurant":
      return "fullscreen";
    case "minimal":
    case "spiritual":
      return "center";
    case "modern":
      return "split-right";
    case "luxury":
    case "corporate":
    case "healthcare":
    default:
      return "split-left";
  }
}

function industryPhrase(plan: BusinessPlan): string {
  const industry = plan.industry.trim();
  if (industry) return shortPhrase(industry, 4);
  return shortPhrase(plan.businessType.trim() || "business", 3);
}

function primaryService(plan: BusinessPlan): string {
  return shortPhrase(plan.services[0]?.trim() || industryPhrase(plan), 4);
}

function audiencePhrase(plan: BusinessPlan): string {
  return shortPhrase(
    plan.targetAudience.trim() || "customers who value quality",
    5,
  );
}

function buildHeadline(plan: BusinessPlan, style: HeroStyle): string {
  const service = primaryService(plan);
  let headline: string;
  switch (style) {
    case "luxury":
      headline = `Discover ${service} crafted for lasting moments`;
      break;
    case "restaurant":
      headline = "Taste menus made for memorable evenings";
      break;
    case "healthcare":
      headline = "Care that puts patients first every visit";
      break;
    case "spiritual":
      headline = "Find calm practices that restore balance";
      break;
    case "corporate":
      headline = "Clear solutions that move work forward";
      break;
    case "minimal":
      headline = `Simple ${service} with lasting clarity`;
      break;
    case "modern":
    default:
      headline = `Get ${service} built around your goals`;
      break;
  }
  return clampWords(headline, HERO_HEADLINE_MAX_WORDS);
}

function buildSubheadline(plan: BusinessPlan, style: HeroStyle): string {
  const audience = audiencePhrase(plan);
  const industry = industryPhrase(plan);
  let subheadline: string;

  switch (style) {
    case "luxury":
      subheadline = `Designed for ${audience}, our ${industry} blends craftsmanship with personal showroom guidance.`;
      break;
    case "restaurant":
      subheadline = `Seasonal plates and warm hospitality welcome ${audience} with flavours worth returning for.`;
      break;
    case "healthcare":
      subheadline = `Trusted ${industry} support for ${audience}, delivered with clarity and modern clinical care.`;
      break;
    case "spiritual":
      subheadline = `Guided experiences help ${audience} slow down, breathe deeper, and rebuild everyday presence.`;
      break;
    case "corporate":
      subheadline = `We help ${audience} cut complexity and reach outcomes with practical, focused expertise.`;
      break;
    case "minimal":
      subheadline = `Focused ${industry} for ${audience} — fewer distractions, clearer choices, stronger results.`;
      break;
    case "modern":
    default:
      subheadline = `Built for ${audience}, our ${industry} approach delivers value without the noise.`;
      break;
  }
  return clampWords(subheadline, HERO_SUBHEADLINE_MAX_WORDS);
}

function buildPrimaryCta(style: HeroStyle, plan: BusinessPlan): string {
  switch (style) {
    case "luxury":
      return "Book a private viewing";
    case "restaurant":
      return "Reserve a table";
    case "healthcare":
      return "Book an appointment";
    case "spiritual":
      return "Start your session";
    case "corporate":
      return "Schedule a consult";
    case "minimal":
      return "Explore the offer";
    case "modern":
    default:
      return plan.goals.some((g) => /enquir|lead|contact/i.test(g))
        ? "Get in touch"
        : "Explore collections";
  }
}

function buildSecondaryCta(style: HeroStyle): string | undefined {
  switch (style) {
    case "luxury":
      return "View bridal sets";
    case "restaurant":
      return "See the menu";
    case "healthcare":
      return "Meet our team";
    case "spiritual":
      return "Learn our approach";
    case "corporate":
      return "See how we work";
    case "minimal":
      return "Learn more";
    case "modern":
    default:
      return "Learn more";
  }
}

function buildImagePrompt(plan: BusinessPlan, style: HeroStyle): string {
  const industry = industryPhrase(plan);
  const service = primaryService(plan);

  switch (style) {
    case "luxury":
      return `Luxury ${industry} showroom featuring ${service}, elegant displays, soft cinematic lighting, refined interiors, shallow depth of field`;
    case "restaurant":
      return `Inviting ${industry} dining room with plated ${service}, warm ambient lighting, natural textures, editorial food photography`;
    case "healthcare":
      return `Calm modern ${industry} clinic interior, welcoming reception, soft natural light, clean clinical finishes, reassuring atmosphere`;
    case "spiritual":
      return `Serene ${industry} space with soft daylight, natural materials, quiet seating for ${service}, peaceful contemplative mood`;
    case "corporate":
      return `Polished ${industry} workspace with confident professionals, clean architecture, balanced daylight, understated corporate aesthetic`;
    case "minimal":
      return `Minimal ${industry} setting focused on ${service}, generous negative space, soft neutral palette, precise natural light`;
    case "modern":
    default:
      return `Contemporary ${industry} brand scene highlighting ${service}, crisp lighting, modern interiors, high-quality marketing photography`;
  }
}

/**
 * Deterministic hero content from BusinessPlan (+ task/website context).
 * Sync and unit-testable — always returns rule-compliant JSON fields.
 */
export function inferHeroSection(input: {
  businessPlan: BusinessPlan;
  websitePlan?: WebsitePlan;
  task?: GenerationTask;
}): HeroSectionContent {
  const { businessPlan } = input;
  const style = pickStyle(businessPlan);
  const layout = pickLayout(style);
  const secondaryCTA = buildSecondaryCta(style);

  const content: HeroSectionContent = {
    headline: buildHeadline(businessPlan, style),
    subheadline: buildSubheadline(businessPlan, style),
    primaryCTA: buildPrimaryCta(style, businessPlan),
    imagePrompt: buildImagePrompt(businessPlan, style),
    layout,
    style,
  };
  if (secondaryCTA) {
    content.secondaryCTA = secondaryCTA;
  }

  // Defensive: deterministic path must always satisfy word rules.
  if (countWords(content.headline) > HERO_HEADLINE_MAX_WORDS) {
    content.headline = clampWords(content.headline, HERO_HEADLINE_MAX_WORDS);
  }
  if (countWords(content.subheadline) > HERO_SUBHEADLINE_MAX_WORDS) {
    content.subheadline = clampWords(
      content.subheadline,
      HERO_SUBHEADLINE_MAX_WORDS,
    );
  }

  return content;
}
