/**
 * Validation for Business Planner structured JSON (AI Pipeline Phase 1).
 */

import {
  BUSINESS_PLAN_FORBIDDEN_KEYS,
  BUSINESS_PLAN_KEYS,
} from "@/lib/website/ai/business-planner/schema";
import type {
  BusinessPlan,
  BusinessPlanParseResult,
  SectionPlan,
  WebsitePlan,
} from "@/lib/website/ai/business-planner/types";
import { isPlainObject } from "@/lib/website/ai/validate";

type Issue = { path: string; message: string };

function issue(path: string, message: string): Issue {
  return { path, message };
}

function asTrimmedString(value: unknown, max = 160): string | undefined {
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
  maxLen = 80,
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

function parseSectionPlans(
  value: unknown,
  path: string,
  issues: Issue[],
): SectionPlan[] {
  if (!Array.isArray(value)) {
    issues.push(issue(path, "must be an array of section plans."));
    return [];
  }

  const out: SectionPlan[] = [];
  for (let i = 0; i < value.length && out.length < 24; i += 1) {
    const item = value[i];
    if (typeof item === "string" && item.trim()) {
      out.push({ role: item.trim().slice(0, 64) });
      continue;
    }
    if (!isPlainObject(item)) {
      issues.push(
        issue(`${path}[${i}]`, "must be a string or { role, page? } object."),
      );
      continue;
    }
    const role = asTrimmedString(item.role, 64);
    if (!role) {
      issues.push(issue(`${path}[${i}].role`, "must be a non-empty string."));
      continue;
    }
    const page = asTrimmedString(item.page, 48);
    out.push(page ? { role, page } : { role });
  }
  return out;
}

export function toWebsitePlan(plan: BusinessPlan): WebsitePlan {
  return {
    pages: [...plan.pages],
    requiredSections: plan.requiredSections.map((section) =>
      section.page
        ? { role: section.role, page: section.page }
        : { role: section.role },
    ),
  };
}

/**
 * Parse unknown LLM JSON into a validated BusinessPlan.
 * Rejects forbidden builder/copy keys and incomplete shapes.
 */
export function parseBusinessPlan(value: unknown): BusinessPlanParseResult {
  const issues: Issue[] = [];

  if (!isPlainObject(value)) {
    return {
      ok: false,
      plan: null,
      issues: [issue("", "response must be a JSON object.")],
    };
  }

  for (const key of Object.keys(value)) {
    if (
      (BUSINESS_PLAN_FORBIDDEN_KEYS as readonly string[]).includes(key) ||
      !(BUSINESS_PLAN_KEYS as readonly string[]).includes(key)
    ) {
      if ((BUSINESS_PLAN_FORBIDDEN_KEYS as readonly string[]).includes(key)) {
        issues.push(
          issue(key, `forbidden key "${key}" — planner must not emit builder/copy data.`),
        );
      }
    }
  }

  const businessType = asTrimmedString(value.businessType, 80);
  const industry = asTrimmedString(value.industry, 120);
  const targetAudience = asTrimmedString(value.targetAudience, 200);
  const tone = asTrimmedString(value.tone, 64);
  const style = asTrimmedString(value.style, 64);

  if (!businessType) {
    issues.push(issue("businessType", "required non-empty string."));
  }
  if (!industry) {
    issues.push(issue("industry", "required non-empty string."));
  }
  if (!targetAudience) {
    issues.push(issue("targetAudience", "required non-empty string."));
  }
  if (!tone) {
    issues.push(issue("tone", "required non-empty string."));
  }
  if (!style) {
    issues.push(issue("style", "required non-empty string."));
  }

  const goals = parseStringArray(value.goals, "goals", issues);
  const services = parseStringArray(value.services, "services", issues);
  const pages = parseStringArray(value.pages, "pages", issues, 12, 48);
  const requiredSections = parseSectionPlans(
    value.requiredSections,
    "requiredSections",
    issues,
  );

  if (!goals.length) {
    issues.push(issue("goals", "must include at least one goal label."));
  }
  if (!pages.length) {
    issues.push(issue("pages", "must include at least one page identifier."));
  }
  if (!requiredSections.length) {
    issues.push(
      issue("requiredSections", "must include at least one section role."),
    );
  }

  if (issues.length || !businessType || !industry || !targetAudience || !tone || !style) {
    return { ok: false, plan: null, issues };
  }

  const plan: BusinessPlan = {
    businessType,
    industry,
    targetAudience,
    goals,
    tone,
    style,
    services,
    pages,
    requiredSections,
  };

  return { ok: true, plan, issues: [] };
}

export function parseBusinessPlanFromContent(
  content: string,
): BusinessPlanParseResult {
  const trimmed = content.trim();
  if (!trimmed) {
    return {
      ok: false,
      plan: null,
      issues: [issue("", "empty response content.")],
    };
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return parseBusinessPlan(parsed);
  } catch {
    // Allow fenced JSON the same way other website LLM parsers do.
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence?.[1]) {
      try {
        return parseBusinessPlan(JSON.parse(fence[1].trim()) as unknown);
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
