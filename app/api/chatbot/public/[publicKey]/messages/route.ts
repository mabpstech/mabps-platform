import { NextResponse } from "next/server";
import { handleVisitorMessage } from "@/lib/chatbot/engine/chat";
import { chatbotErrorResponse } from "@/lib/chatbot/http";
import {
  ensureChatbotReady,
  getBotByPublicKey,
  getConversationById,
  getWidgetByBotId,
  listMessages,
} from "@/lib/chatbot/repository";

type RouteContext = { params: Promise<{ publicKey: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    ensureChatbotReady();
    const { publicKey } = await context.params;
    const bot = getBotByPublicKey(publicKey);
    if (!bot || bot.status !== "active") {
      return NextResponse.json({ error: "Bot not found." }, { status: 404 });
    }
    const conversationId = new URL(request.url).searchParams.get(
      "conversationId",
    );
    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required." },
        { status: 400 },
      );
    }
    const conversation = getConversationById(conversationId);
    if (!conversation || conversation.botId !== bot.id) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({
      conversation,
      messages: listMessages(conversationId),
    });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
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

    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.conversationId !== "string") {
      return NextResponse.json(
        { error: "conversationId is required." },
        { status: 400 },
      );
    }
    if (typeof body.content !== "string" || !body.content.trim()) {
      return NextResponse.json(
        { error: "content is required." },
        { status: 400 },
      );
    }

    const conversation = getConversationById(body.conversationId);
    if (!conversation || conversation.botId !== bot.id) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }

    const result = await handleVisitorMessage({
      conversationId: conversation.id,
      content: body.content,
    });

    return NextResponse.json({
      conversation: result.conversation,
      userMessage: result.userMessage,
      assistantMessage: result.assistantMessage,
      handoffRequested: result.handoffRequested,
      messages: listMessages(conversation.id),
    });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}
