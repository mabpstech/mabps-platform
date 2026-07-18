import { NextResponse } from "next/server";
import { requireAnalyticsMemberApi } from "@/lib/analytics/access";
import {
  DATE_RANGE_LABELS,
  DEFAULT_DATE_RANGE,
  REPORT_LABELS,
  SOURCE_LABELS,
} from "@/lib/analytics/defaults";
import { analyticsErrorResponse } from "@/lib/analytics/http";
import {
  ANALYTICS_DATE_RANGES,
  ANALYTICS_EXPORT_FORMATS,
  ANALYTICS_REPORTS,
  ANALYTICS_SOURCES,
} from "@/lib/analytics/types";

export async function GET() {
  try {
    await requireAnalyticsMemberApi();
    return NextResponse.json({
      sources: ANALYTICS_SOURCES,
      sourceLabels: SOURCE_LABELS,
      reports: ANALYTICS_REPORTS,
      reportLabels: REPORT_LABELS,
      dateRanges: ANALYTICS_DATE_RANGES,
      dateRangeLabels: DATE_RANGE_LABELS,
      defaultDateRange: DEFAULT_DATE_RANGE,
      exportFormats: ANALYTICS_EXPORT_FORMATS,
    });
  } catch (error) {
    return analyticsErrorResponse(error);
  }
}
