import type { AiProvider } from "@/lib/chatbot/providers/types";

export const geminiProvider: AiProvider = {
  id: "gemini",
  async chat(messages, config) {
    const base = (
      config.baseUrl || "https://generativelanguage.googleapis.com/v1beta"
    ).replace(/\/$/, "");

    const systemParts = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .filter(Boolean);
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const url = `${base}/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: systemParts.length
          ? { parts: [{ text: systemParts.join("\n\n") }] }
          : undefined,
        generationConfig: {
          temperature: config.temperature ?? 0.4,
        },
      }),
    });

    const data = (await response.json()) as {
      error?: { message?: string };
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    if (!response.ok) {
      throw new Error(
        data.error?.message || `Gemini request failed (${response.status}).`,
      );
    }

    const content = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

    if (!content) {
      throw new Error("Gemini returned an empty response.");
    }

    return {
      content,
      provider: "gemini",
      model: config.model,
    };
  },
};
