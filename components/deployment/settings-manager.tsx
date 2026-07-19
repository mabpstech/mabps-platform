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
import type { DeploymentSettingsPublic } from "@/lib/deployment/repository";
import type { DeploymentProvider } from "@/lib/deployment/types";

export function DeploymentSettingsManager({
  settings,
  canManage,
}: {
  settings: DeploymentSettingsPublic;
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const [defaultProvider, setDefaultProvider] = useState<DeploymentProvider>(
    settings.defaultProvider,
  );
  const [autoSslEnabled, setAutoSslEnabled] = useState(settings.autoSslEnabled);
  const [autoDnsVerifyEnabled, setAutoDnsVerifyEnabled] = useState(
    settings.autoDnsVerifyEnabled,
  );
  const [healthChecksEnabled, setHealthChecksEnabled] = useState(
    settings.healthChecksEnabled,
  );
  const [monitoringEnabled, setMonitoringEnabled] = useState(
    settings.monitoringEnabled,
  );
  const [publishOnDomainVerify, setPublishOnDomainVerify] = useState(
    settings.publishOnDomainVerify,
  );
  const [healthCheckPath, setHealthCheckPath] = useState(
    settings.healthCheckPath,
  );
  const [healthCheckIntervalSec, setHealthCheckIntervalSec] = useState(
    String(settings.healthCheckIntervalSec),
  );
  const [retentionDeployments, setRetentionDeployments] = useState(
    String(settings.retentionDeployments),
  );
  const [vercelTeamId, setVercelTeamId] = useState(settings.vercelTeamId || "");
  const [vercelToken, setVercelToken] = useState("");
  const [cloudflareAccountId, setCloudflareAccountId] = useState(
    settings.cloudflareAccountId || "",
  );
  const [cloudflareApiToken, setCloudflareApiToken] = useState("");
  const [cloudflareZoneId, setCloudflareZoneId] = useState(
    settings.cloudflareZoneId || "",
  );
  const [webhookUrl, setWebhookUrl] = useState(settings.webhookUrl || "");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setPending("save");
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/deployment/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultProvider,
          autoSslEnabled,
          autoDnsVerifyEnabled,
          healthChecksEnabled,
          monitoringEnabled,
          publishOnDomainVerify,
          healthCheckPath,
          healthCheckIntervalSec: Number(healthCheckIntervalSec) || 300,
          retentionDeployments: Number(retentionDeployments) || 50,
          vercelTeamId: vercelTeamId || null,
          vercelToken: vercelToken || undefined,
          cloudflareAccountId: cloudflareAccountId || null,
          cloudflareApiToken: cloudflareApiToken || undefined,
          cloudflareZoneId: cloudflareZoneId || null,
          webhookUrl: webhookUrl || null,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save.");
      setVercelToken("");
      setCloudflareApiToken("");
      setSuccess("Settings saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setPending(null);
    }
  }

  async function testProvider(provider: "vercel" | "cloudflare") {
    if (!canManage) return;
    setPending(provider);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/deployment/providers/${provider}`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        error?: string;
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !data.ok) {
        throw new Error(data.message || data.error || "Connection failed.");
      }
      setSuccess(data.message || "Connection OK.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Deployment settings
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Provider credentials, SSL/DNS defaults, health checks, and retention.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      <form
        onSubmit={save}
        className="space-y-6 rounded-xl border border-zinc-200 bg-white p-4"
      >
        <fieldset disabled={!canManage || Boolean(pending)} className="space-y-4">
          <div>
            <label className={authLabelClassName} htmlFor="default-provider">
              Default provider
            </label>
            <select
              id="default-provider"
              className={authInputClassName}
              value={defaultProvider}
              onChange={(e) =>
                setDefaultProvider(e.target.value as DeploymentProvider)
              }
            >
              <option value="vercel">Vercel</option>
              <option value="cloudflare">Cloudflare</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["autoSslEnabled", autoSslEnabled, setAutoSslEnabled, "Auto SSL"],
                [
                  "autoDnsVerifyEnabled",
                  autoDnsVerifyEnabled,
                  setAutoDnsVerifyEnabled,
                  "Auto DNS verify",
                ],
                [
                  "healthChecksEnabled",
                  healthChecksEnabled,
                  setHealthChecksEnabled,
                  "Health checks",
                ],
                [
                  "monitoringEnabled",
                  monitoringEnabled,
                  setMonitoringEnabled,
                  "Monitoring",
                ],
                [
                  "publishOnDomainVerify",
                  publishOnDomainVerify,
                  setPublishOnDomainVerify,
                  "Publish on domain verify",
                ],
              ] as const
            ).map(([id, value, setter, label]) => (
              <label
                key={id}
                className="flex items-center gap-2 text-sm text-zinc-700"
              >
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setter(e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={authLabelClassName} htmlFor="health-path">
                Health path
              </label>
              <input
                id="health-path"
                className={authInputClassName}
                value={healthCheckPath}
                onChange={(e) => setHealthCheckPath(e.target.value)}
              />
            </div>
            <div>
              <label className={authLabelClassName} htmlFor="health-interval">
                Interval (sec)
              </label>
              <input
                id="health-interval"
                className={authInputClassName}
                value={healthCheckIntervalSec}
                onChange={(e) => setHealthCheckIntervalSec(e.target.value)}
              />
            </div>
            <div>
              <label className={authLabelClassName} htmlFor="retention">
                Retention
              </label>
              <input
                id="retention"
                className={authInputClassName}
                value={retentionDeployments}
                onChange={(e) => setRetentionDeployments(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3 border-t border-zinc-100 pt-4">
            <h2 className="text-sm font-semibold text-zinc-900">Vercel</h2>
            <p className="text-xs text-zinc-500">
              Token {settings.hasVercelToken ? "set" : "not set"}
              {settings.vercelTokenMasked
                ? ` (${settings.vercelTokenMasked})`
                : ""}
            </p>
            <div>
              <label className={authLabelClassName} htmlFor="vercel-team">
                Team ID
              </label>
              <input
                id="vercel-team"
                className={authInputClassName}
                value={vercelTeamId}
                onChange={(e) => setVercelTeamId(e.target.value)}
              />
            </div>
            <div>
              <label className={authLabelClassName} htmlFor="vercel-token">
                API token
              </label>
              <input
                id="vercel-token"
                type="password"
                className={authInputClassName}
                value={vercelToken}
                onChange={(e) => setVercelToken(e.target.value)}
                placeholder="Leave blank to keep current"
              />
            </div>
            <button
              type="button"
              className={authSecondaryButtonClassName}
              onClick={() => testProvider("vercel")}
              disabled={!canManage || Boolean(pending)}
            >
              {pending === "vercel" ? "Testing…" : "Test Vercel"}
            </button>
          </div>

          <div className="space-y-3 border-t border-zinc-100 pt-4">
            <h2 className="text-sm font-semibold text-zinc-900">Cloudflare</h2>
            <p className="text-xs text-zinc-500">
              Token {settings.hasCloudflareToken ? "set" : "not set"}
              {settings.cloudflareApiTokenMasked
                ? ` (${settings.cloudflareApiTokenMasked})`
                : ""}
            </p>
            <div>
              <label className={authLabelClassName} htmlFor="cf-account">
                Account ID
              </label>
              <input
                id="cf-account"
                className={authInputClassName}
                value={cloudflareAccountId}
                onChange={(e) => setCloudflareAccountId(e.target.value)}
              />
            </div>
            <div>
              <label className={authLabelClassName} htmlFor="cf-zone">
                Zone ID
              </label>
              <input
                id="cf-zone"
                className={authInputClassName}
                value={cloudflareZoneId}
                onChange={(e) => setCloudflareZoneId(e.target.value)}
              />
            </div>
            <div>
              <label className={authLabelClassName} htmlFor="cf-token">
                API token
              </label>
              <input
                id="cf-token"
                type="password"
                className={authInputClassName}
                value={cloudflareApiToken}
                onChange={(e) => setCloudflareApiToken(e.target.value)}
                placeholder="Leave blank to keep current"
              />
            </div>
            <button
              type="button"
              className={authSecondaryButtonClassName}
              onClick={() => testProvider("cloudflare")}
              disabled={!canManage || Boolean(pending)}
            >
              {pending === "cloudflare" ? "Testing…" : "Test Cloudflare"}
            </button>
          </div>

          <div>
            <label className={authLabelClassName} htmlFor="webhook">
              Webhook URL
            </label>
            <input
              id="webhook"
              className={authInputClassName}
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://example.com/hooks/deploy"
            />
          </div>
        </fieldset>

        {canManage ? (
          <button
            type="submit"
            className={authButtonClassName}
            disabled={Boolean(pending)}
          >
            {pending === "save" ? "Saving…" : "Save settings"}
          </button>
        ) : (
          <p className="text-sm text-zinc-500">
            Only workspace owners and admins can edit deployment settings.
          </p>
        )}
      </form>
    </div>
  );
}
