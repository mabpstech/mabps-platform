import { NextResponse } from "next/server";
import { EmailEngineAuthError } from "@/lib/email-engine/access";
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
  if (error instanceof EmailEngineAuthError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  const message =
    error instanceof Error
      ? error.message
      : "Unexpected Email Engine error.";

  let status = 400;
  if (
    message.includes("Authentication required") ||
    message.includes("Unauthorized")
  ) {
    status = 401;
  } else if (message.includes("not found") || message.includes("Not found")) {
    status = 404;
  } else if (
    message.includes("not connected") ||
    message.includes("credentials")
  ) {
    status = 400;
  } else if (message.includes("not implemented")) {
    status = 501;
  }

  console.error("[email-engine]", error);
  return NextResponse.json({ error: message }, { status });
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
