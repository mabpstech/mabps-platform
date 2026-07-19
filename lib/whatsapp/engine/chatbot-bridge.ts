import { handleVisitorMessage } from "@/lib/chatbot/engine/chat";
import {
  createConversation as createChatbotConversation,
  getBotById,
  getConversationById as getChatbotConversationById,
  listBots,
  listConversations as listChatbotConversations,
  updateChannel,
} from "@/lib/chatbot/repository";
import { sendWhatsAppText } from "@/lib/whatsapp/engine/outbound";
import {
  ensureWorkspaceWhatsApp,
  updateConversation,
} from "@/lib/whatsapp/repository";
import type {
  WhatsAppContact,
  WhatsAppConversation,
  WhatsAppMessage,
} from "@/lib/whatsapp/types";

function findChatbotConversationByExternalThread(
  workspaceId: string,
  externalThreadId: string,
) {
  return listChatbotConversations(workspaceId, {
    channel: "whatsapp",
    limit: 100,
  }).find((conversation) => conversation.externalThreadId === externalThreadId);
}

function resolveBotId(workspaceId: string, configuredBotId: string | null) {
  if (configuredBotId) {
    const bot = getBotById(configuredBotId);
    if (bot && bot.workspaceId === workspaceId && bot.status === "active") {
      return bot.id;
    }
  }
  const active = listBots(workspaceId).find((bot) => bot.status === "active");
  return active?.id ?? null;
}

/**
 * Route an inbound WhatsApp message into the Chatbot engine and
 * push any AI/agent reply back out over Cloud API.
 */
export async function routeInboundToChatbot(input: {
  workspaceId: string;
  contact: WhatsAppContact;
  conversation: WhatsAppConversation;
  inboundMessage: WhatsAppMessage;
}): Promise<{
  chatbotConversationId: string | null;
  assistantSent: boolean;
}> {
  const settings = ensureWorkspaceWhatsApp(input.workspaceId);
  if (!settings.chatbotEnabled) {
    return { chatbotConversationId: null, assistantSent: false };
  }

  const content = (input.inboundMessage.content || "").trim();
  if (!content) {
    return {
      chatbotConversationId: input.conversation.chatbotConversationId,
      assistantSent: false,
    };
  }

  const botId = resolveBotId(input.workspaceId, settings.defaultChatbotBotId);
  if (!botId) {
    return {
      chatbotConversationId: input.conversation.chatbotConversationId,
      assistantSent: false,
    };
  }

  // Keep chatbot channel status in sync with Integrations.
  try {
    updateChannel(botId, input.workspaceId, "whatsapp", {
      status: "connected",
      config: {
        workspaceId: input.workspaceId,
        phoneNumberId: settings.phoneNumberId,
        wabaId: settings.wabaId,
        verifyToken: settings.verifyToken,
        source: "whatsapp_integration",
      },
    });
  } catch {
    // Channel row may not exist yet for brand-new bots; ignore.
  }

  let chatbotConversationId = input.conversation.chatbotConversationId;
  let chatbotConversation = chatbotConversationId
    ? getChatbotConversationById(chatbotConversationId)
    : null;

  if (!chatbotConversation || chatbotConversation.workspaceId !== input.workspaceId) {
    chatbotConversation =
      findChatbotConversationByExternalThread(
        input.workspaceId,
        input.contact.waId,
      ) || null;
  }

  if (!chatbotConversation) {
    chatbotConversation = createChatbotConversation({
      botId,
      workspaceId: input.workspaceId,
      channel: "whatsapp",
      visitorName: input.contact.profileName,
      visitorPhone: input.contact.phone.startsWith("+")
        ? input.contact.phone
        : `+${input.contact.phone}`,
      externalThreadId: input.contact.waId,
      metadata: {
        whatsappConversationId: input.conversation.id,
        whatsappContactId: input.contact.id,
        crmContactId: input.contact.crmContactId,
        crmLeadId: input.contact.crmLeadId,
      },
    });
  }

  chatbotConversationId = chatbotConversation.id;
  updateConversation(input.conversation.id, input.workspaceId, {
    chatbotConversationId,
  });

  const result = await handleVisitorMessage({
    conversationId: chatbotConversationId,
    content,
  });

  if (result.assistantMessage?.content) {
    await sendWhatsAppText({
      workspaceId: input.workspaceId,
      to: input.contact.waId,
      text: result.assistantMessage.content,
      profileName: input.contact.profileName,
    });
    return { chatbotConversationId, assistantSent: true };
  }

  return { chatbotConversationId, assistantSent: false };
}
