import { renderTemplateString } from "@/lib/email-engine/defaults";
import {
  getTemplateById,
  getTemplateBySlug,
} from "@/lib/email-engine/repository";
import type { EmailTemplate } from "@/lib/email-engine/types";

export function resolveEmailTemplate(input: {
  workspaceId: string;
  templateId?: string | null;
  templateSlug?: string | null;
}): EmailTemplate | null {
  if (input.templateId) {
    const byId = getTemplateById(input.templateId);
    if (byId && byId.workspaceId === input.workspaceId) return byId;
  }
  if (input.templateSlug) {
    return getTemplateBySlug(input.workspaceId, input.templateSlug);
  }
  return null;
}

export function renderEmailTemplate(
  template: EmailTemplate,
  variables: Record<string, string> = {},
): { subject: string; html: string; text: string } {
  const merged = {
    ...Object.fromEntries(template.variables.map((key) => [key, ""])),
    ...variables,
  };
  const subject = renderTemplateString(template.subject, merged);
  const html = renderTemplateString(template.html, merged);
  const text = renderTemplateString(
    template.text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    merged,
  );
  return { subject, html, text };
}
