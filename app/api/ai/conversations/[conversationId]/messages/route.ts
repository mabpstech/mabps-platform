import { NextResponse } from "next/server";
import { requireAiMemberApi } from "@/lib/ai/access";
import { handleAssistantMessage } from "@/lib/ai/engine/chat";
import { aiErrorResponse, parseAiProvider } from "@/lib/ai/http";
import {
  getConversationById,
  listMessages,
} from "@/lib/ai/repository";

type RouteContext = { params: Promise<{ conversationId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace, session } = await requireAiMemberApi();
    const { conversationId } = await context.params;
    const conversation = getConversationById(conversationId);
    if (
      !conversation ||
      conversation.workspaceId !== workspace.id ||
      conversation.userId !== session.user.id
    ) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({ messages: listMessages(conversation.id) });
  } catch (error) {
    return aiErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { workspace, session } = await requireAiMemberApi();
    const { conversationId } = await context.params;
    const conversation = getConversationById(conversationId);
    if (
      !conversation ||
      conversation.workspaceId !== workspace.id ||
      conversation.userId !== session.user.id
    ) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.content !== "string" || !body.content.trim()) {
      return NextResponse.json(
        { error: "content is required." },
        { status: 400 },
      );
    }

    const provider =
      body.provider !== undefined ? parseAiProvider(body.provider) : undefined;
    if (body.provider !== undefined && body.provider !== null && !provider) {
      return NextResponse.json(
        { error: "provider must be openai, gemini, or openrouter." },
        { status: 400 },
      );
    }

    const result = await handleAssistantMessage({
      conversationId,
      workspaceId: workspace.id,
      userId: session.user.id,
      content: body.content,
      provider,
      model: typeof body.model === "string" ? body.model : undefined,
      workspaceName: workspace.name,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
