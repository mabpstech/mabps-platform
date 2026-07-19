import { NextResponse } from "next/server";
import {
  requireAiManagerApi,
  requireAiMemberApi,
} from "@/lib/ai/access";
import {
  aiErrorResponse,
  parseAiListFilters,
  parseAiPromptKind,
} from "@/lib/ai/http";
import {
  createPrompt,
  ensureWorkspaceAi,
  listPrompts,
} from "@/lib/ai/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireAiMemberApi();
    ensureWorkspaceAi(workspace.id);
    const filters = parseAiListFilters(new URL(request.url).searchParams);
    return NextResponse.json({
      prompts: listPrompts(workspace.id, filters),
    });
  } catch (error) {
    return aiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireAiManagerApi();
    ensureWorkspaceAi(workspace.id);
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "name is required." }, { status: 400 });
    }
    if (typeof body.content !== "string" || !body.content.trim()) {
      return NextResponse.json(
        { error: "content is required." },
        { status: 400 },
      );
    }

    const kind =
      body.kind !== undefined ? parseAiPromptKind(body.kind) : "custom";
    if (body.kind !== undefined && !kind) {
      return NextResponse.json(
        { error: "kind must be system, workspace, or custom." },
        { status: 400 },
      );
    }

    const prompt = createPrompt({
      workspaceId: workspace.id,
      name: body.name,
      content: body.content,
      kind: kind || "custom",
      description:
        typeof body.description === "string" || body.description === null
          ? (body.description as string | null)
          : undefined,
      slug: typeof body.slug === "string" ? body.slug : undefined,
      isDefault: body.isDefault === true,
      isActive: body.isActive === false ? false : true,
    });

    return NextResponse.json({ prompt }, { status: 201 });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
