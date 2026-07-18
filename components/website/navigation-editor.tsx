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
import type { WebsiteNavItem, WebsitePage } from "@/lib/website/types";

type DraftItem = {
  key: string;
  label: string;
  href: string;
  pageId: string;
  openInNewTab: boolean;
};

export function NavigationEditor({
  siteId,
  navigation,
  pages,
  canManage,
}: {
  siteId: string;
  navigation: WebsiteNavItem[];
  pages: WebsitePage[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState<DraftItem[]>(
    navigation.map((item) => ({
      key: item.id,
      label: item.label,
      href: item.href ?? "",
      pageId: item.pageId ?? "",
      openInNewTab: item.openInNewTab,
    })),
  );
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function addItem() {
    setItems((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        label: "New link",
        href: "/",
        pageId: "",
        openInNewTab: false,
      },
    ]);
  }

  function reorder(fromKey: string, toKey: string) {
    setItems((current) => {
      const from = current.findIndex((item) => item.key === fromKey);
      const to = current.findIndex((item) => item.key === toKey);
      if (from < 0 || to < 0) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  async function save() {
    if (!canManage) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/website/sites/${siteId}/navigation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            label: item.label,
            href: item.href || null,
            pageId: item.pageId || null,
            openInNewTab: item.openInNewTab,
          })),
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        navigation?: WebsiteNavItem[];
      };
      if (!response.ok) {
        throw new Error(data.error || "Unable to save navigation.");
      }
      if (data.navigation) {
        setItems(
          data.navigation.map((item) => ({
            key: item.id,
            label: item.label,
            href: item.href ?? "",
            pageId: item.pageId ?? "",
            openInNewTab: item.openInNewTab,
          })),
        );
      }
      setMessage("Navigation saved.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save navigation.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Navigation</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Drag to reorder menu items. Link to a page or custom href.
          </p>
        </div>
        <div className="flex gap-2">
          {canManage ? (
            <>
              <button
                type="button"
                className={`${authSecondaryButtonClassName} !w-auto px-3`}
                onClick={addItem}
              >
                Add item
              </button>
              <button
                type="button"
                className={`${authButtonClassName} !w-auto px-4`}
                onClick={save}
                disabled={pending}
              >
                {pending ? "Saving…" : "Save navigation"}
              </button>
            </>
          ) : null}
        </div>
      </div>
      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {message ? <p className={authSuccessClassName}>{message}</p> : null}

      <ul className="space-y-3">
        {items.map((item, index) => (
          <li
            key={item.key}
            draggable={canManage}
            onDragStart={() => setDragKey(item.key)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragKey) reorder(dragKey, item.key);
              setDragKey(null);
            }}
            className="rounded-xl border border-zinc-200 bg-white p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-zinc-400">Item {index + 1} · drag</span>
              {canManage ? (
                <button
                  type="button"
                  className="text-sm text-red-600"
                  onClick={() =>
                    setItems((current) =>
                      current.filter((entry) => entry.key !== item.key),
                    )
                  }
                >
                  Remove
                </button>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={authLabelClassName}>Label</label>
                <input
                  className={authInputClassName}
                  value={item.label}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((entry) =>
                        entry.key === item.key
                          ? { ...entry, label: event.target.value }
                          : entry,
                      ),
                    )
                  }
                  disabled={!canManage || pending}
                />
              </div>
              <div>
                <label className={authLabelClassName}>Href</label>
                <input
                  className={authInputClassName}
                  value={item.href}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((entry) =>
                        entry.key === item.key
                          ? { ...entry, href: event.target.value }
                          : entry,
                      ),
                    )
                  }
                  disabled={!canManage || pending}
                />
              </div>
              <div>
                <label className={authLabelClassName}>Page</label>
                <select
                  className={authInputClassName}
                  value={item.pageId}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((entry) =>
                        entry.key === item.key
                          ? { ...entry, pageId: event.target.value }
                          : entry,
                      ),
                    )
                  }
                  disabled={!canManage || pending}
                >
                  <option value="">Custom href</option>
                  {pages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.title}
                    </option>
                  ))}
                </select>
              </div>
              <label className="mt-6 flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={item.openInNewTab}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((entry) =>
                        entry.key === item.key
                          ? { ...entry, openInNewTab: event.target.checked }
                          : entry,
                      ),
                    )
                  }
                  disabled={!canManage || pending}
                />
                Open in new tab
              </label>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
