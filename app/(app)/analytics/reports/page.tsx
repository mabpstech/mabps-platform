import { ReportsPanel } from "@/components/analytics/reports-panel";
import { requireAnalyticsWorkspace } from "@/lib/analytics/access";
import { parseAnalyticsDateRange } from "@/lib/analytics/http";

export default async function AnalyticsReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAnalyticsWorkspace("/analytics/reports");
  const params = await searchParams;
  const range = parseAnalyticsDateRange(params.range);

  return <ReportsPanel range={range} />;
}
