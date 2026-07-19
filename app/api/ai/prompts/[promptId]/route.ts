import { NextResponse } from "next/server";
import {
  requireAiManagerApi,
  requireAiMemberApi,
} from "@/lib/ai/access";
import { aiErrorResponse, parseAiPromptKind } from "@/lib/ai/http";
import {
  deletePrompt,
  getPromptById,
  updatePrompt,
} from "@/lib/ai/repository";

type RouteContext = { params: Promise<{ promptId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireAiMemberApi();
    const { promptId } = await context.params;
    const prompt = getPromptById(promptId);
    if (!prompt || prompt.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
    }
    return NextResponse.json({ prompt });
  } catch (error) {
    return aiErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireAiManagerApi();
    const { promptId } = await context.params;
    const existing = getPromptById(promptId);
    if (!existing || existing.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const kind =
      body.kind !== undefined ? parseAiPromptKind(body.kind) : undefined;
    if (body.kind !== undefined && !kind) {
      return NextResponse.json(
        { error: "kind must be system, workspace, or custom." },
        { status: 400 },
      );
    }

    const prompt = updatePrompt(promptId, workspace.id, {
      name: typeof body.name === "string" ? body.name : undefined,
      content: typeof body.content === "string" ? body.content : undefined,
      description:
        typeof body.description === "string" || body.description === null
          ? (body.description as string | null)
          : undefined,
      kind: kind || undefined,
      slug: typeof body.slug === "string" ? body.slug : undefined,
      isDefault:
        typeof body.isDefault === "boolean" ? body.isDefault : undefined,
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
    });

    return NextResponse.json({ prompt });
  } catch (error) {
    return aiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireAiManagerApi();
    const { promptId } = await context.params;
    deletePrompt(promptId, workspace.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
