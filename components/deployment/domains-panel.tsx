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
import { DEFAULT_CNAME_TARGET } from "@/lib/deployment/defaults";
import type {
  DeploymentDomain,
  DeploymentProject,
} from "@/lib/deployment/types";

type DnsInstructions = {
  txtHost: string;
  txtValue: string;
  cnameHost: string;
  cnameValue: string | null;
  aRecordHost?: string;
  aRecordValue?: string | null;
};

type ProgressStep = {
  id: string;
  label: string;
  done: boolean;
  current: boolean;
};

const EXAMPLE_A_RECORD = "76.76.21.21";

function stepsForDomain(domain: DeploymentDomain): ProgressStep[] {
  const dnsDone =
    domain.status === "verified" || domain.sslStatus === "active";
  const sslDone = domain.sslStatus === "active";
  const liveDone = dnsDone && sslDone;

  return [
    {
      id: "added",
      label: "Domain Added",
      done: true,
      current: false,
    },
    {
      id: "dns",
      label: "DNS Updated",
      done: dnsDone,
      current: !dnsDone,
    },
    {
      id: "ssl",
      label: "SSL Active",
      done: sslDone,
      current: dnsDone && !sslDone,
    },
    {
      id: "live",
      label: "Website Live",
      done: liveDone,
      current: false,
    },
  ];
}

function isWaitingForDns(domain: DeploymentDomain): boolean {
  return (
    domain.status === "pending" ||
    domain.status === "verifying" ||
    domain.status === "failed"
  );
}

function isDomainLive(domain: DeploymentDomain): boolean {
  return domain.status === "verified" && domain.sslStatus === "active";
}

function instructionsForDomain(domain: DeploymentDomain): DnsInstructions {
  return {
    txtHost: `_mabps-verify.${domain.hostname}`,
    txtValue: domain.verificationToken,
    cnameHost: domain.hostname,
    cnameValue: domain.cnameTarget || DEFAULT_CNAME_TARGET,
    aRecordHost: "@",
    aRecordValue: domain.aRecordTarget || EXAMPLE_A_RECORD,
  };
}

function websiteUrl(hostname: string): string {
  return `https://${hostname}`;
}

function DomainProgress({ steps }: { steps: ProgressStep[] }) {
  return (
    <ol className="flex flex-col gap-0" aria-label="Domain connection progress">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <li key={step.id} className="flex flex-col">
            <div className="flex items-center gap-3">
              <span
                className={[
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  step.done
                    ? "bg-emerald-600 text-white"
                    : step.current
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-400",
                ].join(" ")}
                aria-hidden
              >
                {step.done ? "✓" : index + 1}
              </span>
              <span
                className={[
                  "text-sm font-medium",
                  step.done
                    ? "text-emerald-800"
                    : step.current
                      ? "text-zinc-900"
                      : "text-zinc-400",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>
            {!isLast ? (
              <div
                className={[
                  "ml-3.5 h-5 w-px",
                  step.done ? "bg-emerald-300" : "bg-zinc-200",
                ].join(" ")}
                aria-hidden
              >
                <span className="sr-only">↓</span>
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function DnsInstructionsCard({
  instructions,
  hostname,
}: {
  instructions: DnsInstructions;
  hostname: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <h3 className="text-base font-semibold text-zinc-900">
        Set up DNS for {hostname}
      </h3>
      <p className="mt-1 text-sm text-zinc-500">
        Log in to where you bought your domain (GoDaddy, Namecheap, Cloudflare,
        etc.) and add these records. Copy each value carefully.
      </p>

      <div className="mt-5 space-y-4">
        <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            A Record
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            Use this for your root domain (example.com).
          </p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-zinc-400">Type</dt>
              <dd className="font-mono font-medium text-zinc-900">A</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">Host / Name</dt>
              <dd className="font-mono font-medium text-zinc-900">
                {instructions.aRecordHost || "@"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">Value / Points to</dt>
              <dd className="break-all font-mono font-medium text-zinc-900">
                {instructions.aRecordValue || EXAMPLE_A_RECORD}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            CNAME
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            Use this for www or a subdomain (www.example.com).
          </p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-zinc-400">Type</dt>
              <dd className="font-mono font-medium text-zinc-900">CNAME</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">Host / Name</dt>
              <dd className="break-all font-mono font-medium text-zinc-900">
                {instructions.cnameHost}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">Value / Points to</dt>
              <dd className="break-all font-mono font-medium text-zinc-900">
                {instructions.cnameValue || DEFAULT_CNAME_TARGET}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Verification
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            This TXT record proves you own the domain. Keep it until verification
            succeeds.
          </p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-zinc-400">Type</dt>
              <dd className="font-mono font-medium text-zinc-900">TXT</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">Host / Name</dt>
              <dd className="break-all font-mono font-medium text-zinc-900">
                {instructions.txtHost}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">Value</dt>
              <dd className="break-all font-mono font-medium text-zinc-900">
                {instructions.txtValue}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

function PendingDnsState({ error }: { error?: string | null }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <p className="text-base font-semibold text-amber-950">
        Waiting for DNS changes…
      </p>
      <p className="mt-1 text-sm text-amber-900/80">
        DNS updates can take up to 24 hours. Most providers finish in a few
        minutes. After you save the records above, check again.
      </p>
      {error ? (
        <p className="mt-3 text-sm text-amber-900">{error}</p>
      ) : null}
    </div>
  );
}

function DomainSuccessScreen({
  hostname,
  onManageDns,
  copied,
  onCopy,
}: {
  hostname: string;
  onManageDns: () => void;
  copied: boolean;
  onCopy: () => void;
}) {
  const url = websiteUrl(hostname);
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
        Connected
      </p>
      <h3 className="mt-2 text-xl font-semibold text-emerald-950">
        Your website is now available at:
      </h3>
      <p className="mt-2 font-mono text-lg font-medium text-emerald-900">
        {hostname}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className={`${authButtonClassName} !w-auto px-4`}
        >
          Open Website
        </a>
        <button
          type="button"
          className={`${authSecondaryButtonClassName} !w-auto px-4`}
          onClick={onCopy}
        >
          {copied ? "Copied!" : "Copy URL"}
        </button>
        <button
          type="button"
          className={`${authSecondaryButtonClassName} !w-auto px-4`}
          onClick={onManageDns}
        >
          Manage DNS
        </button>
      </div>
    </div>
  );
}

function DomainCard({
  domain,
  projectName,
  canManage,
  pending,
  showDns,
  onToggleDns,
  onVerify,
  onRemove,
}: {
  domain: DeploymentDomain;
  projectName: string;
  canManage: boolean;
  pending: string | null;
  showDns: boolean;
  onToggleDns: () => void;
  onVerify: (force?: boolean) => void;
  onRemove: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const steps = stepsForDomain(domain);
  const waiting = isWaitingForDns(domain);
  const live = isDomainLive(domain);
  const instructions = instructionsForDomain(domain);
  const busy = Boolean(pending);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(websiteUrl(domain.hostname));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore clipboard errors in UI */
    }
  }

  return (
    <article className="space-y-5 rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            {domain.hostname}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Project: {projectName}
            {domain.isPrimary ? " · Primary domain" : ""}
          </p>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            {waiting || domain.sslStatus !== "active" ? (
              <>
                <button
                  type="button"
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
                  disabled={busy}
                  onClick={() => onVerify(false)}
                >
                  {pending === domain.id ? "Checking…" : "Check DNS"}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
                  disabled={busy}
                  onClick={() => onVerify(true)}
                >
                  Force verify
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
              disabled={busy}
              onClick={onRemove}
            >
              Remove
            </button>
          </div>
        ) : null}
      </div>

      <DomainProgress steps={steps} />

      {live ? (
        <DomainSuccessScreen
          hostname={domain.hostname}
          onManageDns={onToggleDns}
          copied={copied}
          onCopy={() => void copyUrl()}
        />
      ) : null}

      {waiting ? <PendingDnsState error={domain.lastDnsError} /> : null}

      {!live && domain.status === "verified" && domain.sslStatus !== "active" ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-5">
          <p className="text-base font-semibold text-sky-950">
            Securing your website…
          </p>
          <p className="mt-1 text-sm text-sky-900/80">
            DNS looks good. We are activating SSL so visitors see a secure
            https:// connection.
          </p>
        </div>
      ) : null}

      {showDns || waiting ? (
        <DnsInstructionsCard
          instructions={instructions}
          hostname={domain.hostname}
        />
      ) : live ? null : (
        <button
          type="button"
          className="text-sm font-medium text-zinc-700 underline-offset-2 hover:underline"
          onClick={onToggleDns}
        >
          Show DNS instructions
        </button>
      )}
    </article>
  );
}

export function DeploymentDomainsPanel({
  domains,
  projects,
  canManage,
}: {
  domains: DeploymentDomain[];
  projects: DeploymentProject[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [hostname, setHostname] = useState("");
  const [dnsProvider, setDnsProvider] = useState("manual");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<DnsInstructions | null>(
    null,
  );
  const [instructionsHost, setInstructionsHost] = useState<string | null>(null);
  const [dnsOpenIds, setDnsOpenIds] = useState<Record<string, boolean>>({});

  async function addDomain(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setPending("add");
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/deployment/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          hostname,
          dnsProvider,
          isPrimary: true,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        instructions?: DnsInstructions;
        domain?: DeploymentDomain;
      };
      if (!response.ok) throw new Error(data.error || "Unable to add domain.");
      const addedHost = hostname.trim().toLowerCase();
      setHostname("");
      setInstructions(
        data.instructions
          ? {
              ...data.instructions,
              aRecordHost: "@",
              aRecordValue: EXAMPLE_A_RECORD,
            }
          : null,
      );
      setInstructionsHost(addedHost);
      setSuccess(
        "Domain added. Next: update your DNS records, then check DNS.",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add domain.");
    } finally {
      setPending(null);
    }
  }

  async function verify(domainId: string, force = false) {
    if (!canManage) return;
    setPending(domainId);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/deployment/domains/${domainId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", force }),
      });
      const data = (await response.json()) as {
        error?: string;
        dnsOk?: boolean;
        dnsError?: string | null;
        domain?: DeploymentDomain;
      };
      if (!response.ok) throw new Error(data.error || "Verification failed.");
      if (data.dnsOk) {
        setSuccess("Domain verified. Your website connection is completing.");
      } else {
        setSuccess(data.dnsError || "Still waiting for DNS. Try again soon.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setPending(null);
    }
  }

  async function remove(domainId: string) {
    if (!canManage) return;
    setPending(domainId);
    setError(null);
    try {
      const response = await fetch(`/api/deployment/domains/${domainId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to remove.");
      setSuccess("Domain removed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove.");
    } finally {
      setPending(null);
    }
  }

  const projectName = (id: string) =>
    projects.find((p) => p.id === id)?.name || id.slice(0, 8);

  function toggleDns(domainId: string) {
    setDnsOpenIds((prev) => ({ ...prev, [domainId]: !prev[domainId] }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Connect your domain
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500">
          Use your own web address (like example.com) for your published site.
          Add the domain, update DNS at your registrar, then we activate SSL and
          take your website live.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      {instructions && instructionsHost ? (
        <div className="space-y-4">
          <DomainProgress
            steps={[
              {
                id: "added",
                label: "Domain Added",
                done: true,
                current: false,
              },
              {
                id: "dns",
                label: "DNS Updated",
                done: false,
                current: true,
              },
              {
                id: "ssl",
                label: "SSL Active",
                done: false,
                current: false,
              },
              {
                id: "live",
                label: "Website Live",
                done: false,
                current: false,
              },
            ]}
          />
          <PendingDnsState />
          <DnsInstructionsCard
            instructions={instructions}
            hostname={instructionsHost}
          />
        </div>
      ) : null}

      {canManage && projects.length > 0 ? (
        <form
          onSubmit={addDomain}
          className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5"
        >
          <h2 className="text-sm font-semibold text-zinc-900">Add a domain</h2>
          <p className="text-sm text-zinc-500">
            Enter the domain you already own. You will copy a few DNS settings
            next—no coding required.
          </p>
          <div>
            <label className={authLabelClassName} htmlFor="domain-project">
              Project
            </label>
            <select
              id="domain-project"
              className={authInputClassName}
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={Boolean(pending)}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={authLabelClassName} htmlFor="domain-host">
              Your domain
            </label>
            <input
              id="domain-host"
              className={authInputClassName}
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="www.example.com"
              required
              disabled={Boolean(pending)}
            />
          </div>
          <div>
            <label className={authLabelClassName} htmlFor="domain-dns">
              Where is your DNS managed?
            </label>
            <select
              id="domain-dns"
              className={authInputClassName}
              value={dnsProvider}
              onChange={(e) => setDnsProvider(e.target.value)}
              disabled={Boolean(pending)}
            >
              <option value="manual">I will update DNS myself</option>
              <option value="cloudflare">Cloudflare</option>
              <option value="vercel">Vercel</option>
            </select>
          </div>
          <button
            type="submit"
            className={`${authButtonClassName} !w-auto px-4`}
            disabled={Boolean(pending)}
          >
            {pending === "add" ? "Adding…" : "Add domain"}
          </button>
        </form>
      ) : null}

      {domains.length === 0 && !instructions ? (
        <p className="text-sm text-zinc-500">
          No custom domains yet. Add one above to get started.
        </p>
      ) : (
        <div className="space-y-4">
          {domains.map((domain) => (
            <DomainCard
              key={domain.id}
              domain={domain}
              projectName={projectName(domain.projectId)}
              canManage={canManage}
              pending={pending}
              showDns={Boolean(dnsOpenIds[domain.id])}
              onToggleDns={() => toggleDns(domain.id)}
              onVerify={(force) => void verify(domain.id, force)}
              onRemove={() => void remove(domain.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
