import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { chatbotErrorResponse } from "@/lib/chatbot/http";
import {
  createConversation,
  createMessage,
  ensureChatbotReady,
  getBotByPublicKey,
  getConversationById,
  getWidgetByBotId,
  listMessages,
} from "@/lib/chatbot/repository";
import { enforcePublicRateLimit } from "@/lib/platform/rate-limit";

type RouteContext = { params: Promise<{ publicKey: string }> };

export async function POST(request: Request, context: RouteContext) {
  const limited = enforcePublicRateLimit(request, "chatbotWrite");
  if (limited) return limited;

  try {
    ensureChatbotReady();
    const { publicKey } = await context.params;
    const bot = getBotByPublicKey(publicKey);
    if (!bot || bot.status !== "active") {
      return NextResponse.json({ error: "Bot not found." }, { status: 404 });
    }
    const widget = getWidgetByBotId(bot.id);
    if (!widget?.isEnabled) {
      return NextResponse.json(
        { error: "Widget is disabled." },
        { status: 404 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const conversationId =
      typeof body.conversationId === "string" ? body.conversationId : null;

    if (conversationId) {
      const existing = getConversationById(conversationId);
      if (
        existing &&
        existing.botId === bot.id &&
        existing.workspaceId === bot.workspaceId
      ) {
        return NextResponse.json({
          conversation: existing,
          messages: listMessages(existing.id),
        });
      }
    }

    const visitorId =
      typeof body.visitorId === "string" && body.visitorId.trim()
        ? body.visitorId.trim()
        : randomUUID();

    const conversation = createConversation({
      botId: bot.id,
      workspaceId: bot.workspaceId,
      channel: "widget",
      visitorId,
      visitorName:
        typeof body.visitorName === "string" ? body.visitorName : null,
      visitorEmail:
        typeof body.visitorEmail === "string" ? body.visitorEmail : null,
      visitorPhone:
        typeof body.visitorPhone === "string" ? body.visitorPhone : null,
      metadata: {
        userAgent: request.headers.get("user-agent"),
        origin: request.headers.get("origin"),
      },
    });

    createMessage({
      conversationId: conversation.id,
      botId: bot.id,
      workspaceId: bot.workspaceId,
      role: "assistant",
      content: bot.welcomeMessage,
      channel: "widget",
      metadata: { welcome: true },
    });

    return NextResponse.json(
      {
        conversation,
        messages: listMessages(conversation.id),
      },
      { status: 201 },
    );
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}
