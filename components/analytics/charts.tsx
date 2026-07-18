"use client";

import type { SeriesPoint } from "@/lib/analytics/types";

export function formatMetricValue(
  value: number,
  format: "number" | "currency" | "percent" | "duration" = "number",
): string {
  if (format === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value / 100);
  }
  if (format === "percent") {
    return `${value.toFixed(1)}%`;
  }
  if (format === "duration") {
    return `${Math.round(value)} ms`;
  }
  return new Intl.NumberFormat("en-US").format(value);
}

export function AnalyticsBarChart({
  series,
  height = 160,
  format = "number",
}: {
  series: SeriesPoint[];
  height?: number;
  format?: "number" | "currency" | "percent" | "duration";
}) {
  const values = series.map((point) => point.value);
  const max = Math.max(...values, 1);
  const width = Math.max(series.length * 18, 280);
  const barWidth = Math.max(8, Math.min(14, width / Math.max(series.length, 1) - 4));

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-full"
        role="img"
        aria-label="Bar chart"
      >
        {series.map((point, index) => {
          const barHeight = (point.value / max) * (height - 28);
          const x = index * (width / Math.max(series.length, 1)) + 2;
          const y = height - 20 - barHeight;
          return (
            <g key={`${point.date}-${index}`}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 1)}
                rx={2}
                className="fill-zinc-800"
              >
                <title>
                  {point.date}: {formatMetricValue(point.value, format)}
                </title>
              </rect>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
        <span>{series[0]?.date ?? ""}</span>
        <span>{series[series.length - 1]?.date ?? ""}</span>
      </div>
    </div>
  );
}

export function AnalyticsLineChart({
  series,
  height = 160,
  format = "number",
}: {
  series: SeriesPoint[];
  height?: number;
  format?: "number" | "currency" | "percent" | "duration";
}) {
  const values = series.map((point) => point.value);
  const max = Math.max(...values, 1);
  const width = 360;
  const points = series.map((point, index) => {
    const x =
      series.length <= 1
        ? width / 2
        : (index / (series.length - 1)) * (width - 16) + 8;
    const y = height - 24 - (point.value / max) * (height - 36);
    return { x, y, point };
  });
  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-full"
        role="img"
        aria-label="Line chart"
      >
        <polyline
          fill="none"
          strokeWidth="2"
          points={polyline}
          className="stroke-zinc-800"
        />
        {points.map(({ x, y, point }, index) => (
          <circle
            key={`${point.date}-${index}`}
            cx={x}
            cy={y}
            r={2.5}
            className="fill-zinc-800"
          >
            <title>
              {point.date}: {formatMetricValue(point.value, format)}
            </title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
        <span>{series[0]?.date ?? ""}</span>
        <span>{series[series.length - 1]?.date ?? ""}</span>
      </div>
    </div>
  );
}

export function AnalyticsBreakdownList({
  items,
  valueFormat = "number",
}: {
  items: Array<{ label: string; value: number }>;
  valueFormat?: "number" | "currency" | "percent" | "duration";
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-zinc-700">{item.label}</span>
            <span className="font-medium text-zinc-900">
              {formatMetricValue(item.value, valueFormat)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-zinc-800"
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
            />
          </div>
        </li>
      ))}
      {!items.length ? (
        <li className="text-sm text-zinc-500">No data for this range.</li>
      ) : null}
    </ul>
  );
}
