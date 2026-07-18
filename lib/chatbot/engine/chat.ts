import { HANDOFF_KEYWORDS } from "@/lib/chatbot/defaults";
import {
  ensureCrmLeadForConversation,
  extractLeadHints,
} from "@/lib/chatbot/engine/leads";
import {
  formatMemoryForPrompt,
  rememberFromUserText,
} from "@/lib/chatbot/engine/memory";
import {
  formatKnowledgeContext,
  retrieveRelevantChunks,
} from "@/lib/chatbot/knowledge/retrieve";
import {
  defaultModelForProvider,
  runAiChat,
} from "@/lib/chatbot/providers";
import {
  claimHandoff,
  createHandoff,
  createMessage,
  getBotById,
  getConversationById,
  getOpenHandoff,
  getProviderCredential,
  listKnowledgeChunks,
  listMessages,
} from "@/lib/chatbot/repository";
import { searchKnowledgeForChatbot } from "@/lib/knowledge";
import type {
  AiChatMessage,
  ChatbotConversation,
  ChatbotMessage,
} from "@/lib/chatbot/types";

function wantsHandoff(text: string): boolean {
  const lowered = text.toLowerCase();
  return HANDOFF_KEYWORDS.some((keyword) => lowered.includes(keyword));
}

function kbOnlyAnswer(
  fallbackMessage: string,
  context: string,
): string {
  if (!context) return fallbackMessage;
  const first = context.split("\n\n")[0]?.replace(/^\[Source \d+\]\n/, "") || "";
  if (!first.trim()) return fallbackMessage;
  return `Based on our knowledge base:\n\n${first.trim()}\n\nIf you need more help, ask to speak with a human.`;
}

export async function handleVisitorMessage(input: {
  conversationId: string;
  content: string;
}): Promise<{
  conversation: ChatbotConversation;
  userMessage: ChatbotMessage;
  assistantMessage: ChatbotMessage | null;
  handoffRequested: boolean;
}> {
  const conversation = getConversationById(input.conversationId);
  if (!conversation) throw new Error("Conversation not found.");

  const bot = getBotById(conversation.botId);
  if (!bot) throw new Error("Bot not found.");
  if (bot.status !== "active") {
    throw new Error("This chatbot is not active.");
  }

  const userMessage = createMessage({
    conversationId: conversation.id,
    botId: bot.id,
    workspaceId: conversation.workspaceId,
    role: "user",
    content: input.content,
    channel: conversation.channel,
  });

  const visitorKey = conversation.visitorId || conversation.id;
  if (bot.memoryEnabled) {
    rememberFromUserText({
      botId: bot.id,
      workspaceId: conversation.workspaceId,
      visitorKey,
      text: input.content,
    });
  }

  const hints = extractLeadHints(input.content);
  let latest = ensureCrmLeadForConversation({
    bot,
    conversation,
    hints,
  });

  if (
    bot.handoffEnabled &&
    wantsHandoff(input.content) &&
    latest.status === "ai"
  ) {
    createHandoff({
      conversationId: latest.id,
      botId: bot.id,
      workspaceId: latest.workspaceId,
      reason: input.content.slice(0, 240),
    });
    const assistantMessage = createMessage({
      conversationId: latest.id,
      botId: bot.id,
      workspaceId: latest.workspaceId,
      role: "assistant",
      content:
        "I am connecting you with a human teammate. They will continue this conversation shortly.",
      channel: latest.channel,
      metadata: { handoff: true },
    });
    return {
      conversation: getConversationById(latest.id)!,
      userMessage,
      assistantMessage,
      handoffRequested: true,
    };
  }

  if (latest.status === "human" || latest.status === "handoff_requested") {
    return {
      conversation: latest,
      userMessage,
      assistantMessage: null,
      handoffRequested: Boolean(getOpenHandoff(latest.id)),
    };
  }

  const botChunks = retrieveRelevantChunks(
    input.content,
    listKnowledgeChunks(bot.id),
    5,
  );
  const botKnowledgeContext = formatKnowledgeContext(botChunks);
  const workspaceKb = await searchKnowledgeForChatbot({
    workspaceId: bot.workspaceId,
    query: input.content,
    limit: 5,
  });
  const knowledgeContext = [
    workspaceKb.context,
    botKnowledgeContext,
  ]
    .filter(Boolean)
    .join("\n\n");
  const memoryContext = bot.memoryEnabled
    ? formatMemoryForPrompt(bot.id, visitorKey)
    : "";

  const history = listMessages(latest.id)
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-12)
    .map((message) => ({
      role: message.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: message.content,
    }));

  const systemParts = [
    bot.systemPrompt,
    knowledgeContext
      ? `Knowledge base context:\n${knowledgeContext}`
      : "No knowledge base context matched this question.",
    memoryContext ? `Known visitor memory:\n${memoryContext}` : "",
    "If the visitor asks for a human, acknowledge and confirm handoff.",
  ].filter(Boolean);

  const messages: AiChatMessage[] = [
    { role: "system", content: systemParts.join("\n\n") },
    ...history,
  ];

  let replyText = kbOnlyAnswer(bot.fallbackMessage, knowledgeContext);
  let provider = bot.provider;
  let model = bot.model || defaultModelForProvider(bot.provider);

  const credential = getProviderCredential(bot.workspaceId, bot.provider);
  if (credential?.isActive && credential.apiKey) {
    try {
      const result = await runAiChat(messages, {
        provider: bot.provider,
        apiKey: credential.apiKey,
        baseUrl: credential.baseUrl,
        model: bot.model || credential.defaultModel || model,
        temperature: bot.temperature,
      });
      replyText = result.content;
      provider = result.provider;
      model = result.model;
    } catch (error) {
      console.error("[chatbot/ai]", error);
      replyText = kbOnlyAnswer(
        `${bot.fallbackMessage} (AI provider temporarily unavailable.)`,
        knowledgeContext,
      );
    }
  }

  const assistantMessage = createMessage({
    conversationId: latest.id,
    botId: bot.id,
    workspaceId: latest.workspaceId,
    role: "assistant",
    content: replyText,
    channel: latest.channel,
    provider,
    model,
    metadata: {
      knowledgeChunkIds: [
        ...workspaceKb.chunkIds,
        ...botChunks.map((chunk) => chunk.id),
      ],
    },
  });

  return {
    conversation: getConversationById(latest.id)!,
    userMessage,
    assistantMessage,
    handoffRequested: false,
  };
}

export async function handleAgentReply(input: {
  conversationId: string;
  workspaceId: string;
  agentUserId: string;
  content: string;
}): Promise<ChatbotMessage> {
  const conversation = getConversationById(input.conversationId);
  if (!conversation || conversation.workspaceId !== input.workspaceId) {
    throw new Error("Conversation not found.");
  }

  if (
    conversation.status !== "human" &&
    conversation.status !== "handoff_requested"
  ) {
    throw new Error("Conversation is not in human handoff mode.");
  }

  const open = getOpenHandoff(conversation.id);
  if (open && open.status === "requested") {
    claimHandoff(open.id, input.workspaceId, input.agentUserId);
  }

  return createMessage({
    conversationId: conversation.id,
    botId: conversation.botId,
    workspaceId: conversation.workspaceId,
    role: "human_agent",
    content: input.content,
    channel: conversation.channel,
    metadata: { agentUserId: input.agentUserId },
  });
}
