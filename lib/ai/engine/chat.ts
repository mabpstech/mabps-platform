import {
  defaultModelForProvider,
  runAiChat,
  streamAiChat,
} from "@/lib/ai/providers";
import type { AiProviderConfig } from "@/lib/ai/providers/types";
import { buildAssistantSystemMessages } from "@/lib/ai/engine/prompts";
import {
  assertAiCreditsAvailable,
  recordAssistantUsage,
} from "@/lib/ai/engine/usage";
import {
  createMessage,
  ensureWorkspaceAi,
  getAiSettings,
  getConversationById,
  listMessages,
  resolveProviderCredential,
  updateConversation,
} from "@/lib/ai/repository";
import { executeAiTool, listAiTools } from "@/lib/ai/tools";
import type {
  AiChatMessage,
  AiConversation,
  AiMessage,
  AiProviderId,
  AiStreamChunk,
  AiToolCall,
} from "@/lib/ai/types";

function toChatMessages(messages: AiMessage[]): AiChatMessage[] {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role:
        message.role === "tool"
          ? ("tool" as const)
          : message.role === "assistant"
            ? ("assistant" as const)
            : ("user" as const),
      content: message.content,
      name: message.toolName || undefined,
      toolCallId: message.toolCallId || undefined,
    }));
}

function resolveRuntimeConfig(input: {
  workspaceId: string;
  provider?: AiProviderId | null;
  model?: string | null;
}): AiProviderConfig & { settingsToolsEnabled: boolean; maxToolRounds: number } {
  const settings = ensureWorkspaceAi(input.workspaceId);
  const provider = input.provider || settings.defaultProvider;
  const credential = resolveProviderCredential(input.workspaceId, provider);
  if (!credential) {
    throw new Error(
      `No active API key for provider "${provider}". Add one in AI settings or Chatbot providers.`,
    );
  }

  const model =
    input.model ||
    settings.defaultModel ||
    credential.defaultModel ||
    defaultModelForProvider(provider);

  return {
    provider,
    apiKey: credential.apiKey,
    baseUrl: credential.baseUrl,
    model,
    temperature: settings.temperature,
    tools: settings.toolsEnabled ? listAiTools() : undefined,
    settingsToolsEnabled: settings.toolsEnabled,
    maxToolRounds: settings.maxToolRounds,
  };
}

async function runToolRound(input: {
  workspaceId: string;
  userId: string;
  conversationId: string;
  toolCalls: AiToolCall[];
}): Promise<AiMessage[]> {
  const toolMessages: AiMessage[] = [];
  for (const call of input.toolCalls) {
    const result = await executeAiTool(
      { workspaceId: input.workspaceId, userId: input.userId },
      call.name,
      call.arguments,
    );
    const content = JSON.stringify(
      result.ok
        ? { ok: true, output: result.output }
        : { ok: false, error: result.error },
    );
    toolMessages.push(
      createMessage({
        conversationId: input.conversationId,
        workspaceId: input.workspaceId,
        role: "tool",
        content,
        toolName: call.name,
        toolCallId: call.id,
        metadata: { arguments: call.arguments },
      }),
    );
  }
  return toolMessages;
}

export async function handleAssistantMessage(input: {
  conversationId: string;
  workspaceId: string;
  userId: string;
  content: string;
  provider?: AiProviderId | null;
  model?: string | null;
  workspaceName?: string;
}): Promise<{
  conversation: AiConversation;
  userMessage: AiMessage;
  assistantMessage: AiMessage;
  toolNames: string[];
}> {
  const conversation = getConversationById(input.conversationId);
  if (!conversation || conversation.workspaceId !== input.workspaceId) {
    throw new Error("Conversation not found.");
  }

  assertAiCreditsAvailable(input.workspaceId, 1);

  const userMessage = createMessage({
    conversationId: conversation.id,
    workspaceId: input.workspaceId,
    role: "user",
    content: input.content.trim(),
  });

  if (conversation.title === "New chat") {
    updateConversation(conversation.id, input.workspaceId, {
      title: input.content.trim().slice(0, 80) || "New chat",
    });
  }

  const started = Date.now();
  const config = resolveRuntimeConfig({
    workspaceId: input.workspaceId,
    provider: input.provider || conversation.provider,
    model: input.model || conversation.model,
  });

  const systemMessages = buildAssistantSystemMessages(
    input.workspaceId,
    input.workspaceName,
  );

  let history = toChatMessages(listMessages(conversation.id));
  let rounds = 0;
  let finalContent = "";
  let finalModel = config.model;
  let inputTokens = 0;
  let outputTokens = 0;
  const toolNames: string[] = [];

  try {
    while (rounds <= config.maxToolRounds) {
      const result = await runAiChat([...systemMessages, ...history], {
        provider: config.provider,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.model,
        temperature: config.temperature,
        tools: config.tools,
      });

      finalModel = result.model;
      inputTokens += result.usage?.inputTokens ?? 0;
      outputTokens += result.usage?.outputTokens ?? 0;

      if (result.toolCalls?.length && config.settingsToolsEnabled) {
        for (const call of result.toolCalls) toolNames.push(call.name);
        if (result.content) {
          createMessage({
            conversationId: conversation.id,
            workspaceId: input.workspaceId,
            role: "assistant",
            content: result.content,
            metadata: { toolCalls: result.toolCalls },
          });
        }
        await runToolRound({
          workspaceId: input.workspaceId,
          userId: input.userId,
          conversationId: conversation.id,
          toolCalls: result.toolCalls,
        });
        history = toChatMessages(listMessages(conversation.id));
        rounds += 1;
        continue;
      }

      finalContent = result.content;
      break;
    }

    if (!finalContent.trim()) {
      finalContent =
        "I looked through the available tools but could not produce a final answer. Try rephrasing your request.";
    }

    const assistantMessage = createMessage({
      conversationId: conversation.id,
      workspaceId: input.workspaceId,
      role: "assistant",
      content: finalContent,
      metadata: { toolNames },
    });

    updateConversation(conversation.id, input.workspaceId, {
      provider: config.provider,
      model: finalModel,
    });

    recordAssistantUsage({
      workspaceId: input.workspaceId,
      userId: input.userId,
      conversationId: conversation.id,
      provider: config.provider,
      model: finalModel,
      operation: "assistant_chat",
      status: "success",
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      latencyMs: Date.now() - started,
      requestSummary: input.content.slice(0, 240),
      responseSummary: finalContent.slice(0, 240),
      toolNames,
    });

    return {
      conversation: getConversationById(conversation.id)!,
      userMessage,
      assistantMessage,
      toolNames,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI Assistant request failed.";
    recordAssistantUsage({
      workspaceId: input.workspaceId,
      userId: input.userId,
      conversationId: conversation.id,
      provider: config.provider,
      model: finalModel,
      operation: "assistant_chat",
      status: "error",
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      latencyMs: Date.now() - started,
      errorMessage: message,
      requestSummary: input.content.slice(0, 240),
      toolNames,
    });
    throw error;
  }
}

export async function* streamAssistantMessage(input: {
  conversationId: string;
  workspaceId: string;
  userId: string;
  content: string;
  provider?: AiProviderId | null;
  model?: string | null;
  workspaceName?: string;
}): AsyncGenerator<
  | AiStreamChunk
  | { type: "user_message"; message: AiMessage }
  | { type: "assistant_message"; message: AiMessage }
  | { type: "tools"; toolNames: string[] },
  void,
  unknown
> {
  const conversation = getConversationById(input.conversationId);
  if (!conversation || conversation.workspaceId !== input.workspaceId) {
    yield { type: "error", message: "Conversation not found." };
    return;
  }

  const settings = getAiSettings(input.workspaceId) || ensureWorkspaceAi(input.workspaceId);
  if (!settings.streamingEnabled) {
    const result = await handleAssistantMessage(input);
    yield { type: "user_message", message: result.userMessage };
    yield { type: "delta", text: result.assistantMessage.content };
    yield {
      type: "done",
      content: result.assistantMessage.content,
      model: result.conversation.model || "unknown",
    };
    yield { type: "assistant_message", message: result.assistantMessage };
    return;
  }

  try {
    assertAiCreditsAvailable(input.workspaceId, 1);
  } catch (error) {
    yield {
      type: "error",
      message:
        error instanceof Error ? error.message : "AI credit limit exceeded.",
    };
    return;
  }

  const userMessage = createMessage({
    conversationId: conversation.id,
    workspaceId: input.workspaceId,
    role: "user",
    content: input.content.trim(),
  });
  yield { type: "user_message", message: userMessage };

  if (conversation.title === "New chat") {
    updateConversation(conversation.id, input.workspaceId, {
      title: input.content.trim().slice(0, 80) || "New chat",
    });
  }

  const started = Date.now();
  const config = resolveRuntimeConfig({
    workspaceId: input.workspaceId,
    provider: input.provider || conversation.provider,
    model: input.model || conversation.model,
  });
  const systemMessages = buildAssistantSystemMessages(
    input.workspaceId,
    input.workspaceName,
  );

  let history = toChatMessages(listMessages(conversation.id));
  let rounds = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  const toolNames: string[] = [];

  try {
    // Resolve tool calls non-streaming, then stream the final answer.
    while (rounds < config.maxToolRounds && config.settingsToolsEnabled) {
      const probe = await runAiChat([...systemMessages, ...history], {
        provider: config.provider,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.model,
        temperature: config.temperature,
        tools: config.tools,
      });
      inputTokens += probe.usage?.inputTokens ?? 0;
      outputTokens += probe.usage?.outputTokens ?? 0;

      if (!probe.toolCalls?.length) {
        if (probe.content) {
          const assistantMessage = createMessage({
            conversationId: conversation.id,
            workspaceId: input.workspaceId,
            role: "assistant",
            content: probe.content,
            metadata: { toolNames, streamed: false },
          });
          updateConversation(conversation.id, input.workspaceId, {
            provider: config.provider,
            model: probe.model,
          });
          recordAssistantUsage({
            workspaceId: input.workspaceId,
            userId: input.userId,
            conversationId: conversation.id,
            provider: config.provider,
            model: probe.model,
            operation: "assistant_chat_stream",
            status: "success",
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
            latencyMs: Date.now() - started,
            requestSummary: input.content.slice(0, 240),
            responseSummary: probe.content.slice(0, 240),
            toolNames,
          });
          yield { type: "delta", text: probe.content };
          yield {
            type: "done",
            content: probe.content,
            model: probe.model,
            usage: probe.usage,
          };
          yield { type: "assistant_message", message: assistantMessage };
          if (toolNames.length) yield { type: "tools", toolNames };
          return;
        }
        break;
      }

      for (const call of probe.toolCalls) toolNames.push(call.name);
      yield { type: "tools", toolNames: [...toolNames] };
      if (probe.content) {
        createMessage({
          conversationId: conversation.id,
          workspaceId: input.workspaceId,
          role: "assistant",
          content: probe.content,
          metadata: { toolCalls: probe.toolCalls },
        });
      }
      await runToolRound({
        workspaceId: input.workspaceId,
        userId: input.userId,
        conversationId: conversation.id,
        toolCalls: probe.toolCalls,
      });
      history = toChatMessages(listMessages(conversation.id));
      rounds += 1;
    }

    let content = "";
    let model = config.model;
    let streamUsage:
      | { inputTokens: number; outputTokens: number; totalTokens: number }
      | undefined;

    for await (const chunk of streamAiChat([...systemMessages, ...history], {
      provider: config.provider,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      temperature: config.temperature,
      // Final streamed turn without tools to avoid mid-stream tool loops.
      tools: undefined,
    })) {
      if (chunk.type === "delta") {
        content += chunk.text;
        yield chunk;
      } else if (chunk.type === "error") {
        yield chunk;
        recordAssistantUsage({
          workspaceId: input.workspaceId,
          userId: input.userId,
          conversationId: conversation.id,
          provider: config.provider,
          model,
          operation: "assistant_chat_stream",
          status: "error",
          inputTokens,
          outputTokens,
          errorMessage: chunk.message,
          requestSummary: input.content.slice(0, 240),
          toolNames,
          latencyMs: Date.now() - started,
        });
        return;
      } else if (chunk.type === "done") {
        content = chunk.content || content;
        model = chunk.model || model;
        streamUsage = chunk.usage;
        yield chunk;
      }
    }

    if (!content.trim()) {
      content =
        "I could not generate a streamed response. Please try again.";
    }

    const assistantMessage = createMessage({
      conversationId: conversation.id,
      workspaceId: input.workspaceId,
      role: "assistant",
      content,
      metadata: { toolNames, streamed: true },
    });

    updateConversation(conversation.id, input.workspaceId, {
      provider: config.provider,
      model,
    });

    inputTokens += streamUsage?.inputTokens ?? 0;
    outputTokens += streamUsage?.outputTokens ?? 0;

    recordAssistantUsage({
      workspaceId: input.workspaceId,
      userId: input.userId,
      conversationId: conversation.id,
      provider: config.provider,
      model,
      operation: "assistant_chat_stream",
      status: "success",
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      latencyMs: Date.now() - started,
      requestSummary: input.content.slice(0, 240),
      responseSummary: content.slice(0, 240),
      toolNames,
    });

    yield { type: "assistant_message", message: assistantMessage };
    if (toolNames.length) yield { type: "tools", toolNames };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI Assistant stream failed.";
    recordAssistantUsage({
      workspaceId: input.workspaceId,
      userId: input.userId,
      conversationId: conversation.id,
      provider: config.provider,
      model: config.model,
      operation: "assistant_chat_stream",
      status: "error",
      errorMessage: message,
      requestSummary: input.content.slice(0, 240),
      toolNames,
      latencyMs: Date.now() - started,
    });
    yield { type: "error", message };
  }
}
