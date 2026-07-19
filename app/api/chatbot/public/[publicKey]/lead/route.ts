import { NextResponse } from "next/server";
import { ensureCrmLeadForConversation } from "@/lib/chatbot/engine/leads";
import { chatbotErrorResponse } from "@/lib/chatbot/http";
import {
  ensureChatbotReady,
  getBotByPublicKey,
  getConversationById,
} from "@/lib/chatbot/repository";
import { enforcePublicRateLimit } from "@/lib/platform/rate-limit";

type RouteContext = { params: Promise<{ publicKey: string }> };

export async function POST(request: Request, context: RouteContext) {
  const limited = enforcePublicRateLimit(request, "chatbotWrite");
  if (limited) return limited;

  try {
    ensureChatbotReady();
    const { publicKey } = await context.params;
    const bot = getBotByPublicKey(publicKey);
    if (!bot || bot.status !== "active") {
      return NextResponse.json({ error: "Bot not found." }, { status: 404 });
    }
    if (!bot.leadCaptureEnabled) {
      return NextResponse.json(
        { error: "Lead capture is disabled." },
        { status: 400 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.conversationId !== "string") {
      return NextResponse.json(
        { error: "conversationId is required." },
        { status: 400 },
      );
    }

    const conversation = getConversationById(body.conversationId);
    if (!conversation || conversation.botId !== bot.id) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }

    const updated = ensureCrmLeadForConversation({
      bot,
      conversation,
      hints: {
        name: typeof body.name === "string" ? body.name : null,
        email: typeof body.email === "string" ? body.email : null,
        phone: typeof body.phone === "string" ? body.phone : null,
      },
    });

    if (!updated.crmLeadId) {
      return NextResponse.json(
        { error: "Provide at least a name, email, or phone." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      conversation: updated,
      crmLeadId: updated.crmLeadId,
    });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}
