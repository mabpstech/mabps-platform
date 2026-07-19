import { renderTemplateString } from "@/lib/notifications/defaults";
import {
  getTemplateById,
  getTemplateBySlug,
} from "@/lib/notifications/repository";
import type { NotificationTemplate } from "@/lib/notifications/types";

export function resolveNotificationTemplate(input: {
  workspaceId: string;
  templateId?: string | null;
  templateSlug?: string | null;
}): NotificationTemplate | null {
  if (input.templateId) {
    return getTemplateById(input.workspaceId, input.templateId);
  }
  if (input.templateSlug) {
    return getTemplateBySlug(input.workspaceId, input.templateSlug);
  }
  return null;
}

export function renderNotificationTemplate(
  template: NotificationTemplate,
  variables: Record<string, string> = {},
): { title: string; body: string } {
  return {
    title: renderTemplateString(template.title, variables),
    body: renderTemplateString(template.body, variables),
  };
}
