import { CrmAnalyticsPanel } from "@/components/analytics/domain-panels";
import { requireAnalyticsWorkspace } from "@/lib/analytics/access";
import { parseAnalyticsDateRange } from "@/lib/analytics/http";
import { getCrmAnalytics } from "@/lib/analytics/repository";

export default async function AnalyticsCrmPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { workspace } = await requireAnalyticsWorkspace("/analytics/crm");
  const params = await searchParams;
  const range = parseAnalyticsDateRange(params.range);

  return <CrmAnalyticsPanel data={getCrmAnalytics(workspace.id, range)} />;
}
