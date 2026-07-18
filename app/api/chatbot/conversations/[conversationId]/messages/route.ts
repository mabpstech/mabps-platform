import { NextResponse } from "next/server";
import { requireChatbotMemberApi } from "@/lib/chatbot/access";
import { handleAgentReply } from "@/lib/chatbot/engine/chat";
import { chatbotErrorResponse } from "@/lib/chatbot/http";
import {
  getConversationById,
  listMessages,
} from "@/lib/chatbot/repository";

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
    return NextResponse.json({ messages: listMessages(conversationId) });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { workspace, session } = await requireChatbotMemberApi();
    const { conversationId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.content !== "string" || !body.content.trim()) {
      return NextResponse.json(
        { error: "content is required." },
        { status: 400 },
      );
    }

    const message = await handleAgentReply({
      conversationId,
      workspaceId: workspace.id,
      agentUserId: session.user.id,
      content: body.content,
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}
