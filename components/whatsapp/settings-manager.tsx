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
import type { WhatsAppSettingsPublic } from "@/lib/whatsapp/repository";

type BotOption = { id: string; name: string };

export function WhatsAppSettingsManager({
  settings,
  bots,
  canManage,
  webhookBaseUrl,
}: {
  settings: WhatsAppSettingsPublic;
  bots: BotOption[];
  canManage: boolean;
  webhookBaseUrl: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [phoneNumberId, setPhoneNumberId] = useState(
    settings.phoneNumberId || "",
  );
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState(
    settings.displayPhoneNumber || "",
  );
  const [wabaId, setWabaId] = useState(settings.wabaId || "");
  const [accessToken, setAccessToken] = useState("");
  const [apiVersion, setApiVersion] = useState(settings.apiVersion || "v21.0");
  const [businessName, setBusinessName] = useState(settings.businessName || "");
  const [defaultChatbotBotId, setDefaultChatbotBotId] = useState(
    settings.defaultChatbotBotId || "",
  );
  const [crmSyncEnabled, setCrmSyncEnabled] = useState(settings.crmSyncEnabled);
  const [chatbotEnabled, setChatbotEnabled] = useState(settings.chatbotEnabled);
  const [automationEnabled, setAutomationEnabled] = useState(
    settings.automationEnabled,
  );
  const [isConnected, setIsConnected] = useState(settings.isConnected);

  const webhookUrl = `${webhookBaseUrl}/api/whatsapp/webhook`;
  const scopedWebhookUrl = settings.webhookPathSecret
    ? `${webhookBaseUrl}/api/whatsapp/webhook/${settings.webhookPathSecret}`
    : webhookUrl;

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: Record<string, unknown> = {
        phoneNumberId: phoneNumberId || null,
        displayPhoneNumber: displayPhoneNumber || null,
        wabaId: wabaId || null,
        apiVersion,
        businessName: businessName || null,
        defaultChatbotBotId: defaultChatbotBotId || null,
        crmSyncEnabled,
        chatbotEnabled,
        automationEnabled,
        isConnected,
      };
      if (accessToken.trim()) payload.accessToken = accessToken.trim();

      const response = await fetch("/api/whatsapp/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save settings.");
      setAccessToken("");
      setSuccess("WhatsApp settings saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save settings.");
    } finally {
      setPending(false);
    }
  }

  async function regenerate(field: "verify" | "webhook") {
    if (!canManage) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/whatsapp/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          field === "verify"
            ? { regenerateVerifyToken: true }
            : { regenerateWebhookSecret: true },
        ),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to regenerate.");
      setSuccess(
        field === "verify"
          ? "Verify token regenerated."
          : "Webhook path secret regenerated.",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to regenerate.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          WhatsApp settings
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Connect Meta WhatsApp Cloud API credentials and control CRM, chatbot,
          and automation bridges for this workspace.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      <form onSubmit={saveSettings} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={authLabelClassName}>Phone number ID</label>
            <input
              className={authInputClassName}
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              disabled={!canManage || pending}
              placeholder="Meta phone_number_id"
            />
          </div>
          <div>
            <label className={authLabelClassName}>Display phone</label>
            <input
              className={authInputClassName}
              value={displayPhoneNumber}
              onChange={(e) => setDisplayPhoneNumber(e.target.value)}
              disabled={!canManage || pending}
              placeholder="+15551234567"
            />
          </div>
          <div>
            <label className={authLabelClassName}>WABA ID</label>
            <input
              className={authInputClassName}
              value={wabaId}
              onChange={(e) => setWabaId(e.target.value)}
              disabled={!canManage || pending}
            />
          </div>
          <div>
            <label className={authLabelClassName}>API version</label>
            <input
              className={authInputClassName}
              value={apiVersion}
              onChange={(e) => setApiVersion(e.target.value)}
              disabled={!canManage || pending}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={authLabelClassName}>
              Access token{" "}
              {settings.hasAccessToken ? (
                <span className="font-normal text-zinc-400">
                  (saved: {settings.accessTokenMasked})
                </span>
              ) : null}
            </label>
            <input
              className={authInputClassName}
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              disabled={!canManage || pending}
              placeholder={
                settings.hasAccessToken
                  ? "Leave blank to keep current token"
                  : "Permanent or system user token"
              }
            />
          </div>
          <div>
            <label className={authLabelClassName}>Business name</label>
            <input
              className={authInputClassName}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              disabled={!canManage || pending}
            />
          </div>
          <div>
            <label className={authLabelClassName}>Default chatbot bot</label>
            <select
              className={authInputClassName}
              value={defaultChatbotBotId}
              onChange={(e) => setDefaultChatbotBotId(e.target.value)}
              disabled={!canManage || pending}
            >
              <option value="">Auto (first active bot)</option>
              {bots.map((bot) => (
                <option key={bot.id} value={bot.id}>
                  {bot.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={isConnected}
              onChange={(e) => setIsConnected(e.target.checked)}
              disabled={!canManage || pending}
            />
            Mark as connected
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={crmSyncEnabled}
              onChange={(e) => setCrmSyncEnabled(e.target.checked)}
              disabled={!canManage || pending}
            />
            Sync contacts to CRM
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={chatbotEnabled}
              onChange={(e) => setChatbotEnabled(e.target.checked)}
              disabled={!canManage || pending}
            />
            Route inbound to Chatbot
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={automationEnabled}
              onChange={(e) => setAutomationEnabled(e.target.checked)}
              disabled={!canManage || pending}
            />
            Emit Automation events
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
        ) : (
          <p className="text-sm text-zinc-500">
            Only workspace owners and admins can edit WhatsApp settings.
          </p>
        )}
      </form>

      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Webhook</h2>
        <p className="text-sm text-zinc-600">
          Callback URL:{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">
            {webhookUrl}
          </code>
        </p>
        <p className="text-sm text-zinc-600">
          Workspace-scoped URL:{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">
            {scopedWebhookUrl}
          </code>
        </p>
        <p className="text-sm text-zinc-600">
          Verify token:{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">
            {settings.verifyToken || settings.verifyTokenMasked || "—"}
          </code>
        </p>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
              onClick={() => regenerate("verify")}
              disabled={pending}
            >
              Regenerate verify token
            </button>
            <button
              type="button"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
              onClick={() => regenerate("webhook")}
              disabled={pending}
            >
              Regenerate webhook secret
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
