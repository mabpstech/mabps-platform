export const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant for this business.
Answer using the provided knowledge base context when available.
If you do not know the answer, say so clearly and offer to connect the visitor with a human.
Be concise, professional, and friendly.
When the visitor shares their name, email, or phone, acknowledge it.`;

export const DEFAULT_BOT_MODEL: Record<string, string> = {
  openai: "gpt-4o-mini",
  gemini: "gemini-2.0-flash",
  openrouter: "openai/gpt-4o-mini",
};

export function slugifyBotName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "bot";
}

export const HANDOFF_KEYWORDS = [
  "human",
  "agent",
  "representative",
  "support person",
  "real person",
  "talk to someone",
  "speak to someone",
  "customer service",
];
