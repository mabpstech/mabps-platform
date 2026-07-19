import { NextResponse } from "next/server";
import {
  requireAiManagerApi,
  requireAiMemberApi,
} from "@/lib/ai/access";
import { AI_MODEL_OPTIONS } from "@/lib/ai/defaults";
import { aiErrorResponse, parseAiProvider } from "@/lib/ai/http";
import {
  deleteProviderCredential,
  listProviderCredentials,
  upsertProviderCredential,
} from "@/lib/ai/repository";
import { AI_PROVIDERS } from "@/lib/ai/types";

export async function GET() {
  try {
    const { workspace } = await requireAiMemberApi();
    return NextResponse.json({
      providers: AI_PROVIDERS,
      models: AI_MODEL_OPTIONS,
      credentials: listProviderCredentials(workspace.id),
    });
  } catch (error) {
    return aiErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { workspace } = await requireAiManagerApi();
    const body = (await request.json()) as Record<string, unknown>;
    const provider = parseAiProvider(body.provider);
    if (!provider) {
      return NextResponse.json(
        { error: "provider must be openai, gemini, or openrouter." },
        { status: 400 },
      );
    }
    if (typeof body.apiKey !== "string" || !body.apiKey.trim()) {
      return NextResponse.json(
        { error: "apiKey is required." },
        { status: 400 },
      );
    }

    const credential = upsertProviderCredential({
      workspaceId: workspace.id,
      provider,
      apiKey: body.apiKey,
      baseUrl:
        typeof body.baseUrl === "string" || body.baseUrl === null
          ? (body.baseUrl as string | null)
          : undefined,
      defaultModel:
        typeof body.defaultModel === "string" || body.defaultModel === null
          ? (body.defaultModel as string | null)
          : undefined,
      isActive:
        typeof body.isActive === "boolean" ? body.isActive : undefined,
    });

    return NextResponse.json({ credential });
  } catch (error) {
    return aiErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { workspace } = await requireAiManagerApi();
    const provider = parseAiProvider(
      new URL(request.url).searchParams.get("provider"),
    );
    if (!provider) {
      return NextResponse.json(
        { error: "provider query param is required." },
        { status: 400 },
      );
    }
    deleteProviderCredential(workspace.id, provider);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
