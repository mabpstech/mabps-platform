import { NextResponse } from "next/server";
import {
  processWhatsAppWebhook,
  verifyWhatsAppWebhookChallenge,
} from "@/lib/whatsapp/engine/inbound";
import {
  ensureWhatsAppReady,
  getSettingsByWebhookSecret,
} from "@/lib/whatsapp/repository";

type RouteContext = { params: Promise<{ secret: string }> };

/**
 * Optional workspace-scoped webhook path using webhookPathSecret.
 * Useful when a WABA is dedicated to one workspace.
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

  try {
    const payload = await request.json();
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
