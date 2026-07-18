import {
  trackAiUsage,
  trackApiRequest,
  trackEvent,
} from "@/lib/analytics/repository";
import type {
  AnalyticsAiUsage,
  AnalyticsApiRequest,
  AnalyticsEvent,
  TrackAiUsageInput,
  TrackApiRequestInput,
  TrackEventInput,
} from "@/lib/analytics/types";

/** Record a workspace product/analytics event. */
export function recordAnalyticsEvent(
  input: TrackEventInput,
): AnalyticsEvent {
  return trackEvent(input);
}

/** Record a website page view for Analytics. */
export function recordWebsitePageView(input: {
  workspaceId: string;
  siteId?: string | null;
  path?: string | null;
  visitorId?: string | null;
  userId?: string | null;
  referrer?: string | null;
  occurredAt?: string;
}): AnalyticsEvent {
  return trackEvent({
    workspaceId: input.workspaceId,
    source: "website",
    name: "page_view",
    entityType: input.siteId ? "site" : null,
    entityId: input.siteId ?? null,
    userId: input.userId ?? null,
    properties: {
      siteId: input.siteId ?? null,
      path: input.path ?? "/",
      visitorId: input.visitorId ?? null,
      referrer: input.referrer ?? null,
    },
    occurredAt: input.occurredAt,
  });
}

/** Record a user activity event (login, settings change, etc.). */
export function recordUserActivity(input: {
  workspaceId: string;
  name: string;
  userId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  properties?: Record<string, unknown>;
  occurredAt?: string;
}): AnalyticsEvent {
  return trackEvent({
    workspaceId: input.workspaceId,
    source: "user",
    name: input.name,
    userId: input.userId ?? null,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    properties: input.properties,
    occurredAt: input.occurredAt,
  });
}

/** Record an API request for API usage analytics. */
export function recordApiUsage(
  input: TrackApiRequestInput,
): AnalyticsApiRequest {
  return trackApiRequest(input);
}

/** Record an AI model invocation for AI usage analytics. */
export function recordAiUsage(input: TrackAiUsageInput): AnalyticsAiUsage {
  return trackAiUsage(input);
}
