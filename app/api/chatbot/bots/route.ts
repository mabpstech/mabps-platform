import { NextResponse } from "next/server";
import { requireChatbotMemberApi } from "@/lib/chatbot/access";
import { chatbotErrorResponse } from "@/lib/chatbot/http";
import { createBot, listBots } from "@/lib/chatbot/repository";
import type { AiProviderId, BotStatus } from "@/lib/chatbot/types";

export async function GET() {
  try {
    const { workspace } = await requireChatbotMemberApi();
    return NextResponse.json({ bots: listBots(workspace.id) });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireChatbotMemberApi();
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const bot = createBot({
      workspaceId: workspace.id,
      name: body.name,
      description:
        typeof body.description === "string" ? body.description : null,
      systemPrompt:
        typeof body.systemPrompt === "string" ? body.systemPrompt : undefined,
      welcomeMessage:
        typeof body.welcomeMessage === "string"
          ? body.welcomeMessage
          : undefined,
      fallbackMessage:
        typeof body.fallbackMessage === "string"
          ? body.fallbackMessage
          : undefined,
      provider:
        typeof body.provider === "string"
          ? (body.provider as AiProviderId)
          : undefined,
      model: typeof body.model === "string" ? body.model : null,
      temperature:
        typeof body.temperature === "number" ? body.temperature : undefined,
      status:
        typeof body.status === "string"
          ? (body.status as BotStatus)
          : "active",
    });

    return NextResponse.json({ bot }, { status: 201 });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}
