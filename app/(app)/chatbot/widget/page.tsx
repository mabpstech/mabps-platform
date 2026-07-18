import { WidgetManager } from "@/components/chatbot/widget-manager";
import { requireChatbotWorkspace } from "@/lib/chatbot/access";
import { getWidgetByBotId, listBots } from "@/lib/chatbot/repository";

type PageProps = {
  searchParams: Promise<{ botId?: string }>;
};

export default async function ChatbotWidgetPage({ searchParams }: PageProps) {
  const { workspace } = await requireChatbotWorkspace("/chatbot/widget");
  const params = await searchParams;
  const bots = listBots(workspace.id);
  const botId = params.botId || bots[0]?.id;
  const widget = botId ? getWidgetByBotId(botId) : null;

  return (
    <WidgetManager
      bots={bots}
      initialBotId={botId}
      initialWidget={widget}
    />
  );
}
