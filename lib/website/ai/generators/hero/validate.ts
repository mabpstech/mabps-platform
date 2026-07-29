/**
 * Validation for Hero generator structured JSON (AI Pipeline Phase 3).
 */

import {
  HERO_HEADLINE_MAX_WORDS,
  HERO_SECTION_FORBIDDEN_KEYS,
  HERO_SECTION_KEYS,
  HERO_SUBHEADLINE_MAX_WORDS,
} from "@/lib/website/ai/generators/hero/schema";
import {
  HERO_LAYOUTS,
  HERO_STYLES,
  type HeroLayout,
  type HeroSectionContent,
  type HeroSectionParseResult,
  type HeroStyle,
} from "@/lib/website/ai/generators/hero/types";
import { extractJsonObject } from "@/lib/website/ai/llm/validate";
import { isPlainObject } from "@/lib/website/ai/validate";

type Issue = { path: string; message: string };

function issue(path: string, message: string): Issue {
  return { path, message };
}

export function countWords(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function asTrimmedString(value: unknown, maxChars: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > maxChars ? trimmed.slice(0, maxChars).trim() : trimmed;
}

function isHeroLayout(value: string): value is HeroLayout {
  return (HERO_LAYOUTS as readonly string[]).includes(value);
}

function isHeroStyle(value: string): value is HeroStyle {
  return (HERO_STYLES as readonly string[]).includes(value);
}

function startsWithWelcomeTo(value: string): boolean {
  return /^welcome\s+to\b/i.test(value.trim());
}

/**
 * Parse unknown LLM JSON into validated HeroSectionContent.
 * Rejects markup/builder keys and rule violations (word limits, enums).
 */
export function parseHeroSection(value: unknown): HeroSectionParseResult {
  const issues: Issue[] = [];

  if (!isPlainObject(value)) {
    return {
      ok: false,
      content: null,
      issues: [issue("", "response must be a JSON object.")],
    };
  }

  for (const key of Object.keys(value)) {
    if ((HERO_SECTION_FORBIDDEN_KEYS as readonly string[]).includes(key)) {
      issues.push(
        issue(
          key,
          `forbidden key "${key}" — hero generator must not emit markup or builder data.`,
        ),
      );
    } else if (!(HERO_SECTION_KEYS as readonly string[]).includes(key)) {
      // Extra unknown keys are ignored unless forbidden.
    }
  }

  const headline = asTrimmedString(value.headline, 120);
  if (!headline) {
    issues.push(issue("headline", "must be a non-empty string."));
  } else {
    if (countWords(headline) > HERO_HEADLINE_MAX_WORDS) {
      issues.push(
        issue(
          "headline",
          `must be at most ${HERO_HEADLINE_MAX_WORDS} words.`,
        ),
      );
    }
    if (startsWithWelcomeTo(headline)) {
      issues.push(issue("headline", 'must not start with "Welcome to".'));
    }
  }

  const subheadline = asTrimmedString(value.subheadline, 320);
  if (!subheadline) {
    issues.push(issue("subheadline", "must be a non-empty string."));
  } else if (countWords(subheadline) > HERO_SUBHEADLINE_MAX_WORDS) {
    issues.push(
      issue(
        "subheadline",
        `must be at most ${HERO_SUBHEADLINE_MAX_WORDS} words.`,
      ),
    );
  }

  const primaryCTA = asTrimmedString(value.primaryCTA, 48);
  if (!primaryCTA) {
    issues.push(issue("primaryCTA", "must be a non-empty string."));
  }

  let secondaryCTA: string | undefined;
  if (value.secondaryCTA !== undefined && value.secondaryCTA !== null) {
    if (typeof value.secondaryCTA !== "string") {
      issues.push(issue("secondaryCTA", "must be a string when provided."));
    } else {
      const trimmed = value.secondaryCTA.trim();
      if (trimmed) {
        secondaryCTA = trimmed.slice(0, 48);
      }
    }
  }

  const imagePrompt = asTrimmedString(value.imagePrompt, 480);
  if (!imagePrompt) {
    issues.push(issue("imagePrompt", "must be a non-empty string."));
  }

  const layoutRaw = asTrimmedString(value.layout, 32);
  let layout: HeroLayout | undefined;
  if (!layoutRaw) {
    issues.push(issue("layout", "must be a non-empty string."));
  } else if (!isHeroLayout(layoutRaw)) {
    issues.push(
      issue(
        "layout",
        `must be one of: ${HERO_LAYOUTS.join(", ")}.`,
      ),
    );
  } else {
    layout = layoutRaw;
  }

  const styleRaw = asTrimmedString(value.style, 32);
  let style: HeroStyle | undefined;
  if (!styleRaw) {
    issues.push(issue("style", "must be a non-empty string."));
  } else if (!isHeroStyle(styleRaw)) {
    issues.push(
      issue(
        "style",
        `must be one of: ${HERO_STYLES.join(", ")}.`,
      ),
    );
  } else {
    style = styleRaw;
  }

  if (issues.length || !headline || !subheadline || !primaryCTA || !imagePrompt || !layout || !style) {
    return { ok: false, content: null, issues };
  }

  const content: HeroSectionContent = {
    headline,
    subheadline,
    primaryCTA,
    imagePrompt,
    layout,
    style,
  };
  if (secondaryCTA) {
    content.secondaryCTA = secondaryCTA;
  }

  return { ok: true, content, issues: [] };
}

export function parseHeroSectionFromContent(
  content: string,
): HeroSectionParseResult {
  const trimmed = content.trim();
  if (!trimmed) {
    return {
      ok: false,
      content: null,
      issues: [issue("", "empty response content.")],
    };
  }

  try {
    return parseHeroSection(JSON.parse(trimmed) as unknown);
  } catch {
    const parsed = extractJsonObject(trimmed);
    if (parsed !== null) {
      return parseHeroSection(parsed);
    }
    return {
      ok: false,
      content: null,
      issues: [issue("", "response is not valid JSON.")],
    };
  }
}
