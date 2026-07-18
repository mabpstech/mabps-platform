import { NextResponse } from "next/server";
import {
  requireMemoryManagerApi,
  requireMemoryMemberApi,
} from "@/lib/memory/access";
import {
  memoryErrorResponse,
  parseMemoryKind,
  parseMemoryListFilters,
  parseMemoryScopeType,
} from "@/lib/memory/http";
import { deleteMemory, listMemories, writeMemory } from "@/lib/memory/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireMemoryMemberApi();
    const filters = parseMemoryListFilters(new URL(request.url).searchParams);
    return NextResponse.json({
      memories: listMemories(workspace.id, filters),
    });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireMemoryMemberApi();
    const body = (await request.json()) as Record<string, unknown>;
    const kind = parseMemoryKind(body.kind);
    if (!kind) {
      return NextResponse.json(
        { error: "kind must be short_term, long_term, profile, or business." },
        { status: 400 },
      );
    }
    if (typeof body.content !== "string" || !body.content.trim()) {
      return NextResponse.json(
        { error: "content is required." },
        { status: 400 },
      );
    }

    const scopeType = parseMemoryScopeType(body.scopeType) || undefined;
    const memory = await writeMemory({
      workspaceId: workspace.id,
      kind,
      content: body.content,
      scopeType,
      scopeId:
        typeof body.scopeId === "string" || body.scopeId === null
          ? (body.scopeId as string | null)
          : undefined,
      key:
        typeof body.key === "string" || body.key === null
          ? (body.key as string | null)
          : undefined,
      importance:
        typeof body.importance === "number" ? body.importance : undefined,
      source: typeof body.source === "string" ? body.source : "api",
      metadata:
        body.metadata && typeof body.metadata === "object"
          ? (body.metadata as Record<string, unknown>)
          : undefined,
      expiresAt:
        typeof body.expiresAt === "string" || body.expiresAt === null
          ? (body.expiresAt as string | null)
          : undefined,
      upsertByKey: body.upsertByKey === true,
    });

    return NextResponse.json({ memory }, { status: 201 });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { workspace } = await requireMemoryManagerApi();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }
    await deleteMemory(id, workspace.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}
