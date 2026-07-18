import { NextResponse } from "next/server";
import {
  requireChatbotManagerApi,
  requireChatbotMemberApi,
} from "@/lib/chatbot/access";
import { chatbotErrorResponse } from "@/lib/chatbot/http";
import {
  deleteBot,
  getBotById,
  getWidgetByBotId,
  listChannels,
  updateBot,
} from "@/lib/chatbot/repository";
import type { AiProviderId, BotStatus } from "@/lib/chatbot/types";

type RouteContext = { params: Promise<{ botId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireChatbotMemberApi();
    const { botId } = await context.params;
    const bot = getBotById(botId);
    if (!bot || bot.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Bot not found." }, { status: 404 });
    }
    return NextResponse.json({
      bot,
      widget: getWidgetByBotId(bot.id),
      channels: listChannels(bot.id),
    });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireChatbotMemberApi();
    const { botId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const bot = updateBot(botId, workspace.id, {
      name: typeof body.name === "string" ? body.name : undefined,
      description:
        typeof body.description === "string" || body.description === null
          ? (body.description as string | null)
          : undefined,
      systemPrompt:
        typeof body.systemPrompt === "string" ? body.systemPrompt : undefined,
      welcomeMessage:
        typeof body.welcomeMessage === "string"
          ? body.welcomeMessage
          : undefined,
      fallbackMessage:
        typeof body.fallbackMessage === "string"
          ? body.fallbackMessage
          : undefined,
      provider:
        typeof body.provider === "string"
          ? (body.provider as AiProviderId)
          : undefined,
      model:
        typeof body.model === "string" || body.model === null
          ? (body.model as string | null)
          : undefined,
      temperature:
        typeof body.temperature === "number" ? body.temperature : undefined,
      status:
        typeof body.status === "string"
          ? (body.status as BotStatus)
          : undefined,
      leadCaptureEnabled:
        typeof body.leadCaptureEnabled === "boolean"
          ? body.leadCaptureEnabled
          : undefined,
      handoffEnabled:
        typeof body.handoffEnabled === "boolean"
          ? body.handoffEnabled
          : undefined,
      memoryEnabled:
        typeof body.memoryEnabled === "boolean"
          ? body.memoryEnabled
          : undefined,
    });
    return NextResponse.json({ bot });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireChatbotManagerApi();
    const { botId } = await context.params;
    deleteBot(botId, workspace.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}
