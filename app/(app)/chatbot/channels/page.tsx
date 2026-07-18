import { ChannelsManager } from "@/components/chatbot/channels-manager";
import { getChannelProvider } from "@/lib/chatbot/channels";
import { requireChatbotWorkspace } from "@/lib/chatbot/access";
import { listBots, listChannels } from "@/lib/chatbot/repository";

type PageProps = {
  searchParams: Promise<{ botId?: string }>;
};

export default async function ChatbotChannelsPage({ searchParams }: PageProps) {
  const { workspace } = await requireChatbotWorkspace("/chatbot/channels");
  const params = await searchParams;
  const bots = listBots(workspace.id);
  const botId = params.botId || bots[0]?.id;
  const channels = botId
    ? listChannels(botId).map((channel) => ({
        ...channel,
        providerImplemented: getChannelProvider(channel.channel).isImplemented,
      }))
    : [];

  return (
    <ChannelsManager
      bots={bots}
      channels={channels}
      initialBotId={botId}
    />
  );
}
