/**
 * Merge validated LLM prompt signals onto a deterministic business profile (Sprint B3).
 * Does not re-run BI logic — only overlays validated fields.
 */

import type { AiWebsitePromptSignals } from "@/lib/website/ai/llm/types";
import type { AiBusinessProfile } from "@/lib/website/ai/types";
import { clampAiTextByKey } from "@/lib/website/ai/helpers";

const LLM_CONFIDENCE = 0.92;

/**
 * Apply validated OpenAI (or other LLM) signals onto a deterministic profile.
 * Engines remain the source of truth for missing fields.
 */
export function mergePromptSignalsIntoProfile(
  profile: AiBusinessProfile,
  signals: AiWebsitePromptSignals | null | undefined,
): AiBusinessProfile {
  if (!signals) return profile;

  const next: AiBusinessProfile = {
    ...profile,
    confidence: { ...profile.confidence },
  };

  if (signals.businessName) {
    next.name = clampAiTextByKey(signals.businessName, "siteName");
    next.confidence.name = LLM_CONFIDENCE;
  }
  if (signals.description) {
    next.description = clampAiTextByKey(signals.description, "description");
    next.confidence.description = LLM_CONFIDENCE;
  }
  if (signals.slogan) {
    next.slogan = clampAiTextByKey(signals.slogan, "slogan");
    next.confidence.slogan = LLM_CONFIDENCE;
  }
  if (signals.industry) {
    next.industry = signals.industry;
    next.confidence.industry = LLM_CONFIDENCE;
  }
  if (signals.audience) {
    next.audience = signals.audience;
    next.confidence.audience = LLM_CONFIDENCE;
  }
  if (signals.locale) {
    next.locale = signals.locale;
  }
  if (signals.language) {
    next.language = signals.language;
    next.confidence.language = LLM_CONFIDENCE;
  }
  if (signals.country) {
    next.country = signals.country.toUpperCase().slice(0, 2);
    next.confidence.country = LLM_CONFIDENCE;
  }
  if (signals.region) {
    next.region = signals.region;
    next.confidence.region = LLM_CONFIDENCE;
  }
  if (signals.category) {
    next.category = signals.category;
    next.confidence.category = LLM_CONFIDENCE;
  }
  if (signals.businessType) {
    next.businessType = signals.businessType;
    next.confidence.businessType = LLM_CONFIDENCE;
  }
  if (signals.tone) {
    next.tone = signals.tone;
    next.confidence.tone = LLM_CONFIDENCE;
  }
  if (signals.brandPersonality?.length) {
    next.brandPersonality = signals.brandPersonality;
    next.confidence.brandPersonality = LLM_CONFIDENCE;
  }
  if (signals.visualStyle) {
    next.visualStyle = signals.visualStyle;
    next.confidence.visualStyle = LLM_CONFIDENCE;
  }
  if (signals.colourDirection) {
    next.colourDirection = signals.colourDirection;
    next.confidence.colourDirection = LLM_CONFIDENCE;
  }
  if (signals.primaryCta) {
    next.primaryCta = signals.primaryCta;
    next.confidence.primaryCta = LLM_CONFIDENCE;
  }
  if (signals.suggestedPages?.length) {
    const pages = signals.suggestedPages.includes("home")
      ? signals.suggestedPages
      : (["home", ...signals.suggestedPages] as typeof signals.suggestedPages);
    next.suggestedPages = [...new Set(pages)];
    next.confidence.suggestedPages = LLM_CONFIDENCE;
  }
  if (signals.suggestedFeatures?.length) {
    next.suggestedFeatures = signals.suggestedFeatures;
    next.confidence.suggestedFeatures = LLM_CONFIDENCE;
  }
  if (signals.trustSignals?.length) {
    next.trustSignals = signals.trustSignals;
    next.confidence.trustSignals = LLM_CONFIDENCE;
  }
  if (signals.contactPreferences?.length) {
    next.contactPreferences = signals.contactPreferences;
    next.confidence.contactPreferences = LLM_CONFIDENCE;
  }
  if (signals.seoKeywords?.length) {
    next.seoKeywords = signals.seoKeywords;
    next.confidence.seoKeywords = LLM_CONFIDENCE;
  }

  return next;
}
