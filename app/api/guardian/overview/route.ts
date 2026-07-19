import { NextResponse } from "next/server";
import { requireGuardianMemberApi } from "@/lib/guardian/access";
import { guardianErrorResponse } from "@/lib/guardian/http";
import { getGuardianOverview } from "@/lib/guardian/repository";

export async function GET() {
  try {
    const { workspace } = await requireGuardianMemberApi();
    return NextResponse.json({
      overview: getGuardianOverview(workspace.id),
    });
  } catch (error) {
    return guardianErrorResponse(error);
  }
}
