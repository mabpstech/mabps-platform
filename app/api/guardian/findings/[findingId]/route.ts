import { NextResponse } from "next/server";
import {
  requireGuardianManagerApi,
  requireGuardianMemberApi,
} from "@/lib/guardian/access";
import {
  guardianErrorResponse,
  parseGuardianFindingStatus,
} from "@/lib/guardian/http";
import {
  getFindingById,
  listRepairs,
  updateFinding,
} from "@/lib/guardian/repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ findingId: string }> },
) {
  try {
    const { workspace } = await requireGuardianMemberApi();
    const { findingId } = await context.params;
    const finding = getFindingById(workspace.id, findingId);
    if (!finding) throw new Error("Finding not found.");
    return NextResponse.json({
      finding,
      repairs: listRepairs(workspace.id, { findingId, limit: 50 }),
    });
  } catch (error) {
    return guardianErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ findingId: string }> },
) {
  try {
    const { workspace, session } = await requireGuardianManagerApi();
    const { findingId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const status = parseGuardianFindingStatus(body.status);
    if (!status) throw new Error("Invalid finding status.");

    const finding = updateFinding(workspace.id, findingId, {
      status,
      suggestion:
        typeof body.suggestion === "string" ? body.suggestion : undefined,
      resolvedAt:
        status === "resolved" ? new Date().toISOString() : undefined,
      resolvedByUserId:
        status === "resolved" ? session.user.id : undefined,
    });

    return NextResponse.json({ finding });
  } catch (error) {
    return guardianErrorResponse(error);
  }
}
