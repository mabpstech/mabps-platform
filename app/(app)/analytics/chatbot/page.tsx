import { ChatbotAnalyticsPanel } from "@/components/analytics/domain-panels";
import { requireAnalyticsWorkspace } from "@/lib/analytics/access";
import { parseAnalyticsDateRange } from "@/lib/analytics/http";
import { getChatbotAnalytics } from "@/lib/analytics/repository";

export default async function AnalyticsChatbotPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { workspace } = await requireAnalyticsWorkspace("/analytics/chatbot");
  const params = await searchParams;
  const range = parseAnalyticsDateRange(params.range);

  return (
    <ChatbotAnalyticsPanel data={getChatbotAnalytics(workspace.id, range)} />
  );
}
