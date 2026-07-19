import Link from "next/link";
import type { DeploymentOverviewStats } from "@/lib/deployment/types";

export function DeploymentOverview({
  stats,
  canManage,
}: {
  stats: DeploymentOverviewStats;
  canManage: boolean;
}) {
  const cards = [
    { label: "Projects", value: stats.projects },
    { label: "Active", value: stats.activeProjects },
    { label: "Domains", value: stats.domains },
    { label: "Verified", value: stats.verifiedDomains },
    { label: "Deployments", value: stats.deployments },
    { label: "Published today", value: stats.publishedToday },
    { label: "Failed today", value: stats.failedToday },
    { label: "Env vars", value: stats.envVars },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Deployment & Infrastructure
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Multi-tenant publish pipeline with custom domains, SSL, DNS
            verification, Vercel/Cloudflare providers, env vars, rollback,
            health checks, and monitoring.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/deployment/projects"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800"
          >
            Projects
          </Link>
          {canManage ? (
            <Link
              href="/deployment/settings"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Settings
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              {card.label}
            </p>
            <p className="mt-1 text-xl font-semibold text-zinc-900">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Providers
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            Default {stats.defaultProvider} · Vercel{" "}
            {stats.hasVercelToken ? "connected" : "not set"} · Cloudflare{" "}
            {stats.hasCloudflareToken ? "connected" : "not set"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Infrastructure
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            Auto SSL {stats.autoSslEnabled ? "on" : "off"} · Health{" "}
            {stats.healthChecksEnabled ? "on" : "off"} · Monitoring{" "}
            {stats.monitoringEnabled ? "on" : "off"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Healthy today {stats.healthyChecks} · Down today {stats.downChecks}
          </p>
        </div>
      </div>
    </div>
  );
}
