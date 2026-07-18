"use client";

import {
  AnalyticsBarChart,
  formatMetricValue,
} from "@/components/analytics/charts";
import type { MetricCard } from "@/lib/analytics/types";

export function MetricGrid({ cards }: { cards: MetricCard[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.key}
          className="rounded-xl border border-zinc-200 bg-white px-4 py-3"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            {card.label}
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">
            {formatMetricValue(card.value, card.format ?? "number")}
          </p>
          {card.series?.length ? (
            <div className="mt-3">
              <AnalyticsBarChart
                series={card.series}
                height={72}
                format={card.format ?? "number"}
              />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
