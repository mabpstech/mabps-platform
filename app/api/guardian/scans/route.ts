import { NextResponse } from "next/server";
import {
  requireGuardianManagerApi,
  requireGuardianMemberApi,
} from "@/lib/guardian/access";
import { runGuardianScan } from "@/lib/guardian/engine/scan";
import {
  guardianErrorResponse,
  parseGuardianCategories,
  parseGuardianListFilters,
} from "@/lib/guardian/http";
import { listScans } from "@/lib/guardian/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireGuardianMemberApi();
    const { searchParams } = new URL(request.url);
    const filters = parseGuardianListFilters(searchParams);
    return NextResponse.json({
      scans: listScans(workspace.id, filters),
    });
  } catch (error) {
    return guardianErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace, session } = await requireGuardianManagerApi();
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const categories = parseGuardianCategories(body.categories) || undefined;
    const scan = await runGuardianScan({
      workspaceId: workspace.id,
      categories,
      trigger: "manual",
      createdByUserId: session.user.id,
    });
    return NextResponse.json({ scan }, { status: 201 });
  } catch (error) {
    return guardianErrorResponse(error);
  }
}
