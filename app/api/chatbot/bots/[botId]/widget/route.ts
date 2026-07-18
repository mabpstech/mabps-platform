import { NextResponse } from "next/server";
import { requireChatbotMemberApi } from "@/lib/chatbot/access";
import { chatbotErrorResponse } from "@/lib/chatbot/http";
import {
  getBotById,
  getWidgetByBotId,
  updateWidget,
} from "@/lib/chatbot/repository";
import type { WidgetPosition } from "@/lib/chatbot/types";

type RouteContext = { params: Promise<{ botId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireChatbotMemberApi();
    const { botId } = await context.params;
    const bot = getBotById(botId);
    if (!bot || bot.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Bot not found." }, { status: 404 });
    }
    return NextResponse.json({ widget: getWidgetByBotId(botId) });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireChatbotMemberApi();
    const { botId } = await context.params;
    const bot = getBotById(botId);
    if (!bot || bot.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Bot not found." }, { status: 404 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const origins =
      Array.isArray(body.allowedOrigins)
        ? body.allowedOrigins.filter(
            (value): value is string => typeof value === "string",
          )
        : body.allowedOrigins === null
          ? null
          : undefined;

    const widget = updateWidget(botId, workspace.id, {
      title: typeof body.title === "string" ? body.title : undefined,
      primaryColor:
        typeof body.primaryColor === "string" ? body.primaryColor : undefined,
      position:
        typeof body.position === "string"
          ? (body.position as WidgetPosition)
          : undefined,
      launcherLabel:
        typeof body.launcherLabel === "string"
          ? body.launcherLabel
          : undefined,
      allowedOrigins: origins,
      isEnabled:
        typeof body.isEnabled === "boolean" ? body.isEnabled : undefined,
    });
    return NextResponse.json({ widget });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}
