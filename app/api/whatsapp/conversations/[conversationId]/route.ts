import { NextResponse } from "next/server";
import { requireWhatsAppMemberApi } from "@/lib/whatsapp/access";
import { whatsappErrorResponse } from "@/lib/whatsapp/http";
import {
  getConversationById,
  listMessages,
  updateConversation,
} from "@/lib/whatsapp/repository";
import {
  WHATSAPP_CONVERSATION_STATUSES,
  type WhatsAppConversationStatus,
} from "@/lib/whatsapp/types";

type RouteContext = { params: Promise<{ conversationId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWhatsAppMemberApi();
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
      messages: listMessages(workspace.id, {
        conversationId,
        limit: 500,
      }),
    });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWhatsAppMemberApi();
    const { conversationId } = await context.params;
    const conversation = getConversationById(conversationId);
    if (!conversation || conversation.workspaceId !== workspace.id) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }
    const body = (await request.json()) as Record<string, unknown>;
    const status =
      typeof body.status === "string" &&
      WHATSAPP_CONVERSATION_STATUSES.includes(
        body.status as WhatsAppConversationStatus,
      )
        ? (body.status as WhatsAppConversationStatus)
        : undefined;
    return NextResponse.json({
      conversation: updateConversation(conversationId, workspace.id, {
        status,
      }),
    });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
