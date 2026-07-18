import { NextResponse } from "next/server";
import { requireMemoryMemberApi } from "@/lib/memory/access";
import { memoryErrorResponse } from "@/lib/memory/http";
import { getMemoryOverview } from "@/lib/memory/repository";

export async function GET() {
  try {
    const { workspace } = await requireMemoryMemberApi();
    return NextResponse.json({
      overview: getMemoryOverview(workspace.id),
    });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}
