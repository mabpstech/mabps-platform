import { NextResponse } from "next/server";
import { requireGuardianManagerApi } from "@/lib/guardian/access";
import { troubleshootWorkspace } from "@/lib/guardian/engine/troubleshoot";
import { guardianErrorResponse } from "@/lib/guardian/http";

export async function POST(request: Request) {
  try {
    const { workspace } = await requireGuardianManagerApi();
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const findingIds = Array.isArray(body.findingIds)
      ? body.findingIds.map((id) => String(id))
      : undefined;
    const result = await troubleshootWorkspace({
      workspaceId: workspace.id,
      findingIds,
      question:
        typeof body.question === "string" ? body.question : null,
    });
    return NextResponse.json({ result });
  } catch (error) {
    return guardianErrorResponse(error);
  }
}
