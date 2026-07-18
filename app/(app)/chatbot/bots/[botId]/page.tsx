import { notFound } from "next/navigation";
import { BotDetail } from "@/components/chatbot/bot-detail";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireChatbotWorkspace } from "@/lib/chatbot/access";
import {
  getBotById,
  getWidgetByBotId,
  listChannels,
} from "@/lib/chatbot/repository";

type PageProps = {
  params: Promise<{ botId: string }>;
};

export default async function ChatbotBotDetailPage({ params }: PageProps) {
  const { workspace, role } = await requireChatbotWorkspace("/chatbot/bots");
  const { botId } = await params;
  const bot = getBotById(botId);
  if (!bot || bot.workspaceId !== workspace.id) notFound();

  return (
    <BotDetail
      bot={bot}
      widget={getWidgetByBotId(bot.id)}
      channels={listChannels(bot.id)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
