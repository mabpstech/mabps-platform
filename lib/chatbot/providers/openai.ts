import type { AiProvider } from "@/lib/chatbot/providers/types";

export const openaiProvider: AiProvider = {
  id: "openai",
  async chat(messages, config) {
    const base = (config.baseUrl || "https://api.openai.com/v1").replace(
      /\/$/,
      "",
    );
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: config.temperature ?? 0.4,
        messages,
      }),
    });

    const data = (await response.json()) as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
      model?: string;
    };

    if (!response.ok) {
      throw new Error(
        data.error?.message || `OpenAI request failed (${response.status}).`,
      );
    }

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("OpenAI returned an empty response.");
    }

    return {
      content,
      provider: "openai",
      model: data.model || config.model,
    };
  },
};
