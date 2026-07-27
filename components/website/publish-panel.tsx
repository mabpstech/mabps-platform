"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  authButtonClassName,
  authInputClassName,
  authLabelClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import type { WebsitePublishEvent, WebsiteSite } from "@/lib/website/types";
import { StatusBadge } from "@/components/website/ui/empty-state";
import { InlineBanner } from "@/components/website/ui/inline-banner";

export type PublishChecklistItem = {
  id: string;
  label: string;
  ok: boolean;
  /** When true, publish is blocked until this item is complete. */
  required?: boolean;
};

type DomainInstructions = {
  customDomain: string;
  txtHost: string;
  txtValue: string;
  cnameHost: string;
  cnameValue: string;
  apexNote: string | null;
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
  initialEvents,
}: {
  site: WebsiteSite;
  canManage: boolean;
  checklist: PublishChecklistItem[];
  publisherName: string;
  initialEvents: WebsitePublishEvent[];
}) {
  const router = useRouter();
  const [domain, setDomain] = useState(site.customDomain ?? "");
  const [current, setCurrent] = useState(site);
  const [events, setEvents] = useState(initialEvents);
  const [domainInstructions, setDomainInstructions] =
    useState<DomainInstructions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [publishFailed, setPublishFailed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!site.customDomain) return;
    let cancelled = false;
    void fetch(`/api/website/sites/${site.id}/domain`)
      .then((response) => response.json())
      .then((data: { instructions?: DomainInstructions | null }) => {
        if (!cancelled && data.instructions) {
          setDomainInstructions(data.instructions);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [site.customDomain, site.id]);

  const displayStatus = toDisplayStatus(current.status, pending, publishFailed);
  const liveUrl = liveUrlFor(current);
  const warningCount = useMemo(
    () => checklist.filter((item) => !item.ok && !item.required).length,
    [checklist],
  );
  const blockingItems = useMemo(
    () => checklist.filter((item) => item.required && !item.ok),
    [checklist],
  );
  const latestPublish = events.find((event) => event.action === "publish");

  async function publish(action: "publish" | "unpublish") {
    if (!canManage) return;
    if (action === "publish" && blockingItems.length > 0) {
      setError(
        `Finish required items before publishing: ${blockingItems
          .map((item) => item.label)
          .join(", ")}.`,
      );
      return;
    }
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
        events?: WebsitePublishEvent[];
        draftPageCount?: number;
      };
      if (!response.ok) throw new Error(data.error || "Publish failed.");
      if (data.site) setCurrent(data.site);
      if (data.events) setEvents(data.events);
      if (action === "publish") {
        setShowSuccess(true);
        setMessage(null);
        if (data.draftPageCount && data.draftPageCount > 0) {
          setMessage(
            `${data.draftPageCount} draft page${data.draftPageCount === 1 ? "" : "s"} remain private.`,
          );
        }
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
        message?: string | null;
        instructions?: DomainInstructions | null;
      };
      if (!response.ok) throw new Error(data.error || "Unable to save domain.");
      if (data.site) {
        setCurrent(data.site);
        setDomain(data.site.customDomain ?? "");
      }
      setDomainInstructions(data.instructions ?? null);
      setMessage(data.message || "Custom domain updated.");
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
        message?: string;
        instructions?: DomainInstructions | null;
        txtOk?: boolean;
        cnameOk?: boolean;
      };
      if (!response.ok) throw new Error(data.error || "Verification failed.");
      if (data.site) setCurrent(data.site);
      if (data.instructions !== undefined) {
        setDomainInstructions(data.instructions);
      }
      setMessage(data.message || "Custom domain verified.");
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
              ✓
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

        <PublishHistoryCard events={events} fallbackName={publisherName} />

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

      <InlineBanner message={error} tone="error" />
      <InlineBanner message={message} tone="success" />

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-medium text-zinc-900">
            Pre-publish checklist
          </h2>
          {blockingItems.length > 0 ? (
            <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">
              {blockingItems.length} required
            </span>
          ) : warningCount > 0 ? (
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
          Required items must pass. Warnings are optional but recommended.
        </p>
        <ul className="mt-4 divide-y divide-zinc-100 rounded-lg border border-zinc-100">
          {checklist.map((item) => {
            const tone = item.ok
              ? "ok"
              : item.required
                ? "required"
                : "warning";
            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <span className="flex items-center gap-2 text-zinc-800">
                  <span
                    className={
                      tone === "ok"
                        ? "font-medium text-emerald-600"
                        : tone === "required"
                          ? "font-medium text-red-600"
                          : "font-medium text-amber-600"
                    }
                    aria-hidden
                  >
                    {tone === "ok" ? "✓" : tone === "required" ? "×" : "!"}
                  </span>
                  {item.label}
                </span>
                <span
                  className={
                    tone === "ok"
                      ? "text-xs font-medium text-emerald-700"
                      : tone === "required"
                        ? "text-xs font-medium text-red-700"
                        : "text-xs font-medium text-amber-700"
                  }
                >
                  {tone === "ok"
                    ? "Complete"
                    : tone === "required"
                      ? "Required"
                      : "Warning"}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          <p>
            Public path:{" "}
            <Link
              href={`/p/${current.slug}?preview=1`}
              className="font-medium text-zinc-900 underline underline-offset-2"
              target="_blank"
            >
              /p/{current.slug}
            </Link>
          </p>
          {latestPublish ? (
            <p className="mt-1">
              Last published {new Date(latestPublish.createdAt).toLocaleString()}{" "}
              as {latestPublish.versionLabel}
              {latestPublish.actorName ? ` by ${latestPublish.actorName}` : ""}
            </p>
          ) : current.publishedAt ? (
            <p className="mt-1">
              First published {new Date(current.publishedAt).toLocaleString()}
            </p>
          ) : null}
        </div>

        {canManage ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              className={`${authButtonClassName} !w-auto px-4`}
              onClick={() => void publish("publish")}
              disabled={Boolean(pending) || blockingItems.length > 0}
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

      <PublishHistoryCard events={events} fallbackName={publisherName} />

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-medium text-zinc-900">Custom domain</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Connect a domain you own. We verify ownership with a TXT record, then
          you point a CNAME at MABPS so visitors can reach your site.
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
          <p className="mt-1.5 text-xs text-zinc-500">
            Prefer a www subdomain. Apex domains often need ALIAS/ANAME support.
          </p>
        </div>
        {domainInstructions ? (
          <div className="mt-4 space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
            <div>
              <p className="font-medium">1. Ownership TXT record</p>
              <p className="mt-1 font-mono text-xs">
                Host: {domainInstructions.txtHost}
              </p>
              <p className="mt-1 break-all font-mono text-xs">
                Value: {domainInstructions.txtValue}
              </p>
            </div>
            <div>
              <p className="font-medium">2. Traffic CNAME record</p>
              <p className="mt-1 font-mono text-xs">
                Host: {domainInstructions.cnameHost}
              </p>
              <p className="mt-1 font-mono text-xs">
                Value: {domainInstructions.cnameValue}
              </p>
            </div>
            {domainInstructions.apexNote ? (
              <p className="text-xs text-amber-700">{domainInstructions.apexNote}</p>
            ) : null}
            <p className="text-xs text-zinc-500">
              Status:{" "}
              {current.domainVerified
                ? "Ownership verified"
                : "Waiting for DNS verification"}
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
              {pending === "verify" ? "Checking DNS…" : "Verify DNS"}
            </button>
            {current.customDomain ? (
              <button
                type="button"
                className={`${authSecondaryButtonClassName} !w-auto px-4 text-red-700`}
                onClick={() => {
                  setDomain("");
                  void (async () => {
                    setPending("domain");
                    try {
                      const response = await fetch(
                        `/api/website/sites/${site.id}/domain`,
                        {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ customDomain: null }),
                        },
                      );
                      const data = (await response.json()) as {
                        error?: string;
                        site?: WebsiteSite;
                      };
                      if (!response.ok) {
                        throw new Error(data.error || "Unable to remove domain.");
                      }
                      if (data.site) setCurrent(data.site);
                      setDomainInstructions(null);
                      setMessage("Custom domain removed.");
                      router.refresh();
                    } catch (err) {
                      setError(
                        err instanceof Error
                          ? err.message
                          : "Unable to remove domain.",
                      );
                    } finally {
                      setPending(null);
                    }
                  })();
                }}
                disabled={Boolean(pending)}
              >
                Remove
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PublishHistoryCard({
  events,
  fallbackName,
}: {
  events: WebsitePublishEvent[];
  fallbackName: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="text-lg font-medium text-zinc-900">Publish history</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Every publish and unpublish is recorded with who made the change.
      </p>
      {events.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">
          No publish events yet{fallbackName ? ` — ${fallbackName} can publish first` : ""}.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-100 rounded-lg border border-zinc-100">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-zinc-900">
                  {event.action === "publish" ? "Published" : "Unpublished"}{" "}
                  <span className="font-mono text-xs text-zinc-500">
                    {event.versionLabel}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {event.actorName || fallbackName} ·{" "}
                  {new Date(event.createdAt).toLocaleString()}
                </p>
                {event.note ? (
                  <p className="mt-1 text-xs text-amber-700">{event.note}</p>
                ) : null}
              </div>
              <StatusBadge
                status={event.action === "publish" ? "published" : "unpublished"}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
