import { NextResponse } from "next/server";
import {
  requireWhatsAppManagerApi,
  requireWhatsAppMemberApi,
} from "@/lib/whatsapp/access";
import { whatsappErrorResponse } from "@/lib/whatsapp/http";
import {
  ensureWorkspaceWhatsApp,
  toPublicSettings,
  updateWhatsAppSettings,
} from "@/lib/whatsapp/repository";

export async function GET() {
  try {
    const { workspace } = await requireWhatsAppMemberApi();
    return NextResponse.json({
      settings: toPublicSettings(ensureWorkspaceWhatsApp(workspace.id)),
    });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { workspace } = await requireWhatsAppManagerApi();
    ensureWorkspaceWhatsApp(workspace.id);
    const body = (await request.json()) as Record<string, unknown>;

    const settings = updateWhatsAppSettings(workspace.id, {
      phoneNumberId:
        typeof body.phoneNumberId === "string" || body.phoneNumberId === null
          ? (body.phoneNumberId as string | null)
          : undefined,
      displayPhoneNumber:
        typeof body.displayPhoneNumber === "string" ||
        body.displayPhoneNumber === null
          ? (body.displayPhoneNumber as string | null)
          : undefined,
      wabaId:
        typeof body.wabaId === "string" || body.wabaId === null
          ? (body.wabaId as string | null)
          : undefined,
      accessToken:
        typeof body.accessToken === "string" && body.accessToken.trim()
          ? body.accessToken
          : undefined,
      verifyToken:
        typeof body.verifyToken === "string" || body.verifyToken === null
          ? (body.verifyToken as string | null)
          : undefined,
      apiVersion:
        typeof body.apiVersion === "string" ? body.apiVersion : undefined,
      businessName:
        typeof body.businessName === "string" || body.businessName === null
          ? (body.businessName as string | null)
          : undefined,
      isConnected:
        typeof body.isConnected === "boolean" ? body.isConnected : undefined,
      crmSyncEnabled:
        typeof body.crmSyncEnabled === "boolean"
          ? body.crmSyncEnabled
          : undefined,
      chatbotEnabled:
        typeof body.chatbotEnabled === "boolean"
          ? body.chatbotEnabled
          : undefined,
      automationEnabled:
        typeof body.automationEnabled === "boolean"
          ? body.automationEnabled
          : undefined,
      defaultChatbotBotId:
        typeof body.defaultChatbotBotId === "string" ||
        body.defaultChatbotBotId === null
          ? (body.defaultChatbotBotId as string | null)
          : undefined,
      regenerateVerifyToken: body.regenerateVerifyToken === true,
      regenerateWebhookSecret: body.regenerateWebhookSecret === true,
    });

    return NextResponse.json({ settings: toPublicSettings(settings) });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
