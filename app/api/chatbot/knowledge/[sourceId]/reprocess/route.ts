import { NextResponse } from "next/server";
import { requireChatbotMemberApi } from "@/lib/chatbot/access";
import { chatbotErrorResponse } from "@/lib/chatbot/http";
import {
  getKnowledgeSourceById,
  processKnowledgeSource,
} from "@/lib/chatbot/repository";

type RouteContext = { params: Promise<{ sourceId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireChatbotMemberApi();
    const { sourceId } = await context.params;
    const existing = getKnowledgeSourceById(sourceId);
    if (!existing || existing.workspaceId !== workspace.id) {
      return NextResponse.json(
        { error: "Knowledge source not found." },
        { status: 404 },
      );
    }
    const source = await processKnowledgeSource(sourceId);
    return NextResponse.json({ source });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}
