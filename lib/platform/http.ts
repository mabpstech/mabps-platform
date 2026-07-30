import { NextResponse } from "next/server";
import { PlatformAuthError } from "@/lib/platform/access";

export type PlatformErrorResponseOptions = {
  /** Log prefix, e.g. "crm" */
  label: string;
  /** Fallback when error is not an Error instance */
  fallback: string;
  /**
   * Extra status mapping rules, evaluated after built-in heuristics
   * (first match wins among extras).
   */
  extraRules?: Array<{
    test: (message: string) => boolean;
    status: number;
  }>;
};

/**
 * Unified JSON error envelope + status heuristics for module API routes.
 */
export function platformErrorResponse(
  error: unknown,
  options: PlatformErrorResponseOptions,
) {
  if (error instanceof PlatformAuthError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  const message =
    error instanceof Error ? error.message : options.fallback;

  // Default to 500 for unexpected failures; map known client/ops cases below.
  let status = 500;
  let matched = false;

  if (
    message.includes("Authentication required") ||
    message.includes("Unauthorized") ||
    message.includes("Invalid API key")
  ) {
    status = 401;
    matched = true;
  } else if (
    message.includes("not found") ||
    message.includes("Not found")
  ) {
    status = 404;
    matched = true;
  } else if (
    message.includes("Plan limit") ||
    message.includes("plan allows") ||
    message.includes("Upgrade to continue") ||
    message.includes("requires the")
  ) {
    status = 402;
    matched = true;
  } else if (
    message.includes("permission") ||
    message.includes("Permission") ||
    message.includes("denied") ||
    message.includes("Forbidden")
  ) {
    status = 403;
    matched = true;
  } else if (
    message.includes("not configured") ||
    message.includes("Storage quota") ||
    message.includes("Stripe price")
  ) {
    status = 503;
    matched = true;
  } else if (message.includes("not implemented")) {
    status = 501;
    matched = true;
  } else if (
    message.includes("required") ||
    message.includes("invalid") ||
    message.includes("Invalid") ||
    message.includes("must be") ||
    message.includes("Unsupported") ||
    message.includes("too long") ||
    message.includes("Too many")
  ) {
    status = 400;
    matched = true;
  } else if (options.extraRules) {
    for (const rule of options.extraRules) {
      if (rule.test(message)) {
        status = rule.status;
        matched = true;
        break;
      }
    }
  }

  console.error(`[${options.label}]`, {
    status,
    matched,
    message,
    error:
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error,
  });
  return NextResponse.json(
    { error: status >= 500 ? options.fallback : message },
    { status },
  );
}

/** Shared pagination clamp used by list filter parsers. */
export function parsePagination(searchParams: URLSearchParams): {
  limit?: number;
  offset?: number;
} {
  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  const offset = offsetRaw ? Number(offsetRaw) : undefined;

  return {
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
