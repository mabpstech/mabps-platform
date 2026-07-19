import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Meta App Secret used to verify WhatsApp Cloud API webhook POSTs
 * via the X-Hub-Signature-256 header.
 */
export function getWhatsAppAppSecret(): string | null {
  const secret = process.env.WHATSAPP_APP_SECRET?.trim();
  return secret || null;
}

/**
 * Verify Meta's X-Hub-Signature-256 (HMAC-SHA256 of the raw body).
 * Returns false for missing, malformed, or mismatched signatures.
 */
export function verifyWhatsAppWebhookSignature(input: {
  rawBody: string | Buffer;
  signatureHeader: string | null | undefined;
  appSecret: string;
}): boolean {
  const header = input.signatureHeader?.trim();
  if (!header || !input.appSecret) return false;

  const match = /^sha256=([a-fA-F0-9]+)$/.exec(header);
  if (!match) return false;

  const expectedHex = createHmac("sha256", input.appSecret)
    .update(input.rawBody)
    .digest("hex");
  const providedHex = match[1].toLowerCase();

  const expected = Buffer.from(expectedHex, "hex");
  const provided = Buffer.from(providedHex, "hex");
  if (expected.length !== provided.length) return false;

  return timingSafeEqual(expected, provided);
}
