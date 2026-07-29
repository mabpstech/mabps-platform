/**
 * Validation for Website Planner structured JSON (AI Pipeline Phase 2).
 */

import {
  WEBSITE_PLAN_FORBIDDEN_KEYS,
  WEBSITE_PLAN_KEYS,
} from "@/lib/website/ai/website-planner/schema";
import type {
  WebsitePagePlan,
  WebsitePlan,
  WebsitePlanParseResult,
} from "@/lib/website/ai/website-planner/types";
import { isPlainObject } from "@/lib/website/ai/validate";

type Issue = { path: string; message: string };

function issue(path: string, message: string): Issue {
  return { path, message };
}

function asTrimmedString(value: unknown, max = 80): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > max ? trimmed.slice(0, max).trim() : trimmed;
}

function parseStringArray(
  value: unknown,
  path: string,
  issues: Issue[],
  maxItems = 16,
  maxLen = 64,
): string[] {
  if (!Array.isArray(value)) {
    issues.push(issue(path, "must be an array of strings."));
    return [];
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
  return out;
}

function parsePages(
  value: unknown,
  path: string,
  issues: Issue[],
): WebsitePagePlan[] {
  if (!Array.isArray(value)) {
    issues.push(issue(path, "must be an array of page plans."));
    return [];
  }

  const out: WebsitePagePlan[] = [];
  for (let i = 0; i < value.length && out.length < 16; i += 1) {
    const item = value[i];
    if (!isPlainObject(item)) {
      issues.push(issue(`${path}[${i}]`, "must be a { id, sections } object."));
      continue;
    }
    const id = asTrimmedString(item.id, 48)?.toLowerCase().replace(/\s+/g, "-");
    if (!id) {
      issues.push(issue(`${path}[${i}].id`, "must be a non-empty string."));
      continue;
    }
    const sections = parseStringArray(
      item.sections,
      `${path}[${i}].sections`,
      issues,
      16,
      48,
    );
    if (!sections.length) {
      issues.push(
        issue(`${path}[${i}].sections`, "must include at least one section."),
      );
      continue;
    }
    out.push({ id, sections });
  }
  return out;
}

/**
 * Parse unknown LLM JSON into a validated WebsitePlan.
 * Rejects forbidden copy/visual/builder keys and incomplete shapes.
 */
export function parseWebsitePlan(value: unknown): WebsitePlanParseResult {
  const issues: Issue[] = [];

  if (!isPlainObject(value)) {
    return {
      ok: false,
      plan: null,
      issues: [issue("", "response must be a JSON object.")],
    };
  }

  for (const key of Object.keys(value)) {
    if ((WEBSITE_PLAN_FORBIDDEN_KEYS as readonly string[]).includes(key)) {
      issues.push(
        issue(
          key,
          `forbidden key "${key}" — planner must not emit copy/visual/builder data.`,
        ),
      );
    } else if (!(WEBSITE_PLAN_KEYS as readonly string[]).includes(key)) {
      // Extra unknown keys are ignored unless forbidden (already handled).
    }
  }

  const navigation = parseStringArray(value.navigation, "navigation", issues, 16, 48);
  const pages = parsePages(value.pages, "pages", issues);
  const footerLinks = parseStringArray(
    value.footerLinks,
    "footerLinks",
    issues,
    12,
    48,
  );
  const contentRequirements = parseStringArray(
    value.contentRequirements,
    "contentRequirements",
    issues,
    24,
    80,
  );

  if (!navigation.length) {
    issues.push(issue("navigation", "must include at least one nav label."));
  }
  if (!pages.length) {
    issues.push(issue("pages", "must include at least one page."));
  }
  if (!pages.some((page) => page.id === "home")) {
    issues.push(issue("pages", 'must include a page with id "home".'));
  }
  if (!footerLinks.length) {
    issues.push(issue("footerLinks", "must include at least one footer link."));
  }
  if (!contentRequirements.length) {
    issues.push(
      issue(
        "contentRequirements",
        "must include at least one content requirement label.",
      ),
    );
  }

  if (issues.length) {
    return { ok: false, plan: null, issues };
  }

  const plan: WebsitePlan = {
    navigation,
    pages,
    footerLinks,
    contentRequirements,
  };

  return { ok: true, plan, issues: [] };
}

export function parseWebsitePlanFromContent(
  content: string,
): WebsitePlanParseResult {
  const trimmed = content.trim();
  if (!trimmed) {
    return {
      ok: false,
      plan: null,
      issues: [issue("", "empty response content.")],
    };
  }

  try {
    return parseWebsitePlan(JSON.parse(trimmed) as unknown);
  } catch {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence?.[1]) {
      try {
        return parseWebsitePlan(JSON.parse(fence[1].trim()) as unknown);
      } catch {
        // fall through
      }
    }
    return {
      ok: false,
      plan: null,
      issues: [issue("", "response is not valid JSON.")],
    };
  }
}
