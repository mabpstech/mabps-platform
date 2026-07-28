/**
 * Validation for website AI LLM structured JSON (Sprint B3).
 * Invalid responses never reach the engines — callers fall back to deterministic inference.
 */

import {
  AI_WEBSITE_LLM_FORBIDDEN_KEYS,
  AI_WEBSITE_PROMPT_SIGNAL_KEYS,
} from "@/lib/website/ai/llm/schema";
import type {
  AiWebsiteLlmParseResult,
  AiWebsitePromptSignals,
} from "@/lib/website/ai/llm/types";
import {
  isAiBrandPersonality,
  isAiBusinessType,
  isAiColourDirection,
  isAiContactPreference,
  isAiGenerationToneValue,
  isAiVisualStyle,
  isSiteCategoryIdValue,
} from "@/lib/website/ai/intelligence/engine";
import { clampAiTextByKey } from "@/lib/website/ai/helpers";
import { isPlainObject } from "@/lib/website/ai/validate";
import { isPageType, type PageType } from "@/lib/website/types";

type Issue = { path: string; message: string };

function issue(path: string, message: string): Issue {
  return { path, message };
}

function asTrimmedString(value: unknown, max = 800): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > max ? trimmed.slice(0, max).trim() : trimmed;
}

function parseStringArray(
  value: unknown,
  path: string,
  issues: Issue[],
  maxItems = 12,
  maxLen = 80,
): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    issues.push(issue(path, "must be an array of strings."));
    return undefined;
  }
  const out: string[] = [];
  for (let i = 0; i < value.length && out.length < maxItems; i += 1) {
    const item = value[i];
    if (typeof item !== "string" || !item.trim()) {
      issues.push(issue(`${path}[${i}]`, "must be a non-empty string."));
      continue;
    }
    out.push(item.trim().slice(0, maxLen));
  }
  return out.length ? out : undefined;
}

/**
 * Parse unknown LLM JSON into validated prompt signals.
 * Rejects forbidden Website Builder keys and invalid enum values.
 */
export function parseAiWebsitePromptSignals(
  value: unknown,
): AiWebsiteLlmParseResult {
  const issues: Issue[] = [];

  if (!isPlainObject(value)) {
    return {
      ok: false,
      signals: null,
      issues: [issue("", "response must be a JSON object.")],
    };
  }

  for (const key of Object.keys(value)) {
    if (
      (AI_WEBSITE_LLM_FORBIDDEN_KEYS as readonly string[]).includes(key)
    ) {
      issues.push(
        issue(
          key,
          "forbidden: LLM must not emit Website Builder or blueprint fields.",
        ),
      );
    } else if (
      !(AI_WEBSITE_PROMPT_SIGNAL_KEYS as readonly string[]).includes(key)
    ) {
      issues.push(issue(key, "unknown key."));
    }
  }

  if (issues.some((item) => item.message.startsWith("forbidden:"))) {
    return { ok: false, signals: null, issues };
  }

  const signals: AiWebsitePromptSignals = {};

  const businessName = asTrimmedString(value.businessName, 80);
  if (value.businessName !== undefined && !businessName) {
    issues.push(issue("businessName", "must be a non-empty string."));
  } else if (businessName) {
    signals.businessName = clampAiTextByKey(businessName, "siteName");
  }

  const description = asTrimmedString(value.description, 800);
  if (value.description !== undefined && !description) {
    issues.push(issue("description", "must be a non-empty string."));
  } else if (description) {
    signals.description = clampAiTextByKey(description, "description");
  }

  const slogan = asTrimmedString(value.slogan, 160);
  if (value.slogan !== undefined && !slogan) {
    issues.push(issue("slogan", "must be a non-empty string."));
  } else if (slogan) {
    signals.slogan = clampAiTextByKey(slogan, "slogan");
  }

  for (const key of [
    "industry",
    "audience",
    "locale",
    "language",
    "country",
    "region",
  ] as const) {
    if (value[key] === undefined) continue;
    const parsed = asTrimmedString(value[key], key === "audience" ? 200 : 64);
    if (!parsed) {
      issues.push(issue(key, "must be a non-empty string."));
      continue;
    }
    signals[key] = parsed;
  }

  if (value.category !== undefined) {
    if (!isSiteCategoryIdValue(value.category)) {
      issues.push(issue("category", "invalid category."));
    } else {
      signals.category = value.category;
    }
  }

  if (value.businessType !== undefined) {
    if (!isAiBusinessType(value.businessType)) {
      issues.push(issue("businessType", "invalid businessType."));
    } else {
      signals.businessType = value.businessType;
    }
  }

  if (value.tone !== undefined) {
    if (!isAiGenerationToneValue(value.tone)) {
      issues.push(issue("tone", "invalid tone."));
    } else {
      signals.tone = value.tone;
    }
  }

  if (value.brandPersonality !== undefined) {
    if (!Array.isArray(value.brandPersonality)) {
      issues.push(issue("brandPersonality", "must be an array."));
    } else {
      const personalities = value.brandPersonality.filter(isAiBrandPersonality);
      if (personalities.length === 0) {
        issues.push(issue("brandPersonality", "no valid personalities."));
      } else {
        signals.brandPersonality = [...new Set(personalities)].slice(0, 5);
      }
    }
  }

  if (value.visualStyle !== undefined) {
    if (!isAiVisualStyle(value.visualStyle)) {
      issues.push(issue("visualStyle", "invalid visualStyle."));
    } else {
      signals.visualStyle = value.visualStyle;
    }
  }

  if (value.colourDirection !== undefined) {
    if (!isAiColourDirection(value.colourDirection)) {
      issues.push(issue("colourDirection", "invalid colourDirection."));
    } else {
      signals.colourDirection = value.colourDirection;
    }
  }

  if (value.primaryCta !== undefined) {
    if (!isPlainObject(value.primaryCta)) {
      issues.push(issue("primaryCta", "must be an object."));
    } else {
      const label = asTrimmedString(value.primaryCta.label, 48);
      const href = asTrimmedString(value.primaryCta.href, 120);
      if (!label || !href) {
        issues.push(issue("primaryCta", "requires label and href strings."));
      } else {
        signals.primaryCta = {
          label,
          href: href.startsWith("/") ? href : `/${href}`,
        };
      }
    }
  }

  if (value.suggestedPages !== undefined) {
    if (!Array.isArray(value.suggestedPages)) {
      issues.push(issue("suggestedPages", "must be an array."));
    } else {
      const pages = value.suggestedPages.filter(isPageType) as PageType[];
      if (pages.length === 0) {
        issues.push(issue("suggestedPages", "no valid page types."));
      } else {
        signals.suggestedPages = [...new Set(pages)];
      }
    }
  }

  const features = parseStringArray(
    value.suggestedFeatures,
    "suggestedFeatures",
    issues,
  );
  if (features) signals.suggestedFeatures = features;

  const trust = parseStringArray(value.trustSignals, "trustSignals", issues);
  if (trust) signals.trustSignals = trust;

  if (value.contactPreferences !== undefined) {
    if (!Array.isArray(value.contactPreferences)) {
      issues.push(issue("contactPreferences", "must be an array."));
    } else {
      const prefs = value.contactPreferences.filter(isAiContactPreference);
      if (prefs.length === 0) {
        issues.push(issue("contactPreferences", "no valid preferences."));
      } else {
        signals.contactPreferences = [...new Set(prefs)];
      }
    }
  }

  const seo = parseStringArray(value.seoKeywords, "seoKeywords", issues, 16, 48);
  if (seo) signals.seoKeywords = seo;

  const hasAnySignal = Object.keys(signals).length > 0;
  if (!hasAnySignal) {
    if (issues.length === 0) {
      issues.push(issue("", "no usable signal fields."));
    }
    return { ok: false, signals: null, issues };
  }

  return { ok: true, signals, issues: [] };
}

/** Extract JSON object from model text (strips optional markdown fences). */
export function extractJsonObject(content: string): unknown {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence?.[1]?.trim() || trimmed;

  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1)) as unknown;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function parseAiWebsitePromptSignalsFromContent(
  content: string,
): AiWebsiteLlmParseResult {
  const parsed = extractJsonObject(content);
  if (parsed === null) {
    return {
      ok: false,
      signals: null,
      issues: [issue("", "response is not valid JSON.")],
    };
  }
  return parseAiWebsitePromptSignals(parsed);
}
