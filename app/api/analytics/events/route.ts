import { NextResponse } from "next/server";
import { requireAnalyticsMemberApi } from "@/lib/analytics/access";
import {
  analyticsErrorResponse,
  parseAnalyticsListFilters,
  parseAnalyticsSource,
} from "@/lib/analytics/http";
import { listEvents, trackEvent } from "@/lib/analytics/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireAnalyticsMemberApi();
    const { searchParams } = new URL(request.url);
    const filters = parseAnalyticsListFilters(searchParams);
    return NextResponse.json({
      events: listEvents(workspace.id, filters),
    });
  } catch (error) {
    return analyticsErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace, session } = await requireAnalyticsMemberApi();
    const body = (await request.json()) as Record<string, unknown>;
    const source = parseAnalyticsSource(body.source);
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!source) {
      return NextResponse.json(
        { error: "Valid source is required." },
        { status: 400 },
      );
    }
    if (!name) {
      return NextResponse.json(
        { error: "Event name is required." },
        { status: 400 },
      );
    }

    const event = trackEvent({
      workspaceId: workspace.id,
      source,
      name,
      entityType:
        typeof body.entityType === "string" ? body.entityType : null,
      entityId: typeof body.entityId === "string" ? body.entityId : null,
      userId:
        typeof body.userId === "string"
          ? body.userId
          : session.user.id,
      value: typeof body.value === "number" ? body.value : null,
      unit: typeof body.unit === "string" ? body.unit : null,
      properties:
        body.properties && typeof body.properties === "object"
          ? (body.properties as Record<string, unknown>)
          : {},
      occurredAt:
        typeof body.occurredAt === "string" ? body.occurredAt : undefined,
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    return analyticsErrorResponse(error);
  }
}
