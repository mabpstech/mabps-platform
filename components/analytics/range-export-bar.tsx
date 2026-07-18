"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  authButtonClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import {
  DATE_RANGE_LABELS,
  DEFAULT_DATE_RANGE,
} from "@/lib/analytics/defaults";
import type {
  AnalyticsDateRange,
  AnalyticsReportId,
} from "@/lib/analytics/types";
import { ANALYTICS_DATE_RANGES } from "@/lib/analytics/types";

export function RangeExportBar({
  report,
  currentRange = DEFAULT_DATE_RANGE,
}: {
  report: AnalyticsReportId;
  currentRange?: AnalyticsDateRange;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setRange(range: AnalyticsDateRange) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    router.push(`?${params.toString()}`);
  }

  function exportReport(format: "csv" | "pdf") {
    const url = `/api/analytics/export?report=${report}&format=${format}&range=${currentRange}`;
    window.location.href = url;
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-1">
        {ANALYTICS_DATE_RANGES.map((range) => (
          <button
            key={range}
            type="button"
            onClick={() => setRange(range)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              currentRange === range
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {DATE_RANGE_LABELS[range]}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => exportReport("csv")}
          className={`${authSecondaryButtonClassName} !w-auto !px-3 !py-1.5 text-xs`}
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={() => exportReport("pdf")}
          className={`${authButtonClassName} !w-auto !px-3 !py-1.5 text-xs`}
        >
          Export PDF
        </button>
      </div>
    </div>
  );
}
