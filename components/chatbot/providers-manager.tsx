"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
  authSecondaryButtonClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";
import type {
  AiProviderId,
  ChatbotProviderCredentialPublic,
} from "@/lib/chatbot/types";
import { AI_PROVIDERS } from "@/lib/chatbot/types";

export function ProvidersManager({
  credentials,
  canManage,
}: {
  credentials: ChatbotProviderCredentialPublic[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [provider, setProvider] = useState<AiProviderId>("openai");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [defaultModel, setDefaultModel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/chatbot/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey,
          baseUrl: baseUrl || null,
          defaultModel: defaultModel || null,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save provider.");
      setApiKey("");
      setSuccess("Provider credential saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save provider.");
    } finally {
      setPending(false);
    }
  }

  async function remove(target: AiProviderId) {
    if (!canManage) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/chatbot/providers?provider=${encodeURIComponent(target)}`,
        { method: "DELETE" },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to delete.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">AI providers</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Abstracted providers: OpenAI, Gemini, and OpenRouter. Keys are stored
          per workspace.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      <form
        onSubmit={save}
        className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2"
      >
        <div>
          <label className={authLabelClassName}>Provider</label>
          <select
            className={authInputClassName}
            value={provider}
            onChange={(e) => setProvider(e.target.value as AiProviderId)}
            disabled={pending || !canManage}
          >
            {AI_PROVIDERS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={authLabelClassName}>Default model</label>
          <input
            className={authInputClassName}
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
            placeholder="Optional"
            disabled={pending || !canManage}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={authLabelClassName}>API key</label>
          <input
            className={authInputClassName}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
            disabled={pending || !canManage}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={authLabelClassName}>Base URL (optional)</label>
          <input
            className={authInputClassName}
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="Leave blank for provider default"
            disabled={pending || !canManage}
          />
        </div>
        <div>
          <button
            type="submit"
            className={`${authButtonClassName} !w-auto px-4`}
            disabled={pending || !canManage}
          >
            Save credential
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Model</th>
              <th className="px-4 py-3 font-medium">Key</th>
              <th className="px-4 py-3 font-medium">Active</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {credentials.map((credential) => (
              <tr key={credential.id} className="border-b border-zinc-100">
                <td className="px-4 py-3 font-medium text-zinc-900">
                  {credential.provider}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {credential.defaultModel || "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                  {credential.hasApiKey
                    ? `••••${credential.apiKeyLast4 || ""}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {credential.isActive ? "yes" : "no"}
                </td>
                <td className="px-4 py-3">
                  {canManage ? (
                    <button
                      type="button"
                      className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5`}
                      onClick={() => remove(credential.provider)}
                      disabled={pending}
                    >
                      Remove
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {!credentials.length ? (
              <tr>
                <td className="px-4 py-8 text-zinc-500" colSpan={5}>
                  No provider credentials configured.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
