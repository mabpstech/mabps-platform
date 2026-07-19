import { NextResponse } from "next/server";
import {
  processWhatsAppWebhook,
  verifyWhatsAppWebhookChallenge,
} from "@/lib/whatsapp/engine/inbound";
import {
  ensureWhatsAppReady,
  getSettingsByVerifyToken,
} from "@/lib/whatsapp/repository";
import {
  getWhatsAppAppSecret,
  verifyWhatsAppWebhookSignature,
} from "@/lib/whatsapp/webhook-signature";

/**
 * Meta Cloud API webhook (multi-tenant).
 * GET: hub challenge verification via workspace verifyToken.
 * POST: inbound messages + delivery status updates keyed by phoneNumberId.
 *       Requires valid X-Hub-Signature-256 (WHATSAPP_APP_SECRET).
 */
export async function GET(request: Request) {
  ensureWhatsAppReady();
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const verifyToken = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const settings = verifyToken ? getSettingsByVerifyToken(verifyToken) : null;
  const result = verifyWhatsAppWebhookChallenge({
    mode,
    verifyToken,
    challenge,
    expectedToken: settings?.verifyToken || null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }
  return new NextResponse(result.challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function POST(request: Request) {
  ensureWhatsAppReady();

  const appSecret = getWhatsAppAppSecret();
  if (!appSecret) {
    console.error(
      "[whatsapp/webhook] WHATSAPP_APP_SECRET is not configured.",
    );
    return NextResponse.json(
      { error: "Webhook signature verification is not configured." },
      { status: 500 },
    );
  }

  const signatureHeader = request.headers.get("x-hub-signature-256");
  const rawBody = await request.text();

  if (
    !verifyWhatsAppWebhookSignature({
      rawBody,
      signatureHeader,
      appSecret,
    })
  ) {
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 401 },
    );
  }

  try {
    const payload = JSON.parse(rawBody) as unknown;
    const result = await processWhatsAppWebhook(payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[whatsapp/webhook]", error);
    // Always 200 to Meta after accept to avoid endless retries on app bugs.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
