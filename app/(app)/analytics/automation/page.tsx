import { AutomationAnalyticsPanel } from "@/components/analytics/domain-panels";
import { requireAnalyticsWorkspace } from "@/lib/analytics/access";
import { parseAnalyticsDateRange } from "@/lib/analytics/http";
import { getAutomationAnalytics } from "@/lib/analytics/repository";

export default async function AnalyticsAutomationPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { workspace } = await requireAnalyticsWorkspace(
    "/analytics/automation",
  );
  const params = await searchParams;
  const range = parseAnalyticsDateRange(params.range);

  return (
    <AutomationAnalyticsPanel
      data={getAutomationAnalytics(workspace.id, range)}
    />
  );
}
