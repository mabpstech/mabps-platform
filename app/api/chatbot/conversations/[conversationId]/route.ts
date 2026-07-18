import { NextResponse } from "next/server";
import { requireChatbotMemberApi } from "@/lib/chatbot/access";
import { chatbotErrorResponse } from "@/lib/chatbot/http";
import {
  getBotById,
  getConversationById,
  getOpenHandoff,
  listMessages,
  updateConversation,
} from "@/lib/chatbot/repository";
import type { ConversationStatus } from "@/lib/chatbot/types";

type RouteContext = { params: Promise<{ conversationId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireChatbotMemberApi();
    const { conversationId } = await context.params;
    const conversation = getConversationById(conversationId);
    if (!conversation || conversation.workspaceId !== workspace.id) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({
      conversation,
      bot: getBotById(conversation.botId),
      messages: listMessages(conversation.id),
      handoff: getOpenHandoff(conversation.id),
    });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireChatbotMemberApi();
    const { conversationId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const conversation = updateConversation(conversationId, workspace.id, {
      status:
        typeof body.status === "string"
          ? (body.status as ConversationStatus)
          : undefined,
      visitorName:
        typeof body.visitorName === "string" || body.visitorName === null
          ? (body.visitorName as string | null)
          : undefined,
      visitorEmail:
        typeof body.visitorEmail === "string" || body.visitorEmail === null
          ? (body.visitorEmail as string | null)
          : undefined,
      visitorPhone:
        typeof body.visitorPhone === "string" || body.visitorPhone === null
          ? (body.visitorPhone as string | null)
          : undefined,
    });
    return NextResponse.json({ conversation });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}
