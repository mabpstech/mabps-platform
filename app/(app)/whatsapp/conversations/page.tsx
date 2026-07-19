import { ConversationsPanel } from "@/components/whatsapp/conversations-panel";
import { requireWhatsAppWorkspace } from "@/lib/whatsapp/access";
import {
  getConversationById,
  listConversations,
  listMessages,
} from "@/lib/whatsapp/repository";

export default async function WhatsAppConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { workspace } = await requireWhatsAppWorkspace(
    "/whatsapp/conversations",
  );
  const params = await searchParams;
  const conversations = listConversations(workspace.id, { limit: 100 });
  const selectedId = params.id || conversations[0]?.id || null;
  const selected =
    selectedId && getConversationById(selectedId)?.workspaceId === workspace.id
      ? getConversationById(selectedId)
      : null;
  const messages = selected
    ? listMessages(workspace.id, {
        conversationId: selected.id,
        limit: 500,
      })
    : [];

  return (
    <ConversationsPanel
      conversations={conversations}
      selected={selected}
      messages={messages}
    />
  );
}
