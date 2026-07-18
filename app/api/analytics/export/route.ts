import { NextResponse } from "next/server";
import { requireAnalyticsMemberApi } from "@/lib/analytics/access";
import { reportFilename } from "@/lib/analytics/export";
import {
  analyticsErrorResponse,
  parseAnalyticsDateRange,
  parseAnalyticsExportFormat,
  parseAnalyticsReport,
} from "@/lib/analytics/http";
import { exportAnalyticsReport } from "@/lib/analytics/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireAnalyticsMemberApi();
    const { searchParams } = new URL(request.url);
    const report = parseAnalyticsReport(searchParams.get("report"));
    const format = parseAnalyticsExportFormat(searchParams.get("format"));
    const range = parseAnalyticsDateRange(searchParams.get("range"));

    if (!report) {
      return NextResponse.json(
        { error: "Valid report is required." },
        { status: 400 },
      );
    }
    if (!format) {
      return NextResponse.json(
        { error: "format must be csv or pdf." },
        { status: 400 },
      );
    }

    const exported = exportAnalyticsReport({
      workspaceId: workspace.id,
      report,
      format,
      range,
      workspaceName: workspace.name,
    });

    const filename = reportFilename(report, format, workspace.slug);
    const body =
      typeof exported.body === "string"
        ? exported.body
        : new Uint8Array(exported.body);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": exported.contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return analyticsErrorResponse(error);
  }
}
