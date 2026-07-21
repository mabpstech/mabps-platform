"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
  authSecondaryButtonClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";
import type { WebsiteSite } from "@/lib/website/types";
import { StatusBadge } from "@/components/website/ui/empty-state";

export type PublishChecklistItem = {
  id: string;
  label: string;
  ok: boolean;
};

type PublishHistory = {
  publishedBy: string;
  publishedAt: string;
  latestVersion: string;
};

type DisplayStatus = "draft" | "publishing" | "published" | "failed" | "unpublished";

function liveUrlFor(site: WebsiteSite): string {
  if (typeof window !== "undefined") {
    if (site.customDomain && site.domainVerified) {
      return `https://${site.customDomain}`;
    }
    return `${window.location.origin}/p/${site.slug}`;
  }
  if (site.customDomain && site.domainVerified) {
    return `https://${site.customDomain}`;
  }
  return `/p/${site.slug}`;
}

function versionFromDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  return `v${y}.${m}.${d}.${h}${min}`;
}

function toDisplayStatus(
  siteStatus: WebsiteSite["status"],
  pending: string | null,
  failed: boolean,
): DisplayStatus {
  if (pending === "publish") return "publishing";
  if (failed) return "failed";
  if (siteStatus === "published") return "published";
  if (siteStatus === "unpublished") return "unpublished";
  return "draft";
}

export function PublishPanel({
  site,
  canManage,
  checklist,
  publisherName,
}: {
  site: WebsiteSite;
  canManage: boolean;
  checklist: PublishChecklistItem[];
  publisherName: string;
}) {
  const router = useRouter();
  const [domain, setDomain] = useState(site.customDomain ?? "");
  const [current, setCurrent] = useState(site);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [publishFailed, setPublishFailed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<PublishHistory | null>(() =>
    site.publishedAt
      ? {
          publishedBy: publisherName,
          publishedAt: site.publishedAt,
          latestVersion: versionFromDate(site.updatedAt || site.publishedAt),
        }
      : null,
  );

  const displayStatus = toDisplayStatus(current.status, pending, publishFailed);
  const liveUrl = liveUrlFor(current);
  const warningCount = useMemo(
    () => checklist.filter((item) => !item.ok).length,
    [checklist],
  );

  async function publish(action: "publish" | "unpublish") {
    if (!canManage) return;
    setPending(action);
    setError(null);
    setMessage(null);
    if (action === "publish") setPublishFailed(false);
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
      if (action === "publish") {
        const publishedAt =
          data.site?.updatedAt ||
          data.site?.publishedAt ||
          new Date().toISOString();
        setHistory({
          publishedBy: publisherName,
          publishedAt,
          latestVersion: versionFromDate(publishedAt),
        });
        setShowSuccess(true);
        setMessage(null);
      } else {
        setShowSuccess(false);
        setMessage("Site unpublished.");
      }
      router.refresh();
    } catch (err) {
      if (action === "publish") setPublishFailed(true);
      setShowSuccess(false);
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

  async function copyLiveUrl() {
    try {
      await navigator.clipboard.writeText(liveUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Unable to copy URL.");
    }
  }

  async function shareLiveUrl() {
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator.share({
          title: current.name,
          text: `${current.name} is live`,
          url: liveUrl,
        });
        return;
      }
      await copyLiveUrl();
      setMessage("Link copied — ready to share.");
    } catch {
      // User cancelled share sheet; ignore.
    }
  }

  if (showSuccess && current.status === "published") {
    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50">
          <div className="px-6 py-10 text-center sm:px-10 sm:py-14">
            <p className="text-4xl" aria-hidden>
              🎉
            </p>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              Your website is now live!
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
              {current.name} is published and ready for visitors.
            </p>
            <div className="mx-auto mt-6 flex max-w-xl items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left shadow-sm">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Live URL
                </p>
                <p className="mt-0.5 truncate font-mono text-sm text-zinc-800">
                  {liveUrl}
                </p>
              </div>
              <StatusBadge status="published" />
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                className={`${authButtonClassName} !w-auto px-4`}
                onClick={() => void copyLiveUrl()}
              >
                {copied ? "Copied!" : "Copy URL"}
              </button>
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className={`${authSecondaryButtonClassName} !w-auto px-4 no-underline`}
              >
                Open Website
              </a>
              <Link
                href="/analytics/website"
                className={`${authSecondaryButtonClassName} !w-auto px-4 no-underline`}
              >
                View Analytics
              </Link>
              <button
                type="button"
                className={`${authSecondaryButtonClassName} !w-auto px-4`}
                onClick={() => void shareLiveUrl()}
              >
                Share
              </button>
            </div>
            {canManage ? (
              <button
                type="button"
                className="mt-6 text-sm font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline"
                onClick={() => setShowSuccess(false)}
              >
                Back to publish settings
              </button>
            ) : null}
          </div>
        </div>

        {history ? <PublishHistoryCard history={history} /> : null}

        {canManage ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-medium text-zinc-900">Manage</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Republish after changes, or take the site offline.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className={`${authButtonClassName} !w-auto px-4`}
                onClick={() => {
                  setShowSuccess(false);
                }}
                disabled={Boolean(pending)}
              >
                Review & republish
              </button>
              <button
                type="button"
                className={`${authSecondaryButtonClassName} !w-auto px-4`}
                onClick={() => void publish("unpublish")}
                disabled={Boolean(pending)}
              >
                {pending === "unpublish" ? "Working…" : "Unpublish"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Publish</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Review readiness, publish the site, and connect a custom domain.
          </p>
        </div>
        <StatusBadge status={displayStatus} />
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {message ? <p className={authSuccessClassName}>{message}</p> : null}

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-medium text-zinc-900">
            Pre-publish checklist
          </h2>
          {warningCount > 0 ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
              {warningCount} warning{warningCount === 1 ? "" : "s"}
            </span>
          ) : (
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
              Ready to publish
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Missing items are warnings only — you can still publish.
        </p>
        <ul className="mt-4 divide-y divide-zinc-100 rounded-lg border border-zinc-100">
          {checklist.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <span className="flex items-center gap-2 text-zinc-800">
                <span
                  className={
                    item.ok
                      ? "font-medium text-emerald-600"
                      : "font-medium text-amber-600"
                  }
                  aria-hidden
                >
                  {item.ok ? "✓" : "!"}
                </span>
                {item.label}
              </span>
              <span
                className={
                  item.ok
                    ? "text-xs font-medium text-emerald-700"
                    : "text-xs font-medium text-amber-700"
                }
              >
                {item.ok ? "Complete" : "Warning"}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          <p>
            Public path:{" "}
            <Link
              href={`/p/${current.slug}`}
              className="font-medium text-zinc-900 underline underline-offset-2"
              target="_blank"
            >
              /p/{current.slug}
            </Link>
          </p>
          {current.publishedAt ? (
            <p className="mt-1">
              First published{" "}
              {new Date(current.publishedAt).toLocaleString()}
            </p>
          ) : null}
        </div>

        {canManage ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              className={`${authButtonClassName} !w-auto px-4`}
              onClick={() => void publish("publish")}
              disabled={Boolean(pending)}
            >
              {pending === "publish"
                ? "Publishing…"
                : current.status === "published"
                  ? "Publish again"
                  : "Publish website"}
            </button>
            {current.status === "published" ? (
              <button
                type="button"
                className={`${authSecondaryButtonClassName} !w-auto px-4`}
                onClick={() => void publish("unpublish")}
                disabled={Boolean(pending)}
              >
                {pending === "unpublish" ? "Working…" : "Unpublish"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {history ? <PublishHistoryCard history={history} /> : null}

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
            <p className="mt-1 break-all font-mono text-xs">
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
              onClick={() => void saveDomain()}
              disabled={Boolean(pending)}
            >
              {pending === "domain" ? "Saving…" : "Save domain"}
            </button>
            <button
              type="button"
              className={`${authSecondaryButtonClassName} !w-auto px-4`}
              onClick={() => void verifyDomain()}
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

function PublishHistoryCard({ history }: { history: PublishHistory }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="text-lg font-medium text-zinc-900">Publish history</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Latest successful publish for this website.
      </p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Published by
          </dt>
          <dd className="mt-1 text-sm font-medium text-zinc-900">
            {history.publishedBy}
          </dd>
        </div>
        <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Published at
          </dt>
          <dd className="mt-1 text-sm font-medium text-zinc-900">
            {new Date(history.publishedAt).toLocaleString()}
          </dd>
        </div>
        <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Latest version
          </dt>
          <dd className="mt-1 font-mono text-sm font-medium text-zinc-900">
            {history.latestVersion}
          </dd>
        </div>
      </dl>
    </div>
  );
}
