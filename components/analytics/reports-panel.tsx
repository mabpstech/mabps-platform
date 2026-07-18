"use client";

import { Suspense, useState } from "react";
import { RangeExportBar } from "@/components/analytics/range-export-bar";
import {
  authButtonClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import { REPORT_LABELS, DEFAULT_DATE_RANGE } from "@/lib/analytics/defaults";
import type {
  AnalyticsDateRange,
  AnalyticsReportId,
} from "@/lib/analytics/types";
import { ANALYTICS_REPORTS } from "@/lib/analytics/types";

export function ReportsPanel({
  range = DEFAULT_DATE_RANGE,
}: {
  range?: AnalyticsDateRange;
}) {
  const [report, setReport] = useState<AnalyticsReportId>("overview");

  function download(format: "csv" | "pdf") {
    window.location.href = `/api/analytics/export?report=${report}&format=${format}&range=${range}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Charts & reports
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Export any analytics report as CSV or PDF for the selected date
          range.
        </p>
      </div>

      <Suspense fallback={null}>
        <RangeExportBar report={report} currentRange={range} />
      </Suspense>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <label className="block text-sm font-medium text-zinc-700">
          Report
          <select
            className="mt-1.5 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            value={report}
            onChange={(event) =>
              setReport(event.target.value as AnalyticsReportId)
            }
          >
            {ANALYTICS_REPORTS.map((id) => (
              <option key={id} value={id}>
                {REPORT_LABELS[id]}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => download("csv")}
            className={`${authSecondaryButtonClassName} !w-auto`}
          >
            Download CSV
          </button>
          <button
            type="button"
            onClick={() => download("pdf")}
            className={`${authButtonClassName} !w-auto`}
          >
            Download PDF
          </button>
        </div>
      </section>
    </div>
  );
}
