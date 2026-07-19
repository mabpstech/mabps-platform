import { NextResponse } from "next/server";
import { requireAiMemberApi } from "@/lib/ai/access";
import { aiErrorResponse, parseAiProvider } from "@/lib/ai/http";
import {
  deleteConversation,
  getConversationById,
  listMessages,
  updateConversation,
} from "@/lib/ai/repository";
import { AI_CONVERSATION_STATUSES } from "@/lib/ai/types";

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
    return NextResponse.json({
      conversation,
      messages: listMessages(conversation.id),
    });
  } catch (error) {
    return aiErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace, session } = await requireAiMemberApi();
    const { conversationId } = await context.params;
    const existing = getConversationById(conversationId);
    if (
      !existing ||
      existing.workspaceId !== workspace.id ||
      existing.userId !== session.user.id
    ) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const provider =
      body.provider !== undefined ? parseAiProvider(body.provider) : undefined;
    if (body.provider !== undefined && body.provider !== null && !provider) {
      return NextResponse.json(
        { error: "provider must be openai, gemini, or openrouter." },
        { status: 400 },
      );
    }

    const status =
      typeof body.status === "string" &&
      AI_CONVERSATION_STATUSES.includes(
        body.status as (typeof AI_CONVERSATION_STATUSES)[number],
      )
        ? (body.status as (typeof AI_CONVERSATION_STATUSES)[number])
        : undefined;

    const conversation = updateConversation(conversationId, workspace.id, {
      title: typeof body.title === "string" ? body.title : undefined,
      provider: body.provider === null ? null : provider,
      model:
        typeof body.model === "string" || body.model === null
          ? (body.model as string | null)
          : undefined,
      status,
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    return aiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { workspace, session } = await requireAiMemberApi();
    const { conversationId } = await context.params;
    const existing = getConversationById(conversationId);
    if (
      !existing ||
      existing.workspaceId !== workspace.id ||
      existing.userId !== session.user.id
    ) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }
    deleteConversation(conversationId, workspace.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
