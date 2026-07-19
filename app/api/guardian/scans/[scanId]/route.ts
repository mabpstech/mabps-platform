import { NextResponse } from "next/server";
import { requireGuardianMemberApi } from "@/lib/guardian/access";
import { guardianErrorResponse } from "@/lib/guardian/http";
import {
  getScanById,
  listCheckResults,
  listFindings,
  listRepairs,
} from "@/lib/guardian/repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ scanId: string }> },
) {
  try {
    const { workspace } = await requireGuardianMemberApi();
    const { scanId } = await context.params;
    const scan = getScanById(workspace.id, scanId);
    if (!scan) throw new Error("Scan not found.");
    return NextResponse.json({
      scan,
      checks: listCheckResults(workspace.id, { scanId, limit: 200 }),
      findings: listFindings(workspace.id, { scanId, limit: 200 }),
      repairs: listRepairs(workspace.id, { scanId, limit: 200 }),
    });
  } catch (error) {
    return guardianErrorResponse(error);
  }
}
