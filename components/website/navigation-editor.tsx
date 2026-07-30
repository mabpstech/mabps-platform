"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  authButtonClassName,
  authInputClassName,
  authLabelClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import { LivePreview } from "@/components/website/live-preview";
import { EmptyState } from "@/components/website/ui/empty-state";
import {
  editorFetchJson,
  useEditorPersistence,
} from "@/components/website/hooks/use-editor-persistence";
import { SaveBar } from "@/components/website/ui/save-bar";
import { Toast } from "@/components/website/ui/toast";
import { navigationRevision } from "@/lib/website/edit-conflict";
import type { WebsiteNavItem, WebsitePage } from "@/lib/website/types";

type DraftItem = {
  key: string;
  label: string;
  href: string;
  pageId: string;
  parentKey: string | null;
  openInNewTab: boolean;
};

function toDraft(navigation: WebsiteNavItem[]): DraftItem[] {
  const keyById = new Map(navigation.map((item) => [item.id, item.id]));
  return navigation.map((item) => ({
    key: item.id,
    label: item.label,
    href: item.href ?? "",
    pageId: item.pageId ?? "",
    parentKey: item.parentId ? keyById.get(item.parentId) ?? null : null,
    openInNewTab: item.openInNewTab,
  }));
}

export function NavigationEditor({
  siteId,
  siteSlug,
  navigation,
  pages,
  canManage,
}: {
  siteId: string;
  siteSlug: string;
  navigation: WebsiteNavItem[];
  pages: WebsitePage[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState<DraftItem[]>(() => toDraft(navigation));
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [revision, setRevision] = useState(() => navigationRevision(navigation));
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const [previewToken, setPreviewToken] = useState(0);
  const skipDirty = useRef(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    skipDirty.current = true;
    setItems(toDraft(navigation));
    setRevision(navigationRevision(navigation));
  }, [navigation]);

  const { saveState, saveNow } = useEditorPersistence<{
    navigation?: WebsiteNavItem[];
  }>({
    enabled: canManage,
    resourceKey: `navigation:${siteId}`,
    revision,
    onRevisionChange: setRevision,
    skipNextDirtyRef: skipDirty,
    deps: [items],
    onRemoteUpdate: () => router.refresh(),
    onError: (error) => setToast({ message: error.message, tone: "error" }),
    onSaved: (result, { silent, editedDuringSave }) => {
      if (result.data?.navigation && !editedDuringSave) {
        skipDirty.current = true;
        setItems(toDraft(result.data.navigation));
      }
      setPreviewToken((current) => current + 1);
      if (!silent) {
        setToast({ message: "Menu saved", tone: "success" });
        router.refresh();
      }
    },
    save: async ({ expectedUpdatedAt, signal }) => {
      const data = await editorFetchJson<{ navigation?: WebsiteNavItem[] }>(
        `/api/website/sites/${siteId}/navigation`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          signal,
          body: JSON.stringify({
            expectedUpdatedAt,
            items: itemsRef.current.map((item) => ({
              clientKey: item.key,
              label: item.label,
              href: item.href || null,
              pageId: item.pageId || null,
              parentKey: item.parentKey,
              openInNewTab: item.openInNewTab,
            })),
          }),
        },
      );
      if (!data.navigation) throw new Error("Unable to save navigation.");
      return {
        updatedAt: navigationRevision(data.navigation),
        data,
      };
    },
  });

  const topLevelParents = useMemo(
    () => items.filter((item) => !item.parentKey),
    [items],
  );

  const orderedItems = useMemo(() => {
    const validParentKeys = new Set(
      items.filter((item) => !item.parentKey).map((item) => item.key),
    );
    const normalized = items.map((item) =>
      item.parentKey && validParentKeys.has(item.parentKey)
        ? item
        : { ...item, parentKey: null },
    );
    const childrenByParent = new Map<string, DraftItem[]>();
    for (const item of normalized) {
      if (!item.parentKey) continue;
      const list = childrenByParent.get(item.parentKey) ?? [];
      list.push(item);
      childrenByParent.set(item.parentKey, list);
    }
    const ordered: DraftItem[] = [];
    for (const parent of normalized.filter((item) => !item.parentKey)) {
      ordered.push(parent);
      ordered.push(...(childrenByParent.get(parent.key) ?? []));
    }
    return ordered;
  }, [items]);

  function addItem(asChildOf: string | null = null) {
    setItems((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        label: asChildOf ? "Sub link" : "New link",
        href: "/",
        pageId: "",
        parentKey: asChildOf,
        openInNewTab: false,
      },
    ]);
  }

  function reorder(fromKey: string, toKey: string) {
    setItems((current) => {
      const from = current.findIndex((item) => item.key === fromKey);
      const to = current.findIndex((item) => item.key === toKey);
      if (from < 0 || to < 0 || from === to) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <SaveBar
          state={saveState}
          onSave={() => void saveNow({ silent: false })}
          onReload={() => router.refresh()}
          label="Save menu"
        />
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Design
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            Menu
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
            Drag to reorder. Nest links under a top-level item for dropdowns.
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            className={`${authButtonClassName} !w-auto px-4 py-2`}
            onClick={() => addItem(null)}
          >
            Add item
          </button>
        ) : null}
      </div>

      <ul className="space-y-3">
        {orderedItems.map((item, index) => {
          const isChild = Boolean(item.parentKey);
          return (
            <li
              key={item.key}
              draggable={canManage}
              onDragStart={() => setDragKey(item.key)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragKey) reorder(dragKey, item.key);
                setDragKey(null);
              }}
              className={`rounded-xl border border-zinc-200 bg-white p-4 ${
                isChild ? "ml-6 border-l-4 border-l-zinc-300" : ""
              }`}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-zinc-400">
                  {isChild ? "Dropdown link" : `Item ${index + 1}`} · drag
                </span>
                <div className="flex flex-wrap gap-2">
                  {canManage && !isChild ? (
                    <button
                      type="button"
                      className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
                      onClick={() => addItem(item.key)}
                    >
                      Add dropdown link
                    </button>
                  ) : null}
                  {canManage ? (
                    <button
                      type="button"
                      className="text-sm text-red-600"
                      onClick={() =>
                        setItems((current) =>
                          current
                            .filter((entry) => entry.key !== item.key)
                            .map((entry) =>
                              entry.parentKey === item.key
                                ? { ...entry, parentKey: null }
                                : entry,
                            ),
                        )
                      }
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
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
                    disabled={!canManage}
                  />
                </div>
                <div>
                  <label className={authLabelClassName}>Nest under</label>
                  <select
                    className={authInputClassName}
                    value={item.parentKey ?? ""}
                    onChange={(event) => {
                      const parentKey = event.target.value || null;
                      setItems((current) =>
                        current.map((entry) => {
                          if (entry.key !== item.key) return entry;
                          // Children cannot themselves be parents.
                          if (parentKey) {
                            return { ...entry, parentKey };
                          }
                          return { ...entry, parentKey: null };
                        }),
                      );
                    }}
                    disabled={!canManage || items.some((entry) => entry.parentKey === item.key)}
                  >
                    <option value="">Top-level menu item</option>
                    {topLevelParents
                      .filter((parent) => parent.key !== item.key)
                      .map((parent) => (
                        <option key={parent.key} value={parent.key}>
                          {parent.label || "Untitled"}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className={authLabelClassName}>Custom link</label>
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
                    disabled={!canManage}
                    placeholder="/about"
                  />
                </div>
                <div>
                  <label className={authLabelClassName}>Link to page</label>
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
                    disabled={!canManage}
                  >
                    <option value="">Use custom link</option>
                    {pages.map((page) => (
                      <option key={page.id} value={page.id}>
                        {page.title}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="mt-2 flex items-center gap-2 text-sm text-zinc-700 sm:col-span-2">
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
                    disabled={!canManage}
                  />
                  Open in new tab
                </label>
              </div>
            </li>
          );
        })}
        {items.length === 0 ? (
          <li>
            <EmptyState
              compact
              title="No menu items yet"
              description="Add links to pages or custom URLs so visitors can move through your site."
              action={
                canManage ? (
                  <button
                    type="button"
                    className={`${authButtonClassName} !w-auto px-4 py-2`}
                    onClick={() => addItem(null)}
                  >
                    Add first item
                  </button>
                ) : null
              }
            />
          </li>
        ) : null}
      </ul>

      <LivePreview
        src={`/p/${siteSlug}?preview=1`}
        title="Header preview"
        refreshToken={previewToken}
      />

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone ?? "info"}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
