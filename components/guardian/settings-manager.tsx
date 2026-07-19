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
import type { GuardianSettingsPublic } from "@/lib/guardian/repository";

export function GuardianSettingsManager({
  settings,
  canManage,
}: {
  settings: GuardianSettingsPublic;
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [monitoringEnabled, setMonitoringEnabled] = useState(
    settings.monitoringEnabled,
  );
  const [autoScanEnabled, setAutoScanEnabled] = useState(
    settings.autoScanEnabled,
  );
  const [autoRepairSuggestionsEnabled, setAutoRepairSuggestionsEnabled] =
    useState(settings.autoRepairSuggestionsEnabled);
  const [aiTroubleshootingEnabled, setAiTroubleshootingEnabled] = useState(
    settings.aiTroubleshootingEnabled,
  );
  const [securityChecksEnabled, setSecurityChecksEnabled] = useState(
    settings.securityChecksEnabled,
  );
  const [performanceChecksEnabled, setPerformanceChecksEnabled] = useState(
    settings.performanceChecksEnabled,
  );
  const [logAnalysisEnabled, setLogAnalysisEnabled] = useState(
    settings.logAnalysisEnabled,
  );
  const [scanIntervalSec, setScanIntervalSec] = useState(
    String(settings.scanIntervalSec),
  );
  const [retentionScans, setRetentionScans] = useState(
    String(settings.retentionScans),
  );
  const [alertWebhookUrl, setAlertWebhookUrl] = useState(
    settings.alertWebhookUrl || "",
  );

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/guardian/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monitoringEnabled,
          autoScanEnabled,
          autoRepairSuggestionsEnabled,
          aiTroubleshootingEnabled,
          securityChecksEnabled,
          performanceChecksEnabled,
          logAnalysisEnabled,
          scanIntervalSec: Number(scanIntervalSec) || 900,
          retentionScans: Number(retentionScans) || 50,
          alertWebhookUrl: alertWebhookUrl || null,
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

  const toggles: Array<{
    label: string;
    value: boolean;
    set: (value: boolean) => void;
  }> = [
    {
      label: "Automatic health monitoring",
      value: monitoringEnabled,
      set: setMonitoringEnabled,
    },
    {
      label: "Auto-scan on monitor interval",
      value: autoScanEnabled,
      set: setAutoScanEnabled,
    },
    {
      label: "Auto-repair suggestions",
      value: autoRepairSuggestionsEnabled,
      set: setAutoRepairSuggestionsEnabled,
    },
    {
      label: "AI-powered troubleshooting",
      value: aiTroubleshootingEnabled,
      set: setAiTroubleshootingEnabled,
    },
    {
      label: "Security checks",
      value: securityChecksEnabled,
      set: setSecurityChecksEnabled,
    },
    {
      label: "Performance checks",
      value: performanceChecksEnabled,
      set: setPerformanceChecksEnabled,
    },
    {
      label: "Log analysis",
      value: logAnalysisEnabled,
      set: setLogAnalysisEnabled,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Guardian settings
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Configure monitoring, diagnostics categories, and retention.
        </p>
      </div>

      <form
        onSubmit={save}
        className="space-y-5 rounded-xl border border-zinc-200 bg-white p-4"
      >
        <div className="space-y-3">
          {toggles.map((toggle) => (
            <label
              key={toggle.label}
              className="flex items-center gap-3 text-sm text-zinc-700"
            >
              <input
                type="checkbox"
                checked={toggle.value}
                disabled={!canManage || pending}
                onChange={(event) => toggle.set(event.target.checked)}
              />
              {toggle.label}
            </label>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={authLabelClassName} htmlFor="scanIntervalSec">
              Scan interval (seconds)
            </label>
            <input
              id="scanIntervalSec"
              className={authInputClassName}
              value={scanIntervalSec}
              disabled={!canManage || pending}
              onChange={(event) => setScanIntervalSec(event.target.value)}
            />
          </div>
          <div>
            <label className={authLabelClassName} htmlFor="retentionScans">
              Retention (scans)
            </label>
            <input
              id="retentionScans"
              className={authInputClassName}
              value={retentionScans}
              disabled={!canManage || pending}
              onChange={(event) => setRetentionScans(event.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={authLabelClassName} htmlFor="alertWebhookUrl">
            Alert webhook URL
          </label>
          <input
            id="alertWebhookUrl"
            className={authInputClassName}
            value={alertWebhookUrl}
            disabled={!canManage || pending}
            onChange={(event) => setAlertWebhookUrl(event.target.value)}
            placeholder="https://hooks.example.com/guardian"
          />
        </div>

        {error ? <p className={authErrorClassName}>{error}</p> : null}
        {success ? <p className={authSuccessClassName}>{success}</p> : null}

        {canManage ? (
          <button
            type="submit"
            className={`${authButtonClassName} sm:w-auto`}
            disabled={pending}
          >
            {pending ? "Saving…" : "Save settings"}
          </button>
        ) : (
          <p className="text-sm text-zinc-500">
            Only workspace owners and admins can change Guardian settings.
          </p>
        )}
      </form>
    </div>
  );
}
