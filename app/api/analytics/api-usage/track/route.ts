import { NextResponse } from "next/server";
import { requireAnalyticsMemberApi } from "@/lib/analytics/access";
import { analyticsErrorResponse } from "@/lib/analytics/http";
import { trackApiRequest } from "@/lib/analytics/repository";

export async function POST(request: Request) {
  try {
    const { workspace, session } = await requireAnalyticsMemberApi();
    const body = (await request.json()) as Record<string, unknown>;
    const method = typeof body.method === "string" ? body.method.trim() : "";
    const path = typeof body.path === "string" ? body.path.trim() : "";
    const statusCode =
      typeof body.statusCode === "number" ? body.statusCode : NaN;

    if (!method || !path || !Number.isFinite(statusCode)) {
      return NextResponse.json(
        { error: "method, path, and statusCode are required." },
        { status: 400 },
      );
    }

    const entry = trackApiRequest({
      workspaceId: workspace.id,
      method,
      path,
      statusCode,
      durationMs:
        typeof body.durationMs === "number" ? body.durationMs : null,
      userId:
        typeof body.userId === "string" ? body.userId : session.user.id,
      ipHash: typeof body.ipHash === "string" ? body.ipHash : null,
      userAgent:
        typeof body.userAgent === "string" ? body.userAgent : null,
      occurredAt:
        typeof body.occurredAt === "string" ? body.occurredAt : undefined,
    });

    return NextResponse.json({ request: entry }, { status: 201 });
  } catch (error) {
    return analyticsErrorResponse(error);
  }
}
