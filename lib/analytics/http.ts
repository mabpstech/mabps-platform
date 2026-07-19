import { platformErrorResponse } from "@/lib/platform/http";
import { DEFAULT_DATE_RANGE } from "@/lib/analytics/defaults";
import {
  ANALYTICS_DATE_RANGES,
  ANALYTICS_EXPORT_FORMATS,
  ANALYTICS_REPORTS,
  ANALYTICS_SOURCES,
  type AnalyticsDateRange,
  type AnalyticsExportFormat,
  type AnalyticsReportId,
  type AnalyticsSource,
} from "@/lib/analytics/types";

export function analyticsErrorResponse(error: unknown) {
  return platformErrorResponse(error, {
    label: "analytics",
    fallback: "Unexpected Analytics error.",
  });
}

export function parseAnalyticsDateRange(
  value: string | null | undefined,
): AnalyticsDateRange {
  if (
    value &&
    ANALYTICS_DATE_RANGES.includes(value as AnalyticsDateRange)
  ) {
    return value as AnalyticsDateRange;
  }
  return DEFAULT_DATE_RANGE;
}

export function parseAnalyticsSource(
  value: unknown,
): AnalyticsSource | null {
  if (typeof value !== "string") return null;
  return ANALYTICS_SOURCES.includes(value as AnalyticsSource)
    ? (value as AnalyticsSource)
    : null;
}

export function parseAnalyticsReport(
  value: string | null | undefined,
): AnalyticsReportId | null {
  if (!value) return null;
  return ANALYTICS_REPORTS.includes(value as AnalyticsReportId)
    ? (value as AnalyticsReportId)
    : null;
}

export function parseAnalyticsExportFormat(
  value: string | null | undefined,
): AnalyticsExportFormat | null {
  if (!value) return null;
  return ANALYTICS_EXPORT_FORMATS.includes(value as AnalyticsExportFormat)
    ? (value as AnalyticsExportFormat)
    : null;
}

export function parseAnalyticsListFilters(searchParams: URLSearchParams) {
  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  const offset = offsetRaw ? Number(offsetRaw) : undefined;

  return {
    source: searchParams.get("source")?.trim() || undefined,
    name: searchParams.get("name")?.trim() || undefined,
    from: searchParams.get("from")?.trim() || undefined,
    to: searchParams.get("to")?.trim() || undefined,
    userId: searchParams.get("userId")?.trim() || undefined,
    range: parseAnalyticsDateRange(searchParams.get("range")),
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
