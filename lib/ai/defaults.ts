import type { AiProviderId } from "@/lib/ai/types";

export const DEFAULT_AI_MODEL: Record<AiProviderId, string> = {
  openai: "gpt-4o-mini",
  gemini: "gemini-2.0-flash",
  openrouter: "openai/gpt-4o-mini",
};

export const AI_MODEL_OPTIONS: Record<
  AiProviderId,
  Array<{ id: string; label: string }>
> = {
  openai: [
    { id: "gpt-4o-mini", label: "GPT-4o mini" },
    { id: "gpt-4o", label: "GPT-4o" },
    { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
  ],
  gemini: [
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
    { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  ],
  openrouter: [
    { id: "openai/gpt-4o-mini", label: "OpenAI GPT-4o mini" },
    { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
    { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
  ],
};

export const DEFAULT_SYSTEM_PROMPT = `You are the MABPS workspace AI assistant.
Help workspace members operate CRM, chatbot, knowledge base, memory, automations, website sites, analytics, and billing.
Use tools when you need live workspace data. Prefer concise, actionable answers.
Never invent IDs or records — look them up with tools first.
If a tool fails or data is missing, say so clearly.`;

export const DEFAULT_WORKSPACE_PROMPT = `Workspace context:
- Be practical and business-focused.
- When summarizing CRM or chatbot activity, highlight next actions.
- Respect plan limits and billing constraints when advising on AI usage.`;

export function slugifyPromptName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "prompt"
  );
}

export function estimateCredits(totalTokens: number): number {
  if (totalTokens <= 0) return 1;
  return Math.max(1, Math.ceil(totalTokens / 1000));
}

export function currentPeriodKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return "••••••••";
  return `${apiKey.slice(0, 4)}…${apiKey.slice(-4)}`;
}
