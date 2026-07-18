import { NextResponse } from "next/server";
import { requireAnalyticsMemberApi } from "@/lib/analytics/access";
import {
  analyticsErrorResponse,
  parseAnalyticsDateRange,
} from "@/lib/analytics/http";
import { getCrmAnalytics } from "@/lib/analytics/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireAnalyticsMemberApi();
    const { searchParams } = new URL(request.url);
    const range = parseAnalyticsDateRange(searchParams.get("range"));
    return NextResponse.json({
      crm: getCrmAnalytics(workspace.id, range),
    });
  } catch (error) {
    return analyticsErrorResponse(error);
  }
}
