import { NextResponse } from "next/server";
import { requireAiMemberApi } from "@/lib/ai/access";
import {
  aiErrorResponse,
  parseAiListFilters,
  parseAiProvider,
} from "@/lib/ai/http";
import {
  createConversation,
  ensureWorkspaceAi,
  listConversations,
} from "@/lib/ai/repository";

export async function GET(request: Request) {
  try {
    const { workspace, session } = await requireAiMemberApi();
    ensureWorkspaceAi(workspace.id);
    const filters = parseAiListFilters(new URL(request.url).searchParams);
    return NextResponse.json({
      conversations: listConversations(workspace.id, {
        ...filters,
        userId: session.user.id,
      }),
    });
  } catch (error) {
    return aiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace, session } = await requireAiMemberApi();
    ensureWorkspaceAi(workspace.id);
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const provider =
      body.provider !== undefined ? parseAiProvider(body.provider) : null;
    if (body.provider !== undefined && body.provider !== null && !provider) {
      return NextResponse.json(
        { error: "provider must be openai, gemini, or openrouter." },
        { status: 400 },
      );
    }

    const conversation = createConversation({
      workspaceId: workspace.id,
      userId: session.user.id,
      title: typeof body.title === "string" ? body.title : undefined,
      provider,
      model: typeof body.model === "string" ? body.model : undefined,
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
