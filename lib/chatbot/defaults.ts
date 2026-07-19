import { DEFAULT_AI_MODEL } from "@/lib/ai/defaults";

export const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant for this business.
Answer using the provided knowledge base context when available.
If you do not know the answer, say so clearly and offer to connect the visitor with a human.
Be concise, professional, and friendly.
When the visitor shares their name, email, or phone, acknowledge it.`;

/** Same model IDs as the AI assistant stack (`lib/ai/defaults`). */
export const DEFAULT_BOT_MODEL = DEFAULT_AI_MODEL;

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
