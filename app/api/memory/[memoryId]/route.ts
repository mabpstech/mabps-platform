import { NextResponse } from "next/server";
import {
  requireMemoryManagerApi,
  requireMemoryMemberApi,
} from "@/lib/memory/access";
import {
  memoryErrorResponse,
  parseMemoryKind,
  parseMemoryScopeType,
} from "@/lib/memory/http";
import {
  deleteMemory,
  getMemoryForWorkspace,
  updateMemory,
} from "@/lib/memory/repository";

type RouteContext = { params: Promise<{ memoryId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireMemoryMemberApi();
    const { memoryId } = await context.params;
    const memory = getMemoryForWorkspace(memoryId, workspace.id);
    if (!memory) {
      return NextResponse.json({ error: "Memory not found." }, { status: 404 });
    }
    return NextResponse.json({ memory });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireMemoryMemberApi();
    const { memoryId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;

    const memory = await updateMemory(memoryId, workspace.id, {
      content: typeof body.content === "string" ? body.content : undefined,
      importance:
        typeof body.importance === "number" ? body.importance : undefined,
      source: typeof body.source === "string" ? body.source : undefined,
      metadata:
        body.metadata && typeof body.metadata === "object"
          ? (body.metadata as Record<string, unknown>)
          : undefined,
      expiresAt:
        typeof body.expiresAt === "string" || body.expiresAt === null
          ? (body.expiresAt as string | null)
          : undefined,
      kind: parseMemoryKind(body.kind) || undefined,
      scopeType: parseMemoryScopeType(body.scopeType) || undefined,
      scopeId:
        typeof body.scopeId === "string" || body.scopeId === null
          ? (body.scopeId as string | null)
          : undefined,
      key:
        typeof body.key === "string" || body.key === null
          ? (body.key as string | null)
          : undefined,
    });

    return NextResponse.json({ memory });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireMemoryManagerApi();
    const { memoryId } = await context.params;
    await deleteMemory(memoryId, workspace.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}
