import { platformErrorResponse } from "@/lib/platform/http";
import {
  EMAIL_CAMPAIGN_STATUSES,
  EMAIL_MESSAGE_KINDS,
  EMAIL_PROVIDERS,
  EMAIL_TEMPLATE_CATEGORIES,
  type EmailCampaignStatus,
  type EmailMessageKind,
  type EmailProvider,
  type EmailTemplateCategory,
} from "@/lib/email-engine/types";

export function emailErrorResponse(error: unknown) {
  return platformErrorResponse(error, {
    label: "email-engine",
    fallback: "Unexpected Email Engine error.",
  });
}

export function parseEmailListFilters(searchParams: URLSearchParams) {
  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  const offset = offsetRaw ? Number(offsetRaw) : undefined;

  return {
    q: searchParams.get("q")?.trim() || undefined,
    status: searchParams.get("status")?.trim() || undefined,
    kind: searchParams.get("kind")?.trim() || undefined,
    category: searchParams.get("category")?.trim() || undefined,
    campaignId: searchParams.get("campaignId")?.trim() || undefined,
    contactId: searchParams.get("contactId")?.trim() || undefined,
    type: searchParams.get("type")?.trim() || undefined,
    limit:
      typeof limit === "number" && Number.isFinite(limit)
        ? Math.min(Math.max(1, Math.floor(limit)), 500)
        : undefined,
    offset:
      typeof offset === "number" && Number.isFinite(offset)
        ? Math.max(0, Math.floor(offset))
        : undefined,
  };
}

export function parseEmailProvider(value: unknown): EmailProvider | null {
  if (typeof value !== "string") return null;
  return EMAIL_PROVIDERS.includes(value as EmailProvider)
    ? (value as EmailProvider)
    : null;
}

export function parseEmailMessageKind(
  value: unknown,
): EmailMessageKind | null {
  if (typeof value !== "string") return null;
  return EMAIL_MESSAGE_KINDS.includes(value as EmailMessageKind)
    ? (value as EmailMessageKind)
    : null;
}

export function parseEmailTemplateCategory(
  value: unknown,
): EmailTemplateCategory | null {
  if (typeof value !== "string") return null;
  return EMAIL_TEMPLATE_CATEGORIES.includes(value as EmailTemplateCategory)
    ? (value as EmailTemplateCategory)
    : null;
}

export function parseEmailCampaignStatus(
  value: unknown,
): EmailCampaignStatus | null {
  if (typeof value !== "string") return null;
  return EMAIL_CAMPAIGN_STATUSES.includes(value as EmailCampaignStatus)
    ? (value as EmailCampaignStatus)
    : null;
}
