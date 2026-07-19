import { NextResponse } from "next/server";
import { requireGuardianMemberApi } from "@/lib/guardian/access";
import {
  guardianErrorResponse,
  parseGuardianListFilters,
} from "@/lib/guardian/http";
import { listRepairs } from "@/lib/guardian/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireGuardianMemberApi();
    const { searchParams } = new URL(request.url);
    const filters = parseGuardianListFilters(searchParams);
    return NextResponse.json({
      repairs: listRepairs(workspace.id, filters),
    });
  } catch (error) {
    return guardianErrorResponse(error);
  }
}
