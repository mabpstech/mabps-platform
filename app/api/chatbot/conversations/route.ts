import { NextResponse } from "next/server";
import { requireChatbotMemberApi } from "@/lib/chatbot/access";
import {
  chatbotErrorResponse,
  parseChatbotListFilters,
} from "@/lib/chatbot/http";
import { listConversations } from "@/lib/chatbot/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireChatbotMemberApi();
    const filters = parseChatbotListFilters(
      new URL(request.url).searchParams,
    );
    return NextResponse.json({
      conversations: listConversations(workspace.id, filters),
    });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}
