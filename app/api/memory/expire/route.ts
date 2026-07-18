import { NextResponse } from "next/server";
import { requireMemoryManagerApi } from "@/lib/memory/access";
import { purgeExpiredForWorkspace } from "@/lib/memory/expire";
import { memoryErrorResponse } from "@/lib/memory/http";

export async function POST() {
  try {
    const { workspace } = await requireMemoryManagerApi();
    const result = purgeExpiredForWorkspace(workspace.id);
    return NextResponse.json({ result });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}
