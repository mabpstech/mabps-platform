import { NextResponse } from "next/server";
import { requireMemoryMemberApi } from "@/lib/memory/access";
import {
  memoryErrorResponse,
  parseMemoryKind,
  parseMemoryScopeType,
} from "@/lib/memory/http";
import { searchMemory } from "@/lib/memory/search";
import type { MemoryKind } from "@/lib/memory/types";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireMemoryMemberApi();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || searchParams.get("query") || "";
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? Number(limitRaw) : undefined;
    const kinds = searchParams
      .getAll("kind")
      .map((value) => parseMemoryKind(value))
      .filter((value): value is MemoryKind => Boolean(value));

    const result = await searchMemory({
      workspaceId: workspace.id,
      query,
      limit,
      kinds: kinds.length ? kinds : undefined,
      scopeType: parseMemoryScopeType(searchParams.get("scopeType")) || undefined,
      scopeId: searchParams.get("scopeId"),
      embeddingProvider: searchParams.get("embeddingProvider"),
    });

    return NextResponse.json({ result });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireMemoryMemberApi();
    const body = (await request.json()) as Record<string, unknown>;
    const query =
      typeof body.query === "string"
        ? body.query
        : typeof body.q === "string"
          ? body.q
          : "";

    const kinds = Array.isArray(body.kinds)
      ? body.kinds
          .map((value) => parseMemoryKind(value))
          .filter((value): value is MemoryKind => Boolean(value))
      : undefined;

    const result = await searchMemory({
      workspaceId: workspace.id,
      query,
      limit: typeof body.limit === "number" ? body.limit : undefined,
      kinds,
      scopeType: parseMemoryScopeType(body.scopeType) || undefined,
      scopeId:
        typeof body.scopeId === "string" || body.scopeId === null
          ? (body.scopeId as string | null)
          : undefined,
      embeddingProvider:
        typeof body.embeddingProvider === "string"
          ? body.embeddingProvider
          : null,
    });

    return NextResponse.json({ result });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}
