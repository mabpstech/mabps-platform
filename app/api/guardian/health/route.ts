import { NextResponse } from "next/server";
import {
  requireGuardianManagerApi,
  requireGuardianMemberApi,
} from "@/lib/guardian/access";
import { runGuardianScan } from "@/lib/guardian/engine/scan";
import { guardianErrorResponse } from "@/lib/guardian/http";
import {
  getGuardianOverview,
  listCheckResults,
  listScans,
} from "@/lib/guardian/repository";

export async function GET() {
  try {
    const { workspace } = await requireGuardianMemberApi();
    const overview = getGuardianOverview(workspace.id);
    const lastScan = listScans(workspace.id, { limit: 1 })[0] || null;
    const checks = lastScan
      ? listCheckResults(workspace.id, { scanId: lastScan.id, limit: 100 })
      : [];
    return NextResponse.json({
      healthStatus: overview.healthStatus,
      overview,
      lastScan,
      checks,
    });
  } catch (error) {
    return guardianErrorResponse(error);
  }
}

export async function POST() {
  try {
    const { workspace, session } = await requireGuardianManagerApi();
    const scan = await runGuardianScan({
      workspaceId: workspace.id,
      trigger: "manual",
      createdByUserId: session.user.id,
      categories: [
        "database",
        "api",
        "deployment",
        "performance",
        "system",
      ],
    });
    return NextResponse.json({ scan }, { status: 201 });
  } catch (error) {
    return guardianErrorResponse(error);
  }
}
