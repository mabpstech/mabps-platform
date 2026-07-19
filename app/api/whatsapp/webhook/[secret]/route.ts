import { NextResponse } from "next/server";
import {
  processWhatsAppWebhook,
  verifyWhatsAppWebhookChallenge,
} from "@/lib/whatsapp/engine/inbound";
import {
  ensureWhatsAppReady,
  getSettingsByWebhookSecret,
} from "@/lib/whatsapp/repository";
import {
  getWhatsAppAppSecret,
  verifyWhatsAppWebhookSignature,
} from "@/lib/whatsapp/webhook-signature";

type RouteContext = { params: Promise<{ secret: string }> };

/**
 * Optional workspace-scoped webhook path using webhookPathSecret.
 * Useful when a WABA is dedicated to one workspace.
 * POST still requires valid X-Hub-Signature-256 (WHATSAPP_APP_SECRET).
 */
export async function GET(request: Request, context: RouteContext) {
  ensureWhatsAppReady();
  const { secret } = await context.params;
  const settings = getSettingsByWebhookSecret(secret);
  if (!settings) {
    return NextResponse.json({ error: "Unknown webhook." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const result = verifyWhatsAppWebhookChallenge({
    mode: searchParams.get("hub.mode"),
    verifyToken: searchParams.get("hub.verify_token"),
    challenge: searchParams.get("hub.challenge"),
    expectedToken: settings.verifyToken,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }
  return new NextResponse(result.challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function POST(request: Request, context: RouteContext) {
  ensureWhatsAppReady();
  const { secret } = await context.params;
  const settings = getSettingsByWebhookSecret(secret);
  if (!settings) {
    return NextResponse.json({ error: "Unknown webhook." }, { status: 404 });
  }

  const appSecret = getWhatsAppAppSecret();
  if (!appSecret) {
    console.error(
      "[whatsapp/webhook/secret] WHATSAPP_APP_SECRET is not configured.",
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
    return NextResponse.json({
      ok: true,
      workspaceId: settings.workspaceId,
      ...result,
    });
  } catch (error) {
    console.error("[whatsapp/webhook/secret]", error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
