import type { TemplateContext } from "@/lib/automation/types";

function getPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function stringifyValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Resolve `{{path.to.value}}` templates against a run context.
 * Supports trigger.*, vars.*, steps.*, workflow.*, run.*.
 */
export function renderTemplate(
  template: string,
  context: TemplateContext,
): string {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, rawPath: string) => {
    const path = rawPath.trim();
    const value = getPath(context, path);
    return stringifyValue(value);
  });
}

export function resolveValue(
  value: unknown,
  context: TemplateContext,
): unknown {
  if (typeof value === "string") {
    if (/^\{\{\s*[^}]+\s*\}\}$/.test(value.trim())) {
      const path = value.trim().replace(/^\{\{\s*|\s*\}\}$/g, "");
      return getPath(context, path);
    }
    return renderTemplate(value, context);
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, context));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = resolveValue(item, context);
    }
    return out;
  }
  return value;
}

export function getByPath(context: TemplateContext, path: string): unknown {
  return getPath(context, path);
}

export function buildTemplateContext(input: {
  trigger: Record<string, unknown>;
  vars?: Record<string, unknown>;
  steps?: Record<string, unknown>;
  workflow: { id: string; name: string; workspaceId: string };
  run: { id: string; attempt: number };
}): TemplateContext {
  return {
    trigger: input.trigger,
    vars: input.vars ?? {},
    steps: input.steps ?? {},
    workflow: input.workflow,
    run: input.run,
  };
}
