/**
 * Public chatbot visitor session binding.
 * Plaintext secret is issued once at session create; only SHA-256 hash is stored.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sqlite } from "@/lib/db";

export const VISITOR_SESSION_HEADER = "x-mabps-chatbot-session";

export function generateVisitorSessionSecret(): {
  secret: string;
  hash: string;
} {
  const secret = `cbs_${randomBytes(24).toString("hex")}`;
  return { secret, hash: hashVisitorSessionSecret(secret) };
}

export function hashVisitorSessionSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

export function getVisitorSessionSecretHash(
  conversationId: string,
): string | null {
  const row = sqlite
    .prepare(
      `SELECT "visitorSessionSecretHash" FROM "chatbot_conversation" WHERE "id" = ?`,
    )
    .get(conversationId) as
    | { visitorSessionSecretHash: string | null }
    | undefined;
  const hash = row?.visitorSessionSecretHash;
  return typeof hash === "string" && hash.length > 0 ? hash : null;
}

export function visitorSessionSecretsMatch(
  storedHash: string | null | undefined,
  provided: string | null | undefined,
): boolean {
  if (!storedHash || !provided) return false;
  const a = Buffer.from(storedHash, "utf8");
  const b = Buffer.from(hashVisitorSessionSecret(provided), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Read secret from header, body, or query (never log the value). */
export function readVisitorSessionSecret(input: {
  request: Request;
  body?: Record<string, unknown> | null;
  searchParams?: URLSearchParams;
}): string | null {
  const header = input.request.headers.get(VISITOR_SESSION_HEADER)?.trim();
  if (header) return header;

  const fromBody = input.body?.sessionSecret;
  if (typeof fromBody === "string" && fromBody.trim()) return fromBody.trim();

  const fromQuery = input.searchParams?.get("sessionSecret")?.trim();
  return fromQuery || null;
}

/**
 * Authorize public access to a conversation transcript/actions.
 * Conversations without a stored hash (legacy / non-widget) are denied.
 */
export function assertVisitorSessionAccess(input: {
  conversationId: string;
  request: Request;
  body?: Record<string, unknown> | null;
  searchParams?: URLSearchParams;
}): NextResponse | null {
  const storedHash = getVisitorSessionSecretHash(input.conversationId);
  const provided = readVisitorSessionSecret(input);
  if (!visitorSessionSecretsMatch(storedHash, provided)) {
    return NextResponse.json(
      { error: "Invalid or missing session secret." },
      { status: 401 },
    );
  }
  return null;
}
