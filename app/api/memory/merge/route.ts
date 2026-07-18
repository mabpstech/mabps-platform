import { NextResponse } from "next/server";
import { requireMemoryMemberApi } from "@/lib/memory/access";
import { memoryErrorResponse } from "@/lib/memory/http";
import {
  autoMergeSimilarMemories,
  mergeMemories,
} from "@/lib/memory/merge";

export async function POST(request: Request) {
  try {
    const { workspace } = await requireMemoryMemberApi();
    const body = (await request.json()) as Record<string, unknown>;

    if (body.auto === true) {
      const result = await autoMergeSimilarMemories({
        workspaceId: workspace.id,
        threshold:
          typeof body.threshold === "number" ? body.threshold : undefined,
        limit: typeof body.limit === "number" ? body.limit : undefined,
        dryRun: body.dryRun === true,
      });
      return NextResponse.json({ result });
    }

    const memoryIds = Array.isArray(body.memoryIds)
      ? body.memoryIds.filter((value): value is string => typeof value === "string")
      : [];

    const result = await mergeMemories({
      workspaceId: workspace.id,
      memoryIds,
    });

    return NextResponse.json({
      survivor: result.survivor,
      mergedIds: result.mergedIds,
    });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}
