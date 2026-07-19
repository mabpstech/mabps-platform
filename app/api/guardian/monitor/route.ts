import { NextResponse } from "next/server";
import {
  requireGuardianManagerApi,
  requireGuardianMemberApi,
} from "@/lib/guardian/access";
import { runGuardianMonitorTick } from "@/lib/guardian/engine/monitor";
import { guardianErrorResponse } from "@/lib/guardian/http";
import { listMonitorEvents } from "@/lib/guardian/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireGuardianMemberApi();
    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? Number(limitRaw) : 50;
    return NextResponse.json({
      events: listMonitorEvents(workspace.id, {
        limit:
          typeof limit === "number" && Number.isFinite(limit)
            ? Math.min(Math.max(1, Math.floor(limit)), 200)
            : 50,
      }),
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
    const result = await runGuardianMonitorTick({
      workspaceId: workspace.id,
      force: body.force === true,
      createdByUserId: session.user.id,
    });
    return NextResponse.json(result);
  } catch (error) {
    return guardianErrorResponse(error);
  }
}
