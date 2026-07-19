"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import { KIND_LABELS, PERMISSION_LABELS } from "@/lib/marketplace/defaults";
import type { MarketplaceInstallWithListing } from "@/lib/marketplace/types";
import type { UpdateAvailability } from "@/lib/marketplace/engine/updates";

export function InstallsManager({
  installs,
  updates,
}: {
  installs: MarketplaceInstallWithListing[];
  updates: UpdateAvailability[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const updatesByInstall = new Map(
    updates.map((update) => [update.installId, update]),
  );

  async function runAction(
    installId: string,
    action: "enable" | "disable" | "update" | "uninstall",
  ) {
    setPendingId(installId);
    setError(null);
    try {
      let response: Response;
      if (action === "uninstall") {
        response = await fetch(`/api/marketplace/installs/${installId}`, {
          method: "DELETE",
        });
      } else {
        response = await fetch(
          `/api/marketplace/installs/${installId}/${action}`,
          { method: "POST" },
        );
      }
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || `Unable to ${action} install.`);
      }
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Unable to ${action} install.`,
      );
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Installed</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Enable, disable, update, and uninstall workspace marketplace items.
          Permissions are enforced per install.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}

      <div className="space-y-3">
        {installs.map((install) => {
          const update = updatesByInstall.get(install.id);
          const busy = pendingId === install.id;
          return (
            <div
              key={install.id}
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    {KIND_LABELS[install.listing.kind]}
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-zinc-900">
                    <Link
                      href={`/marketplace/catalog/${install.listingId}`}
                      className="hover:underline"
                    >
                      {install.listing.name}
                    </Link>
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    v{install.version}
                    {install.enabled ? " · enabled" : " · disabled"}
                    {update?.available
                      ? ` · update to v${update.latestVersion}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {install.enabled ? (
                    <button
                      type="button"
                      className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5`}
                      disabled={busy}
                      onClick={() => runAction(install.id, "disable")}
                    >
                      Disable
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`${authButtonClassName} !w-auto px-3 py-1.5`}
                      disabled={busy}
                      onClick={() => runAction(install.id, "enable")}
                    >
                      Enable
                    </button>
                  )}
                  {update?.available ? (
                    <button
                      type="button"
                      className={`${authButtonClassName} !w-auto px-3 py-1.5`}
                      disabled={busy}
                      onClick={() => runAction(install.id, "update")}
                    >
                      Update
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5`}
                    disabled={busy}
                    onClick={() => runAction(install.id, "uninstall")}
                  >
                    Uninstall
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Granted permissions
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  {install.grantedPermissions.length
                    ? install.grantedPermissions
                        .map(
                          (permission) =>
                            PERMISSION_LABELS[permission] ?? permission,
                        )
                        .join(", ")
                    : "None"}
                </p>
              </div>
            </div>
          );
        })}
        {!installs.length ? (
          <p className="rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-8 text-sm text-zinc-500">
            No installs yet. Browse the{" "}
            <Link href="/marketplace/catalog" className="underline">
              catalog
            </Link>
            .
          </p>
        ) : null}
      </div>
    </div>
  );
}
