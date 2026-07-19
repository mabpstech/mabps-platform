import { NextResponse } from "next/server";
import { processEmailWebhook } from "@/lib/email-engine/engine/webhooks";
import { emailErrorResponse } from "@/lib/email-engine/http";
import { getSettingsByWebhookSecret } from "@/lib/email-engine/repository";
import { enforcePublicRateLimit } from "@/lib/platform/rate-limit";

type Params = { params: Promise<{ secret: string }> };

export async function POST(request: Request, { params }: Params) {
  const limited = enforcePublicRateLimit(request, "webhook");
  if (limited) return limited;

  try {
    const { secret } = await params;
    const settings = getSettingsByWebhookSecret(secret);
    if (!settings) {
      return NextResponse.json({ error: "Unknown webhook." }, { status: 404 });
    }

    const payload = await request.json();
    const result = await processEmailWebhook({ payload, settings });
    return NextResponse.json(result);
  } catch (error) {
    return emailErrorResponse(error);
  }
}

export async function GET(request: Request, { params }: Params) {
  const limited = enforcePublicRateLimit(request, "webhook");
  if (limited) return limited;

  try {
    const { secret } = await params;
    const settings = getSettingsByWebhookSecret(secret);
    if (!settings) {
      return NextResponse.json({ error: "Unknown webhook." }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      workspaceId: settings.workspaceId,
      provider: settings.provider,
    });
  } catch (error) {
    return emailErrorResponse(error);
  }
}
