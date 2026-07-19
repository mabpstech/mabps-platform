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
import type { NotificationSettingsPublic } from "@/lib/notifications/repository";
import type {
  NotificationChannel,
  NotificationPriority,
} from "@/lib/notifications/types";

const CHANNELS: NotificationChannel[] = [
  "in_app",
  "push",
  "email",
  "whatsapp",
  "browser",
];

const PRIORITIES: NotificationPriority[] = [
  "low",
  "normal",
  "high",
  "urgent",
];

export function NotificationsSettingsManager({
  settings,
  canManage,
}: {
  settings: NotificationSettingsPublic;
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [inAppEnabled, setInAppEnabled] = useState(settings.inAppEnabled);
  const [pushEnabled, setPushEnabled] = useState(settings.pushEnabled);
  const [emailEnabled, setEmailEnabled] = useState(settings.emailEnabled);
  const [whatsappEnabled, setWhatsappEnabled] = useState(
    settings.whatsappEnabled,
  );
  const [browserEnabled, setBrowserEnabled] = useState(settings.browserEnabled);
  const [defaultChannels, setDefaultChannels] = useState<NotificationChannel[]>(
    settings.defaultChannels,
  );
  const [defaultPriority, setDefaultPriority] = useState<NotificationPriority>(
    settings.defaultPriority,
  );
  const [crmSyncEnabled, setCrmSyncEnabled] = useState(settings.crmSyncEnabled);
  const [automationEnabled, setAutomationEnabled] = useState(
    settings.automationEnabled,
  );
  const [analyticsEnabled, setAnalyticsEnabled] = useState(
    settings.analyticsEnabled,
  );
  const [pushEndpoint, setPushEndpoint] = useState(settings.pushEndpoint || "");

  function toggleChannel(channel: NotificationChannel) {
    setDefaultChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel],
    );
  }

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/notifications/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inAppEnabled,
          pushEnabled,
          emailEnabled,
          whatsappEnabled,
          browserEnabled,
          defaultChannels,
          defaultPriority,
          crmSyncEnabled,
          automationEnabled,
          analyticsEnabled,
          pushEndpoint: pushEndpoint || null,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save.");
      setSuccess("Settings saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setPending(false);
    }
  }

  async function regenerateVapid() {
    if (!canManage) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/notifications/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateVapidKeys: true }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to regenerate.");
      setSuccess("VAPID keys regenerated.");
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
        <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Workspace-level channel toggles, defaults, and integration flags.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      <form
        onSubmit={saveSettings}
        className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2"
      >
        {(
          [
            ["In-app enabled", inAppEnabled, setInAppEnabled],
            ["Push enabled", pushEnabled, setPushEnabled],
            ["Email enabled", emailEnabled, setEmailEnabled],
            ["WhatsApp enabled", whatsappEnabled, setWhatsappEnabled],
            ["Browser enabled", browserEnabled, setBrowserEnabled],
            ["CRM sync", crmSyncEnabled, setCrmSyncEnabled],
            ["Automation", automationEnabled, setAutomationEnabled],
            ["Analytics", analyticsEnabled, setAnalyticsEnabled],
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
              disabled={pending || !canManage}
            />
            {label}
          </label>
        ))}

        <div>
          <label className={authLabelClassName}>Default priority</label>
          <select
            className={authInputClassName}
            value={defaultPriority}
            onChange={(e) =>
              setDefaultPriority(e.target.value as NotificationPriority)
            }
            disabled={pending || !canManage}
          >
            {PRIORITIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={authLabelClassName}>Push endpoint (optional)</label>
          <input
            className={authInputClassName}
            value={pushEndpoint}
            onChange={(e) => setPushEndpoint(e.target.value)}
            placeholder="https://…"
            disabled={pending || !canManage}
          />
        </div>
        <div className="sm:col-span-2">
          <p className={authLabelClassName}>Default channels</p>
          <div className="flex flex-wrap gap-3">
            {CHANNELS.map((channel) => (
              <label
                key={channel}
                className="flex items-center gap-2 text-sm text-zinc-700"
              >
                <input
                  type="checkbox"
                  checked={defaultChannels.includes(channel)}
                  onChange={() => toggleChannel(channel)}
                  disabled={pending || !canManage}
                />
                {channel}
              </label>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2 rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-sm text-zinc-600">
          <p>
            VAPID public key:{" "}
            <span className="font-mono text-xs">
              {settings.vapidPublicKey || "—"}
            </span>
          </p>
          <p className="mt-1">
            VAPID private key: {settings.vapidPrivateKeyMasked || "—"}
          </p>
        </div>

        {canManage ? (
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="submit"
              className={authButtonClassName}
              disabled={pending}
            >
              {pending ? "Saving…" : "Save settings"}
            </button>
            <button
              type="button"
              onClick={regenerateVapid}
              className="rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
              disabled={pending}
            >
              Regenerate VAPID keys
            </button>
          </div>
        ) : (
          <p className="sm:col-span-2 text-sm text-zinc-500">
            Only workspace owners and admins can change settings.
          </p>
        )}
      </form>
    </div>
  );
}
