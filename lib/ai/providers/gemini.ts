import type { AiProvider } from "@/lib/ai/providers/types";
import type {
  AiChatMessage,
  AiChatResult,
  AiStreamChunk,
  AiToolCall,
} from "@/lib/ai/types";

function toGeminiContents(messages: AiChatMessage[]) {
  const systemParts = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .filter(Boolean);

  const contents: Array<{
    role: "user" | "model";
    parts: Array<Record<string, unknown>>;
  }> = [];

  for (const message of messages) {
    if (message.role === "system") continue;
    if (message.role === "tool") {
      contents.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              name: message.name || "tool",
              response: { result: message.content },
            },
          },
        ],
      });
      continue;
    }
    contents.push({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    });
  }

  return { systemParts, contents };
}

function parseGeminiToolCalls(candidate: {
  content?: {
    parts?: Array<{
      text?: string;
      functionCall?: { name?: string; args?: Record<string, unknown> };
    }>;
  };
}): { content: string; toolCalls: AiToolCall[] } {
  const parts = candidate.content?.parts || [];
  const text = parts
    .map((part) => part.text || "")
    .join("")
    .trim();
  const toolCalls = parts
    .filter((part) => part.functionCall?.name)
    .map((part, index) => ({
      id: `gemini_call_${index}`,
      name: part.functionCall!.name!,
      arguments: part.functionCall!.args || {},
    }));
  return { content: text, toolCalls };
}

export const geminiProvider: AiProvider = {
  id: "gemini",
  async chat(messages, config) {
    const base = (
      config.baseUrl || "https://generativelanguage.googleapis.com/v1beta"
    ).replace(/\/$/, "");
    const { systemParts, contents } = toGeminiContents(messages);

    const url = `${base}/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: systemParts.length
          ? { parts: [{ text: systemParts.join("\n\n") }] }
          : undefined,
        tools: config.tools?.length
          ? [
              {
                functionDeclarations: config.tools.map((tool) => ({
                  name: tool.name,
                  description: tool.description,
                  parameters: tool.parameters,
                })),
              },
            ]
          : undefined,
        generationConfig: {
          temperature: config.temperature ?? 0.4,
        },
      }),
    });

    const data = (await response.json()) as {
      error?: { message?: string };
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
            functionCall?: { name?: string; args?: Record<string, unknown> };
          }>;
        };
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };

    if (!response.ok) {
      throw new Error(
        data.error?.message || `Gemini request failed (${response.status}).`,
      );
    }

    const parsed = parseGeminiToolCalls(data.candidates?.[0] || {});
    if (!parsed.content && !parsed.toolCalls.length) {
      throw new Error("Gemini returned an empty response.");
    }

    return {
      content: parsed.content,
      provider: "gemini",
      model: config.model,
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens:
          data.usageMetadata?.totalTokenCount ??
          (data.usageMetadata?.promptTokenCount ?? 0) +
            (data.usageMetadata?.candidatesTokenCount ?? 0),
      },
      toolCalls: parsed.toolCalls.length ? parsed.toolCalls : undefined,
    } satisfies AiChatResult;
  },

  async *chatStream(messages, config): AsyncGenerator<AiStreamChunk> {
    const base = (
      config.baseUrl || "https://generativelanguage.googleapis.com/v1beta"
    ).replace(/\/$/, "");
    const { systemParts, contents } = toGeminiContents(messages);
    const url = `${base}/models/${encodeURIComponent(config.model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(config.apiKey)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: systemParts.length
          ? { parts: [{ text: systemParts.join("\n\n") }] }
          : undefined,
        tools: config.tools?.length
          ? [
              {
                functionDeclarations: config.tools.map((tool) => ({
                  name: tool.name,
                  description: tool.description,
                  parameters: tool.parameters,
                })),
              },
            ]
          : undefined,
        generationConfig: {
          temperature: config.temperature ?? 0.4,
        },
      }),
    });

    if (!response.ok || !response.body) {
      const data = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      yield {
        type: "error",
        message:
          data.error?.message || `Gemini stream failed (${response.status}).`,
      };
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    const toolCalls: AiToolCall[] = [];
    let usage:
      | { inputTokens: number; outputTokens: number; totalTokens: number }
      | undefined;

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
        if (!payload || payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload) as {
            candidates?: Array<{
              content?: {
                parts?: Array<{
                  text?: string;
                  functionCall?: {
                    name?: string;
                    args?: Record<string, unknown>;
                  };
                }>;
              };
            }>;
            usageMetadata?: {
              promptTokenCount?: number;
              candidatesTokenCount?: number;
              totalTokenCount?: number;
            };
          };
          const parts = json.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.text) {
              content += part.text;
              yield { type: "delta", text: part.text };
            }
            if (part.functionCall?.name) {
              toolCalls.push({
                id: `gemini_call_${toolCalls.length}`,
                name: part.functionCall.name,
                arguments: part.functionCall.args || {},
              });
            }
          }
          if (json.usageMetadata) {
            usage = {
              inputTokens: json.usageMetadata.promptTokenCount ?? 0,
              outputTokens: json.usageMetadata.candidatesTokenCount ?? 0,
              totalTokens:
                json.usageMetadata.totalTokenCount ??
                (json.usageMetadata.promptTokenCount ?? 0) +
                  (json.usageMetadata.candidatesTokenCount ?? 0),
            };
          }
        } catch {
          // ignore malformed SSE chunks
        }
      }
    }

    if (toolCalls.length) {
      yield { type: "tool_calls", toolCalls };
    }
    yield {
      type: "done",
      content,
      model: config.model,
      usage,
      toolCalls: toolCalls.length ? toolCalls : undefined,
    };
  },
};
