import type { BillingInterval, PlanId } from "@/lib/billing/engine/plans";

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

export type RazorpayCredentials = {
  keyId: string;
  keySecret: string;
};

export function getRazorpayCredentials(): RazorpayCredentials | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    return null;
  }
  return { keyId, keySecret };
}

export function isRazorpayConfigured(): boolean {
  return getRazorpayCredentials() !== null;
}

export function requireRazorpayCredentials(): RazorpayCredentials {
  const credentials = getRazorpayCredentials();
  if (!credentials) {
    throw new Error(
      "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are not configured.",
    );
  }
  return credentials;
}

/**
 * Resolve Razorpay Plan ID for a paid plan + interval from environment.
 * Free has no Razorpay plan.
 */
export function getRazorpayPlanId(
  planId: PlanId,
  interval: BillingInterval,
): string | null {
  if (planId === "free") {
    return null;
  }

  const envKey = `RAZORPAY_PLAN_${planId.toUpperCase()}_${interval.toUpperCase()}`;
  const value = process.env[envKey]?.trim();
  return value || null;
}

type RazorpayErrorBody = {
  error?: {
    description?: string;
    code?: string;
  };
};

export async function razorpayRequest<T>(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const { keyId, keySecret } = requireRazorpayCredentials();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const url = `${RAZORPAY_API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const raw = (await response.json().catch(() => ({}))) as T & RazorpayErrorBody;

  if (!response.ok) {
    const message =
      raw.error?.description ||
      `Razorpay request failed (${response.status} ${method} ${path}).`;
    throw new Error(message);
  }

  return raw;
}
