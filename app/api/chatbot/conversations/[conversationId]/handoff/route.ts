import { NextResponse } from "next/server";
import { requireChatbotMemberApi } from "@/lib/chatbot/access";
import { chatbotErrorResponse } from "@/lib/chatbot/http";
import {
  claimHandoff,
  createHandoff,
  getConversationById,
  getOpenHandoff,
  resolveHandoff,
} from "@/lib/chatbot/repository";

type RouteContext = { params: Promise<{ conversationId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { workspace, session } = await requireChatbotMemberApi();
    const { conversationId } = await context.params;
    const conversation = getConversationById(conversationId);
    if (!conversation || conversation.workspaceId !== workspace.id) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const action =
      typeof body.action === "string" ? body.action : "request";

    if (action === "request") {
      const handoff = createHandoff({
        conversationId,
        botId: conversation.botId,
        workspaceId: workspace.id,
        reason: typeof body.reason === "string" ? body.reason : null,
      });
      return NextResponse.json({ handoff }, { status: 201 });
    }

    if (action === "claim") {
      const open = getOpenHandoff(conversationId);
      if (!open) {
        return NextResponse.json(
          { error: "No open handoff." },
          { status: 404 },
        );
      }
      const handoff = claimHandoff(open.id, workspace.id, session.user.id);
      return NextResponse.json({ handoff });
    }

    if (action === "resolve") {
      const open = getOpenHandoff(conversationId);
      if (!open) {
        return NextResponse.json(
          { error: "No open handoff." },
          { status: 404 },
        );
      }
      const handoff = resolveHandoff(
        open.id,
        workspace.id,
        body.resumeAi !== false,
      );
      return NextResponse.json({ handoff });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}
