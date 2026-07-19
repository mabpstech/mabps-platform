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
import type { NotificationPreference } from "@/lib/notifications/types";

export function NotificationsPreferencesPanel({
  preferences,
}: {
  preferences: NotificationPreference;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [inAppEnabled, setInAppEnabled] = useState(preferences.inAppEnabled);
  const [pushEnabled, setPushEnabled] = useState(preferences.pushEnabled);
  const [emailEnabled, setEmailEnabled] = useState(preferences.emailEnabled);
  const [whatsappEnabled, setWhatsappEnabled] = useState(
    preferences.whatsappEnabled,
  );
  const [browserEnabled, setBrowserEnabled] = useState(
    preferences.browserEnabled,
  );
  const [quietHoursStart, setQuietHoursStart] = useState(
    preferences.quietHoursStart || "",
  );
  const [quietHoursEnd, setQuietHoursEnd] = useState(
    preferences.quietHoursEnd || "",
  );
  const [timezone, setTimezone] = useState(preferences.timezone || "UTC");
  const [emailAddress, setEmailAddress] = useState(
    preferences.emailAddress || "",
  );
  const [phoneNumber, setPhoneNumber] = useState(preferences.phoneNumber || "");

  async function savePreferences(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inAppEnabled,
          pushEnabled,
          emailEnabled,
          whatsappEnabled,
          browserEnabled,
          quietHoursStart: quietHoursStart || null,
          quietHoursEnd: quietHoursEnd || null,
          timezone,
          emailAddress: emailAddress || null,
          phoneNumber: phoneNumber || null,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save.");
      setSuccess("Preferences saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Preferences</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Control which channels reach you and optional quiet hours.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      <form
        onSubmit={savePreferences}
        className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2"
      >
        {(
          [
            ["In-app", inAppEnabled, setInAppEnabled],
            ["Push", pushEnabled, setPushEnabled],
            ["Email", emailEnabled, setEmailEnabled],
            ["WhatsApp", whatsappEnabled, setWhatsappEnabled],
            ["Browser", browserEnabled, setBrowserEnabled],
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
              disabled={pending}
            />
            {label}
          </label>
        ))}

        <div>
          <label className={authLabelClassName}>Quiet hours start</label>
          <input
            className={authInputClassName}
            placeholder="22:00"
            value={quietHoursStart}
            onChange={(e) => setQuietHoursStart(e.target.value)}
            disabled={pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Quiet hours end</label>
          <input
            className={authInputClassName}
            placeholder="07:00"
            value={quietHoursEnd}
            onChange={(e) => setQuietHoursEnd(e.target.value)}
            disabled={pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Timezone</label>
          <input
            className={authInputClassName}
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            disabled={pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Email address</label>
          <input
            className={authInputClassName}
            type="email"
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={authLabelClassName}>WhatsApp phone</label>
          <input
            className={authInputClassName}
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            className={authButtonClassName}
            disabled={pending}
          >
            {pending ? "Saving…" : "Save preferences"}
          </button>
        </div>
      </form>
    </div>
  );
}
