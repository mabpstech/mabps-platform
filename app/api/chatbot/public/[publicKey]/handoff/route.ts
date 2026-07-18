import { NextResponse } from "next/server";
import { chatbotErrorResponse } from "@/lib/chatbot/http";
import {
  createHandoff,
  createMessage,
  ensureChatbotReady,
  getBotByPublicKey,
  getConversationById,
} from "@/lib/chatbot/repository";

type RouteContext = { params: Promise<{ publicKey: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    ensureChatbotReady();
    const { publicKey } = await context.params;
    const bot = getBotByPublicKey(publicKey);
    if (!bot || bot.status !== "active") {
      return NextResponse.json({ error: "Bot not found." }, { status: 404 });
    }
    if (!bot.handoffEnabled) {
      return NextResponse.json(
        { error: "Human handoff is disabled." },
        { status: 400 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.conversationId !== "string") {
      return NextResponse.json(
        { error: "conversationId is required." },
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

    const handoff = createHandoff({
      conversationId: conversation.id,
      botId: bot.id,
      workspaceId: bot.workspaceId,
      reason: typeof body.reason === "string" ? body.reason : null,
    });

    createMessage({
      conversationId: conversation.id,
      botId: bot.id,
      workspaceId: bot.workspaceId,
      role: "assistant",
      content:
        "Thanks — a human teammate has been notified and will join shortly.",
      channel: conversation.channel,
      metadata: { handoff: true },
    });

    return NextResponse.json({ handoff }, { status: 201 });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}
