import type { AiProvider } from "@/lib/ai/providers/types";
import type { AiChatResult, AiStreamChunk, AiToolCall } from "@/lib/ai/types";

function mapMessages(
  messages: Array<{
    role: string;
    content: string;
    toolCallId?: string;
  }>,
) {
  return messages.map((message) => {
    if (message.role === "tool") {
      return {
        role: "tool" as const,
        content: message.content,
        tool_call_id: message.toolCallId || "tool",
      };
    }
    return {
      role: message.role,
      content: message.content,
    };
  });
}

function parseToolCalls(
  raw: Array<{
    id?: string;
    function?: { name?: string; arguments?: string };
  }> | null
  | undefined,
): AiToolCall[] {
  if (!raw?.length) return [];
  return raw
    .map((call, index) => {
      let args: Record<string, unknown> = {};
      try {
        args = call.function?.arguments
          ? (JSON.parse(call.function.arguments) as Record<string, unknown>)
          : {};
      } catch {
        args = { raw: call.function?.arguments || "" };
      }
      return {
        id: call.id || `call_${index}`,
        name: call.function?.name || "",
        arguments: args,
      };
    })
    .filter((call) => call.name);
}

function appReferer(): string {
  return (
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  );
}

export const openrouterProvider: AiProvider = {
  id: "openrouter",
  async chat(messages, config) {
    const base = (config.baseUrl || "https://openrouter.ai/api/v1").replace(
      /\/$/,
      "",
    );
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": appReferer(),
        "X-Title": "MABPS AI Assistant",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: config.temperature ?? 0.4,
        messages: mapMessages(messages),
        tools: config.tools?.length
          ? config.tools.map((tool) => ({
              type: "function",
              function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
              },
            }))
          : undefined,
      }),
    });

    const data = (await response.json()) as {
      error?: { message?: string };
      choices?: Array<{
        message?: {
          content?: string | null;
          tool_calls?: Array<{
            id?: string;
            function?: { name?: string; arguments?: string };
          }>;
        };
      }>;
      model?: string;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    if (!response.ok) {
      throw new Error(
        data.error?.message ||
          `OpenRouter request failed (${response.status}).`,
      );
    }

    const message = data.choices?.[0]?.message;
    const toolCalls = parseToolCalls(message?.tool_calls);
    const content = message?.content?.trim() || "";

    if (!content && !toolCalls.length) {
      throw new Error("OpenRouter returned an empty response.");
    }

    return {
      content,
      provider: "openrouter",
      model: data.model || config.model,
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
        totalTokens:
          data.usage?.total_tokens ??
          (data.usage?.prompt_tokens ?? 0) +
            (data.usage?.completion_tokens ?? 0),
      },
      toolCalls: toolCalls.length ? toolCalls : undefined,
    } satisfies AiChatResult;
  },

  async *chatStream(messages, config): AsyncGenerator<AiStreamChunk> {
    const base = (config.baseUrl || "https://openrouter.ai/api/v1").replace(
      /\/$/,
      "",
    );
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": appReferer(),
        "X-Title": "MABPS AI Assistant",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: config.temperature ?? 0.4,
        messages: mapMessages(messages),
        tools: config.tools?.length
          ? config.tools.map((tool) => ({
              type: "function",
              function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
              },
            }))
          : undefined,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      const data = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      yield {
        type: "error",
        message:
          data.error?.message ||
          `OpenRouter stream failed (${response.status}).`,
      };
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    let model = config.model;
    let usage:
      | { inputTokens: number; outputTokens: number; totalTokens: number }
      | undefined;
    const toolCallBuffers = new Map<
      number,
      { id: string; name: string; arguments: string }
    >();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") {
          const toolCalls = [...toolCallBuffers.values()]
            .map((entry) => {
              let args: Record<string, unknown> = {};
              try {
                args = entry.arguments
                  ? (JSON.parse(entry.arguments) as Record<string, unknown>)
                  : {};
              } catch {
                args = { raw: entry.arguments };
              }
              return { id: entry.id, name: entry.name, arguments: args };
            })
            .filter((call) => call.name);
          if (toolCalls.length) {
            yield { type: "tool_calls", toolCalls };
          }
          yield {
            type: "done",
            content,
            model,
            usage,
            toolCalls: toolCalls.length ? toolCalls : undefined,
          };
          return;
        }

        try {
          const json = JSON.parse(payload) as {
            model?: string;
            choices?: Array<{
              delta?: {
                content?: string;
                tool_calls?: Array<{
                  index?: number;
                  id?: string;
                  function?: { name?: string; arguments?: string };
                }>;
              };
            }>;
            usage?: {
              prompt_tokens?: number;
              completion_tokens?: number;
              total_tokens?: number;
            };
          };
          if (json.model) model = json.model;
          const delta = json.choices?.[0]?.delta;
          if (delta?.content) {
            content += delta.content;
            yield { type: "delta", text: delta.content };
          }
          for (const toolDelta of delta?.tool_calls || []) {
            const index = toolDelta.index ?? 0;
            const existing = toolCallBuffers.get(index) || {
              id: toolDelta.id || `call_${index}`,
              name: "",
              arguments: "",
            };
            if (toolDelta.id) existing.id = toolDelta.id;
            if (toolDelta.function?.name) {
              existing.name += toolDelta.function.name;
            }
            if (toolDelta.function?.arguments) {
              existing.arguments += toolDelta.function.arguments;
            }
            toolCallBuffers.set(index, existing);
          }
          if (json.usage) {
            usage = {
              inputTokens: json.usage.prompt_tokens ?? 0,
              outputTokens: json.usage.completion_tokens ?? 0,
              totalTokens:
                json.usage.total_tokens ??
                (json.usage.prompt_tokens ?? 0) +
                  (json.usage.completion_tokens ?? 0),
            };
          }
        } catch {
          // ignore malformed SSE chunks
        }
      }
    }

    yield { type: "done", content, model, usage };
  },
};
