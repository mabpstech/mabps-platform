import { platformErrorResponse } from "@/lib/platform/http";
import {
  GUARDIAN_CHECK_CATEGORIES,
  GUARDIAN_FINDING_STATUSES,
  GUARDIAN_REPAIR_STATUSES,
  GUARDIAN_SCAN_STATUSES,
  GUARDIAN_SEVERITIES,
  type GuardianCheckCategory,
  type GuardianFindingStatus,
  type GuardianRepairStatus,
  type GuardianScanStatus,
  type GuardianSeverity,
} from "@/lib/guardian/types";

export function guardianErrorResponse(error: unknown) {
  return platformErrorResponse(error, {
    label: "guardian",
    fallback: "Unexpected Guardian error.",
  });
}

export function parseGuardianListFilters(searchParams: URLSearchParams) {
  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  const offset = offsetRaw ? Number(offsetRaw) : undefined;

  return {
    q: searchParams.get("q")?.trim() || undefined,
    status: searchParams.get("status")?.trim() || undefined,
    category: searchParams.get("category")?.trim() || undefined,
    severity: searchParams.get("severity")?.trim() || undefined,
    scanId: searchParams.get("scanId")?.trim() || undefined,
    findingId: searchParams.get("findingId")?.trim() || undefined,
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

export function parseGuardianCategory(
  value: unknown,
): GuardianCheckCategory | null {
  if (typeof value !== "string") return null;
  return GUARDIAN_CHECK_CATEGORIES.includes(value as GuardianCheckCategory)
    ? (value as GuardianCheckCategory)
    : null;
}

export function parseGuardianSeverity(value: unknown): GuardianSeverity | null {
  if (typeof value !== "string") return null;
  return GUARDIAN_SEVERITIES.includes(value as GuardianSeverity)
    ? (value as GuardianSeverity)
    : null;
}

export function parseGuardianScanStatus(
  value: unknown,
): GuardianScanStatus | null {
  if (typeof value !== "string") return null;
  return GUARDIAN_SCAN_STATUSES.includes(value as GuardianScanStatus)
    ? (value as GuardianScanStatus)
    : null;
}

export function parseGuardianFindingStatus(
  value: unknown,
): GuardianFindingStatus | null {
  if (typeof value !== "string") return null;
  return GUARDIAN_FINDING_STATUSES.includes(value as GuardianFindingStatus)
    ? (value as GuardianFindingStatus)
    : null;
}

export function parseGuardianRepairStatus(
  value: unknown,
): GuardianRepairStatus | null {
  if (typeof value !== "string") return null;
  return GUARDIAN_REPAIR_STATUSES.includes(value as GuardianRepairStatus)
    ? (value as GuardianRepairStatus)
    : null;
}

export function parseGuardianCategories(
  value: unknown,
): GuardianCheckCategory[] | null {
  if (!Array.isArray(value)) return null;
  const categories = value
    .map((item) => parseGuardianCategory(item))
    .filter((item): item is GuardianCheckCategory => Boolean(item));
  return categories.length ? categories : null;
}
