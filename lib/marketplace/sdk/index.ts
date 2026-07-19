import { createHash, randomBytes } from "node:crypto";
import { SDK_SCOPES } from "@/lib/marketplace/defaults";
import type { MarketplaceApiKey } from "@/lib/marketplace/types";

export type SdkScope = (typeof SDK_SCOPES)[number];

export function isSdkScope(value: string): value is SdkScope {
  return (SDK_SCOPES as readonly string[]).includes(value);
}

export function normalizeSdkScopes(values: unknown): SdkScope[] {
  if (!Array.isArray(values)) return ["listings:read"];
  const unique = new Set<SdkScope>();
  for (const value of values) {
    if (typeof value === "string" && isSdkScope(value)) {
      unique.add(value);
    }
  }
  if (!unique.size) unique.add("listings:read");
  return [...unique];
}

export function generateApiKeyPlaintext(): {
  plaintext: string;
  prefix: string;
  hash: string;
} {
  const secret = randomBytes(24).toString("base64url");
  const plaintext = `mabps_mk_${secret}`;
  const prefix = plaintext.slice(0, 16);
  return {
    plaintext,
    prefix,
    hash: hashApiKey(plaintext),
  };
}

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export function assertApiKeyActive(key: MarketplaceApiKey): void {
  if (key.revokedAt) {
    throw new Error("API key has been revoked.");
  }
}

export function assertApiKeyScope(
  key: MarketplaceApiKey,
  scope: SdkScope,
): void {
  assertApiKeyActive(key);
  if (!key.scopes.includes(scope)) {
    throw new Error(`API key missing required scope: ${scope}.`);
  }
}

/** Public SDK helper docs for the dashboard. */
export const SDK_QUICKSTART = {
  baseUrl: "/api/marketplace",
  authHeader: "Authorization: Bearer mabps_mk_…",
  endpoints: [
    {
      method: "GET",
      path: "/catalog",
      scope: "listings:read",
      description: "List published marketplace listings.",
    },
    {
      method: "POST",
      path: "/developer/listings",
      scope: "listings:write",
      description: "Publish or update a workspace-owned listing.",
    },
    {
      method: "POST",
      path: "/developer/listings/:id/versions",
      scope: "versions:write",
      description: "Publish a new listing version.",
    },
    {
      method: "POST",
      path: "/plugin/:slug",
      scope: "listings:read",
      description: "Invoke the Plugin API for an installed listing.",
    },
  ],
} as const;
