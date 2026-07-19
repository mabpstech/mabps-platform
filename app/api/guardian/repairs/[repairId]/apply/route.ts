import { NextResponse } from "next/server";
import { requireGuardianManagerApi } from "@/lib/guardian/access";
import { applyGuardianRepair } from "@/lib/guardian/engine/repair";
import { guardianErrorResponse } from "@/lib/guardian/http";

export async function POST(
  _request: Request,
  context: { params: Promise<{ repairId: string }> },
) {
  try {
    const { workspace, session } = await requireGuardianManagerApi();
    const { repairId } = await context.params;
    const repair = await applyGuardianRepair({
      workspaceId: workspace.id,
      repairId,
      userId: session.user.id,
    });
    return NextResponse.json({ repair });
  } catch (error) {
    return guardianErrorResponse(error);
  }
}
