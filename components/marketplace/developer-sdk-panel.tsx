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
import { KIND_LABELS, SDK_SCOPES } from "@/lib/marketplace/defaults";
import type {
  ListingKind,
  MarketplaceApiKey,
  MarketplaceDeveloper,
  MarketplaceListing,
  MarketplacePurchase,
} from "@/lib/marketplace/types";
import { LISTING_KINDS } from "@/lib/marketplace/types";
import { SDK_QUICKSTART } from "@/lib/marketplace/sdk";

export function DeveloperSdkPanel({
  developer,
  apiKeys,
  listings,
  purchases,
  sdk,
}: {
  developer: MarketplaceDeveloper;
  apiKeys: MarketplaceApiKey[];
  listings: MarketplaceListing[];
  purchases: MarketplacePurchase[];
  sdk: typeof SDK_QUICKSTART;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(developer.displayName);
  const [supportEmail, setSupportEmail] = useState(developer.supportEmail ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(developer.websiteUrl ?? "");
  const [bio, setBio] = useState(developer.bio ?? "");

  const [listingName, setListingName] = useState("");
  const [listingSlug, setListingSlug] = useState("");
  const [listingKind, setListingKind] = useState<ListingKind>("plugin");

  async function saveDeveloper(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/marketplace/developer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          supportEmail,
          websiteUrl,
          bio,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to save developer profile.");
      }
      setSuccess("Developer profile saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setPending(false);
    }
  }

  async function createKey() {
    setPending(true);
    setError(null);
    setSuccess(null);
    setCreatedKey(null);
    try {
      const response = await fetch("/api/marketplace/developer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "SDK key",
          scopes: [...SDK_SCOPES],
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        apiKey?: MarketplaceApiKey;
      };
      if (!response.ok) {
        throw new Error(data.error || "Unable to create API key.");
      }
      setCreatedKey(data.apiKey?.keyPlaintext ?? null);
      setSuccess("API key created. Copy it now — it will not be shown again.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create key.");
    } finally {
      setPending(false);
    }
  }

  async function revokeKey(keyId: string) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/marketplace/developer/keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to revoke key.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to revoke key.");
    } finally {
      setPending(false);
    }
  }

  async function publishListing(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/marketplace/developer/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: listingName,
          slug: listingSlug,
          kind: listingKind,
          summary: `${listingName} published via Developer SDK`,
          description: `${listingName} workspace listing.`,
          pricingModel: "free",
          permissions: ["workspace.read"],
          version: "1.0.0",
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to publish listing.");
      }
      setListingName("");
      setListingSlug("");
      setSuccess("Listing published to the catalog.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to publish.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Developer SDK</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Publish listings, manage API keys, and integrate with the Plugin API.
          Multi-tenant installs stay scoped to each workspace.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}
      {createdKey ? (
        <p className={authSuccessClassName}>
          Plaintext key: <code className="break-all">{createdKey}</code>
        </p>
      ) : null}

      <form
        onSubmit={saveDeveloper}
        className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4"
      >
        <h2 className="text-sm font-semibold text-zinc-900">
          Developer profile
        </h2>
        <div>
          <label className={authLabelClassName}>Display name</label>
          <input
            className={authInputClassName}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
            disabled={pending}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={authLabelClassName}>Support email</label>
            <input
              className={authInputClassName}
              value={supportEmail}
              onChange={(event) => setSupportEmail(event.target.value)}
              disabled={pending}
            />
          </div>
          <div>
            <label className={authLabelClassName}>Website</label>
            <input
              className={authInputClassName}
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
              disabled={pending}
            />
          </div>
        </div>
        <div>
          <label className={authLabelClassName}>Bio</label>
          <textarea
            className={authInputClassName}
            rows={3}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            disabled={pending}
          />
        </div>
        <button
          type="submit"
          className={`${authButtonClassName} !w-auto px-4`}
          disabled={pending}
        >
          Save profile
        </button>
      </form>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900">API keys</h2>
          <button
            type="button"
            className={`${authButtonClassName} !w-auto px-4`}
            disabled={pending}
            onClick={createKey}
          >
            Create key
          </button>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {apiKeys.map((key) => (
            <li
              key={key.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-2"
            >
              <div>
                <p className="font-medium text-zinc-900">
                  {key.name}{" "}
                  <span className="font-normal text-zinc-500">
                    ({key.keyPrefix}…)
                  </span>
                </p>
                <p className="text-xs text-zinc-500">
                  scopes: {key.scopes.join(", ") || "none"}
                  {key.revokedAt ? " · revoked" : ""}
                </p>
              </div>
              {!key.revokedAt ? (
                <button
                  type="button"
                  className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5`}
                  disabled={pending}
                  onClick={() => revokeKey(key.id)}
                >
                  Revoke
                </button>
              ) : null}
            </li>
          ))}
          {!apiKeys.length ? (
            <li className="text-zinc-500">No API keys yet.</li>
          ) : null}
        </ul>
      </div>

      <form
        onSubmit={publishListing}
        className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4"
      >
        <h2 className="text-sm font-semibold text-zinc-900">
          Publish listing
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className={authLabelClassName}>Kind</label>
            <select
              className={authInputClassName}
              value={listingKind}
              onChange={(event) =>
                setListingKind(event.target.value as ListingKind)
              }
              disabled={pending}
            >
              {LISTING_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {KIND_LABELS[kind]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={authLabelClassName}>Name</label>
            <input
              className={authInputClassName}
              value={listingName}
              onChange={(event) => setListingName(event.target.value)}
              required
              disabled={pending}
            />
          </div>
          <div>
            <label className={authLabelClassName}>Slug</label>
            <input
              className={authInputClassName}
              value={listingSlug}
              onChange={(event) => setListingSlug(event.target.value)}
              required
              disabled={pending}
              placeholder="my-plugin"
            />
          </div>
        </div>
        <button
          type="submit"
          className={`${authButtonClassName} !w-auto px-4`}
          disabled={pending}
        >
          Publish
        </button>
      </form>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">
          Your published listings
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          {listings.map((listing) => (
            <li key={listing.id} className="text-zinc-700">
              {listing.name}{" "}
              <span className="text-zinc-400">
                ({KIND_LABELS[listing.kind]} · v{listing.latestVersion})
              </span>
            </li>
          ))}
          {!listings.length ? (
            <li className="text-zinc-500">No workspace listings yet.</li>
          ) : null}
        </ul>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">
          Billing / purchases
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-zinc-600">
          {purchases.map((purchase) => (
            <li key={purchase.id}>
              {purchase.status} · {(purchase.amountCents / 100).toFixed(2)}{" "}
              {purchase.currency.toUpperCase()} · {purchase.pricingModel}
            </li>
          ))}
          {!purchases.length ? (
            <li>No marketplace purchases yet.</li>
          ) : null}
        </ul>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">SDK quickstart</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Base URL <code>{sdk.baseUrl}</code>
        </p>
        <p className="mt-1 text-sm text-zinc-600">{sdk.authHeader}</p>
        <ul className="mt-3 space-y-2 text-sm text-zinc-600">
          {sdk.endpoints.map((endpoint) => (
            <li key={`${endpoint.method}-${endpoint.path}`}>
              <span className="font-medium text-zinc-900">
                {endpoint.method} {endpoint.path}
              </span>{" "}
              · {endpoint.scope} — {endpoint.description}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
