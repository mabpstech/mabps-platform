import { NextResponse } from "next/server";
import { requireChatbotMemberApi } from "@/lib/chatbot/access";
import { chatbotErrorResponse } from "@/lib/chatbot/http";
import { getChatbotOverview } from "@/lib/chatbot/repository";

export async function GET() {
  try {
    const { workspace } = await requireChatbotMemberApi();
    return NextResponse.json({
      stats: getChatbotOverview(workspace.id),
    });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}
