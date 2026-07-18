import { NextResponse } from "next/server";
import {
  requireChatbotManagerApi,
  requireChatbotMemberApi,
} from "@/lib/chatbot/access";
import { chatbotErrorResponse } from "@/lib/chatbot/http";
import {
  deleteProviderCredential,
  listProviderCredentials,
  upsertProviderCredential,
} from "@/lib/chatbot/repository";
import type { AiProviderId } from "@/lib/chatbot/types";
import { AI_PROVIDERS } from "@/lib/chatbot/types";

export async function GET() {
  try {
    const { workspace } = await requireChatbotMemberApi();
    return NextResponse.json({
      providers: AI_PROVIDERS,
      credentials: listProviderCredentials(workspace.id),
    });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { workspace } = await requireChatbotManagerApi();
    const body = (await request.json()) as Record<string, unknown>;
    if (
      typeof body.provider !== "string" ||
      !AI_PROVIDERS.includes(body.provider as AiProviderId)
    ) {
      return NextResponse.json(
        { error: "Valid provider is required." },
        { status: 400 },
      );
    }
    if (typeof body.apiKey !== "string" || !body.apiKey.trim()) {
      return NextResponse.json(
        { error: "API key is required." },
        { status: 400 },
      );
    }

    const credential = upsertProviderCredential({
      workspaceId: workspace.id,
      provider: body.provider as AiProviderId,
      apiKey: body.apiKey,
      baseUrl: typeof body.baseUrl === "string" ? body.baseUrl : null,
      defaultModel:
        typeof body.defaultModel === "string" ? body.defaultModel : null,
      isActive:
        typeof body.isActive === "boolean" ? body.isActive : undefined,
    });
    return NextResponse.json({ credential });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { workspace } = await requireChatbotManagerApi();
    const provider = new URL(request.url).searchParams.get("provider");
    if (!provider || !AI_PROVIDERS.includes(provider as AiProviderId)) {
      return NextResponse.json(
        { error: "Valid provider is required." },
        { status: 400 },
      );
    }
    deleteProviderCredential(workspace.id, provider as AiProviderId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return chatbotErrorResponse(error);
  }
}
