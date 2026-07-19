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
import type { EmailSettingsPublic } from "@/lib/email-engine/repository";
import type { EmailProvider } from "@/lib/email-engine/types";

export function EmailSettingsManager({
  settings,
  canManage,
  webhookBaseUrl,
}: {
  settings: EmailSettingsPublic;
  canManage: boolean;
  webhookBaseUrl: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [provider, setProvider] = useState<EmailProvider>(settings.provider);
  const [fromEmail, setFromEmail] = useState(settings.fromEmail || "");
  const [fromName, setFromName] = useState(settings.fromName || "");
  const [replyTo, setReplyTo] = useState(settings.replyTo || "");
  const [smtpHost, setSmtpHost] = useState(settings.smtpHost || "");
  const [smtpPort, setSmtpPort] = useState(
    String(settings.smtpPort || 587),
  );
  const [smtpSecure, setSmtpSecure] = useState(settings.smtpSecure);
  const [smtpUser, setSmtpUser] = useState(settings.smtpUser || "");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [resendApiKey, setResendApiKey] = useState("");
  const [sesAccessKeyId, setSesAccessKeyId] = useState(
    settings.sesAccessKeyId || "",
  );
  const [sesSecretAccessKey, setSesSecretAccessKey] = useState("");
  const [sesRegion, setSesRegion] = useState(settings.sesRegion || "us-east-1");
  const [crmSyncEnabled, setCrmSyncEnabled] = useState(settings.crmSyncEnabled);
  const [automationEnabled, setAutomationEnabled] = useState(
    settings.automationEnabled,
  );
  const [analyticsEnabled, setAnalyticsEnabled] = useState(
    settings.analyticsEnabled,
  );
  const [openTrackingEnabled, setOpenTrackingEnabled] = useState(
    settings.openTrackingEnabled,
  );
  const [clickTrackingEnabled, setClickTrackingEnabled] = useState(
    settings.clickTrackingEnabled,
  );
  const [isConnected, setIsConnected] = useState(settings.isConnected);

  const scopedWebhookUrl = settings.webhookPathSecret
    ? `${webhookBaseUrl}/api/email/webhook/${settings.webhookPathSecret}`
    : `${webhookBaseUrl}/api/email/webhook`;

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: Record<string, unknown> = {
        provider,
        fromEmail: fromEmail || null,
        fromName: fromName || null,
        replyTo: replyTo || null,
        smtpHost: smtpHost || null,
        smtpPort: smtpPort ? Number(smtpPort) : null,
        smtpSecure,
        smtpUser: smtpUser || null,
        sesAccessKeyId: sesAccessKeyId || null,
        sesRegion,
        crmSyncEnabled,
        automationEnabled,
        analyticsEnabled,
        openTrackingEnabled,
        clickTrackingEnabled,
        isConnected,
      };
      if (smtpPassword.trim()) payload.smtpPassword = smtpPassword.trim();
      if (resendApiKey.trim()) payload.resendApiKey = resendApiKey.trim();
      if (sesSecretAccessKey.trim()) {
        payload.sesSecretAccessKey = sesSecretAccessKey.trim();
      }

      const response = await fetch("/api/email/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save settings.");
      setSmtpPassword("");
      setResendApiKey("");
      setSesSecretAccessKey("");
      setSuccess("Email settings saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save settings.");
    } finally {
      setPending(false);
    }
  }

  async function regenerate(field: "webhook" | "tracking") {
    if (!canManage) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/email/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          field === "webhook"
            ? { regenerateWebhookSecret: true }
            : { regenerateTrackingSecret: true },
        ),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to regenerate.");
      setSuccess(
        field === "webhook"
          ? "Webhook path secret regenerated."
          : "Tracking secret regenerated.",
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
        <h1 className="text-2xl font-semibold text-zinc-900">Email settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Configure SMTP, Resend, or Amazon SES credentials and control CRM,
          automation, analytics, and tracking for this workspace.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      <form
        onSubmit={saveSettings}
        className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={authLabelClassName}>Provider</label>
            <select
              className={authInputClassName}
              value={provider}
              onChange={(e) => setProvider(e.target.value as EmailProvider)}
              disabled={!canManage || pending}
            >
              <option value="resend">Resend</option>
              <option value="smtp">SMTP</option>
              <option value="ses">Amazon SES</option>
            </select>
          </div>
          <div>
            <label className={authLabelClassName}>From email</label>
            <input
              className={authInputClassName}
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              disabled={!canManage || pending}
              required
            />
          </div>
          <div>
            <label className={authLabelClassName}>From name</label>
            <input
              className={authInputClassName}
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              disabled={!canManage || pending}
            />
          </div>
          <div>
            <label className={authLabelClassName}>Reply-To</label>
            <input
              className={authInputClassName}
              type="email"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              disabled={!canManage || pending}
            />
          </div>
        </div>

        {provider === "resend" ? (
          <div>
            <label className={authLabelClassName}>
              Resend API key{" "}
              {settings.hasResendApiKey ? (
                <span className="font-normal text-zinc-400">
                  (saved: {settings.resendApiKeyMasked})
                </span>
              ) : null}
            </label>
            <input
              className={authInputClassName}
              type="password"
              value={resendApiKey}
              onChange={(e) => setResendApiKey(e.target.value)}
              disabled={!canManage || pending}
              placeholder={
                settings.hasResendApiKey
                  ? "Leave blank to keep current key"
                  : "re_..."
              }
            />
          </div>
        ) : null}

        {provider === "smtp" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={authLabelClassName}>SMTP host</label>
              <input
                className={authInputClassName}
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                disabled={!canManage || pending}
                placeholder="smtp.example.com"
              />
            </div>
            <div>
              <label className={authLabelClassName}>SMTP port</label>
              <input
                className={authInputClassName}
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                disabled={!canManage || pending}
              />
            </div>
            <div>
              <label className={authLabelClassName}>SMTP user</label>
              <input
                className={authInputClassName}
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                disabled={!canManage || pending}
              />
            </div>
            <div>
              <label className={authLabelClassName}>
                SMTP password{" "}
                {settings.hasSmtpPassword ? (
                  <span className="font-normal text-zinc-400">
                    (saved: {settings.smtpPasswordMasked})
                  </span>
                ) : null}
              </label>
              <input
                className={authInputClassName}
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                disabled={!canManage || pending}
                placeholder={
                  settings.hasSmtpPassword
                    ? "Leave blank to keep current password"
                    : "SMTP password"
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-700 sm:col-span-2">
              <input
                type="checkbox"
                checked={smtpSecure}
                onChange={(e) => setSmtpSecure(e.target.checked)}
                disabled={!canManage || pending}
              />
              Use TLS / STARTTLS
            </label>
          </div>
        ) : null}

        {provider === "ses" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={authLabelClassName}>Access key ID</label>
              <input
                className={authInputClassName}
                value={sesAccessKeyId}
                onChange={(e) => setSesAccessKeyId(e.target.value)}
                disabled={!canManage || pending}
              />
            </div>
            <div>
              <label className={authLabelClassName}>Region</label>
              <input
                className={authInputClassName}
                value={sesRegion}
                onChange={(e) => setSesRegion(e.target.value)}
                disabled={!canManage || pending}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={authLabelClassName}>
                Secret access key{" "}
                {settings.hasSesSecretAccessKey ? (
                  <span className="font-normal text-zinc-400">
                    (saved: {settings.sesSecretAccessKeyMasked})
                  </span>
                ) : null}
              </label>
              <input
                className={authInputClassName}
                type="password"
                value={sesSecretAccessKey}
                onChange={(e) => setSesSecretAccessKey(e.target.value)}
                disabled={!canManage || pending}
                placeholder={
                  settings.hasSesSecretAccessKey
                    ? "Leave blank to keep current secret"
                    : "AWS secret access key"
                }
              />
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["Mark as connected", isConnected, setIsConnected],
              ["CRM sync", crmSyncEnabled, setCrmSyncEnabled],
              ["Automation events", automationEnabled, setAutomationEnabled],
              ["Analytics events", analyticsEnabled, setAnalyticsEnabled],
              ["Open tracking", openTrackingEnabled, setOpenTrackingEnabled],
              ["Click tracking", clickTrackingEnabled, setClickTrackingEnabled],
            ] as const
          ).map(([label, value, setter]) => (
            <label
              key={label}
              className="flex items-center gap-2 text-sm text-zinc-700"
            >
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setter(e.target.checked)}
                disabled={!canManage || pending}
              />
              {label}
            </label>
          ))}
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
            Only workspace owners and admins can edit email settings.
          </p>
        )}
      </form>

      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">
          Provider webhook
        </h2>
        <p className="text-sm text-zinc-500">
          Point Resend or SES/SNS delivery events to this workspace-scoped URL
          for bounce, delivery, open, and click updates.
        </p>
        <code className="block break-all rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
          {scopedWebhookUrl}
        </code>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
              onClick={() => regenerate("webhook")}
              disabled={pending}
            >
              Regenerate webhook secret
            </button>
            <button
              type="button"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
              onClick={() => regenerate("tracking")}
              disabled={pending}
            >
              Regenerate tracking secret
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
