"use client";

import Link from "next/link";
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
import type { WebsiteSite } from "@/lib/website/types";

export function PublishPanel({
  site,
  canManage,
}: {
  site: WebsiteSite;
  canManage: boolean;
}) {
  const router = useRouter();
  const [domain, setDomain] = useState(site.customDomain ?? "");
  const [current, setCurrent] = useState(site);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function publish(action: "publish" | "unpublish") {
    if (!canManage) return;
    setPending(action);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/website/sites/${site.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: action === "unpublish" ? "unpublish" : "publish",
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        site?: WebsiteSite;
        publicPath?: string;
      };
      if (!response.ok) throw new Error(data.error || "Publish failed.");
      if (data.site) setCurrent(data.site);
      setMessage(
        action === "publish"
          ? `Published at ${data.publicPath ?? `/p/${site.slug}`}`
          : "Site unpublished.",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed.");
    } finally {
      setPending(null);
    }
  }

  async function saveDomain() {
    if (!canManage) return;
    setPending("domain");
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/website/sites/${site.id}/domain`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customDomain: domain.trim() ? domain.trim() : null,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        site?: WebsiteSite;
        instructions?: string | null;
      };
      if (!response.ok) throw new Error(data.error || "Unable to save domain.");
      if (data.site) {
        setCurrent(data.site);
        setDomain(data.site.customDomain ?? "");
      }
      setMessage(data.instructions || "Custom domain updated.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save domain.");
    } finally {
      setPending(null);
    }
  }

  async function verifyDomain() {
    if (!canManage) return;
    setPending("verify");
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/website/sites/${site.id}/domain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify" }),
      });
      const data = (await response.json()) as {
        error?: string;
        site?: WebsiteSite;
      };
      if (!response.ok) throw new Error(data.error || "Verification failed.");
      if (data.site) setCurrent(data.site);
      setMessage("Custom domain verified.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Publish</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Publish the site and connect a custom domain.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {message ? <p className={authSuccessClassName}>{message}</p> : null}

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-medium text-zinc-900">Status</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Current status:{" "}
          <span className="font-medium text-zinc-900">{current.status}</span>
          {current.publishedAt
            ? ` · first published ${new Date(current.publishedAt).toLocaleString()}`
            : ""}
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          Public path:{" "}
          <Link
            href={`/p/${current.slug}`}
            className="underline underline-offset-2"
            target="_blank"
          >
            /p/{current.slug}
          </Link>
        </p>
        {canManage ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={`${authButtonClassName} !w-auto px-4`}
              onClick={() => publish("publish")}
              disabled={Boolean(pending)}
            >
              {pending === "publish" ? "Publishing…" : "Publish site"}
            </button>
            <button
              type="button"
              className={`${authSecondaryButtonClassName} !w-auto px-4`}
              onClick={() => publish("unpublish")}
              disabled={Boolean(pending)}
            >
              {pending === "unpublish" ? "Working…" : "Unpublish"}
            </button>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-medium text-zinc-900">Custom domain</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Point your domain DNS to this app, add a TXT verification record, then
          verify.
        </p>
        <div className="mt-4 max-w-xl">
          <label className={authLabelClassName}>Domain</label>
          <input
            className={authInputClassName}
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            placeholder="www.example.com"
            disabled={!canManage || Boolean(pending)}
          />
        </div>
        {current.domainVerificationToken ? (
          <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
            <p className="font-medium">DNS TXT record</p>
            <p className="mt-1 font-mono text-xs">
              Host: {current.customDomain}
            </p>
            <p className="mt-1 font-mono text-xs break-all">
              Value: {current.domainVerificationToken}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Verified: {current.domainVerified ? "yes" : "no"}
            </p>
          </div>
        ) : null}
        {canManage ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={`${authButtonClassName} !w-auto px-4`}
              onClick={saveDomain}
              disabled={Boolean(pending)}
            >
              {pending === "domain" ? "Saving…" : "Save domain"}
            </button>
            <button
              type="button"
              className={`${authSecondaryButtonClassName} !w-auto px-4`}
              onClick={verifyDomain}
              disabled={Boolean(pending) || !current.customDomain}
            >
              {pending === "verify" ? "Verifying…" : "Mark verified"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
