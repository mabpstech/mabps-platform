import type { AiProvider } from "@/lib/chatbot/providers/types";

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
        "HTTP-Referer":
          process.env.BETTER_AUTH_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          "http://localhost:3000",
        "X-Title": "MABPS Chatbot",
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
        data.error?.message ||
          `OpenRouter request failed (${response.status}).`,
      );
    }

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("OpenRouter returned an empty response.");
    }

    return {
      content,
      provider: "openrouter",
      model: data.model || config.model,
    };
  },
};
