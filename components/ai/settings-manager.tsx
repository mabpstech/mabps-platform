"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";
import { AI_MODEL_OPTIONS } from "@/lib/ai/defaults";
import type { AiProviderCredentialPublic } from "@/lib/ai/repository";
import type { AiPrompt, AiProviderId, AiSettings } from "@/lib/ai/types";
import { AI_PROVIDERS } from "@/lib/ai/types";

export function SettingsManager({
  settings,
  credentials,
  prompts,
  canManage,
}: {
  settings: AiSettings;
  credentials: AiProviderCredentialPublic[];
  prompts: AiPrompt[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [defaultProvider, setDefaultProvider] = useState<AiProviderId>(
    settings.defaultProvider,
  );
  const [defaultModel, setDefaultModel] = useState(
    settings.defaultModel || AI_MODEL_OPTIONS[settings.defaultProvider][0]?.id,
  );
  const [temperature, setTemperature] = useState(String(settings.temperature));
  const [streamingEnabled, setStreamingEnabled] = useState(
    settings.streamingEnabled,
  );
  const [toolsEnabled, setToolsEnabled] = useState(settings.toolsEnabled);
  const [systemPromptId, setSystemPromptId] = useState(
    settings.systemPromptId || "",
  );
  const [maxToolRounds, setMaxToolRounds] = useState(
    String(settings.maxToolRounds),
  );

  const [provider, setProvider] = useState<AiProviderId>("openai");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [providerModel, setProviderModel] = useState(
    AI_MODEL_OPTIONS.openai[0]?.id || "",
  );

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/ai/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultProvider,
          defaultModel,
          temperature: Number(temperature),
          streamingEnabled,
          toolsEnabled,
          systemPromptId: systemPromptId || null,
          maxToolRounds: Number(maxToolRounds),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save settings.");
      setSuccess("Settings saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save settings.");
    } finally {
      setPending(false);
    }
  }

  async function saveCredential(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/ai/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey,
          baseUrl: baseUrl || null,
          defaultModel: providerModel || null,
          isActive: true,
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

  async function removeCredential(idProvider: AiProviderId) {
    if (!canManage) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/ai/providers?provider=${encodeURIComponent(idProvider)}`,
        { method: "DELETE" },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to delete provider.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete provider.");
    } finally {
      setPending(false);
    }
  }

  const systemPrompts = prompts.filter((prompt) => prompt.kind === "system");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">AI settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Configure default provider, model selection, streaming, tools, and API
          keys. Chatbot provider keys are used as a fallback.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      <form
        onSubmit={saveSettings}
        className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4"
      >
        <h2 className="text-sm font-semibold text-zinc-900">Defaults</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={authLabelClassName}>Provider</label>
            <select
              className={authInputClassName}
              value={defaultProvider}
              disabled={!canManage || pending}
              onChange={(event) => {
                const next = event.target.value as AiProviderId;
                setDefaultProvider(next);
                setDefaultModel(AI_MODEL_OPTIONS[next][0]?.id || "");
              }}
            >
              {AI_PROVIDERS.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={authLabelClassName}>Model</label>
            <select
              className={authInputClassName}
              value={defaultModel}
              disabled={!canManage || pending}
              onChange={(event) => setDefaultModel(event.target.value)}
            >
              {AI_MODEL_OPTIONS[defaultProvider].map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={authLabelClassName}>Temperature</label>
            <input
              className={authInputClassName}
              type="number"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              disabled={!canManage || pending}
              onChange={(event) => setTemperature(event.target.value)}
            />
          </div>
          <div>
            <label className={authLabelClassName}>Max tool rounds</label>
            <input
              className={authInputClassName}
              type="number"
              min={0}
              max={8}
              value={maxToolRounds}
              disabled={!canManage || pending}
              onChange={(event) => setMaxToolRounds(event.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={authLabelClassName}>System prompt</label>
            <select
              className={authInputClassName}
              value={systemPromptId}
              disabled={!canManage || pending}
              onChange={(event) => setSystemPromptId(event.target.value)}
            >
              <option value="">Default system prompt</option>
              {systemPrompts.map((prompt) => (
                <option key={prompt.id} value={prompt.id}>
                  {prompt.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-zinc-700">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={streamingEnabled}
              disabled={!canManage || pending}
              onChange={(event) => setStreamingEnabled(event.target.checked)}
            />
            Streaming responses
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={toolsEnabled}
              disabled={!canManage || pending}
              onChange={(event) => setToolsEnabled(event.target.checked)}
            />
            AI tools / actions
          </label>
        </div>
        {canManage ? (
          <button
            type="submit"
            className={`${authButtonClassName} !w-auto px-4`}
            disabled={pending}
          >
            {pending ? "Saving…" : "Save settings"}
          </button>
        ) : null}
      </form>

      <form
        onSubmit={saveCredential}
        className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4"
      >
        <h2 className="text-sm font-semibold text-zinc-900">Provider API keys</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={authLabelClassName}>Provider</label>
            <select
              className={authInputClassName}
              value={provider}
              disabled={!canManage || pending}
              onChange={(event) => {
                const next = event.target.value as AiProviderId;
                setProvider(next);
                setProviderModel(AI_MODEL_OPTIONS[next][0]?.id || "");
              }}
            >
              {AI_PROVIDERS.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={authLabelClassName}>Default model</label>
            <select
              className={authInputClassName}
              value={providerModel}
              disabled={!canManage || pending}
              onChange={(event) => setProviderModel(event.target.value)}
            >
              {AI_MODEL_OPTIONS[provider].map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={authLabelClassName}>API key</label>
            <input
              className={authInputClassName}
              type="password"
              value={apiKey}
              required
              disabled={!canManage || pending}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="sk-..."
            />
          </div>
          <div className="sm:col-span-2">
            <label className={authLabelClassName}>Base URL (optional)</label>
            <input
              className={authInputClassName}
              value={baseUrl}
              disabled={!canManage || pending}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://api.openai.com/v1"
            />
          </div>
        </div>
        {canManage ? (
          <button
            type="submit"
            className={`${authButtonClassName} !w-auto px-4`}
            disabled={pending}
          >
            Save provider key
          </button>
        ) : null}
      </form>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Key</th>
              <th className="px-4 py-3 font-medium">Model</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {credentials.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-zinc-500" colSpan={5}>
                  No AI provider keys yet. Chatbot keys can be used as fallback.
                </td>
              </tr>
            ) : (
              credentials.map((credential) => (
                <tr key={credential.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3">{credential.provider}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {credential.apiKeyMasked}
                  </td>
                  <td className="px-4 py-3">
                    {credential.defaultModel || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {credential.isActive ? "Active" : "Inactive"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManage ? (
                      <button
                        type="button"
                        className="text-sm text-red-600 hover:underline"
                        disabled={pending}
                        onClick={() => removeCredential(credential.provider)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
