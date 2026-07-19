import { NextResponse } from "next/server";
import { requireGuardianMemberApi } from "@/lib/guardian/access";
import { runIntegrityChecks } from "@/lib/guardian/engine/checks";
import { guardianErrorResponse } from "@/lib/guardian/http";

export async function GET() {
  try {
    const { workspace } = await requireGuardianMemberApi();
    const checks = await runIntegrityChecks(workspace.id);
    return NextResponse.json({ checks });
  } catch (error) {
    return guardianErrorResponse(error);
  }
}
