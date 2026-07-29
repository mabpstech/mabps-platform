"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  authButtonClassName,
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth/styles";
import { LivePreview } from "@/components/website/live-preview";
import { MediaPicker } from "@/components/website/media-picker";
import { defaultSectionContent } from "@/components/website/section-defaults";
import {
  CONTENT_FIELD_LABELS,
  SECTION_LABELS,
} from "@/components/website/ui/labels";
import { EmptyState, StatusBadge } from "@/components/website/ui/empty-state";
import {
  EditorHeaderActions,
  SaveBar,
  authSecondaryButtonClassName,
  type SaveState,
} from "@/components/website/ui/save-bar";
import { Toast } from "@/components/website/ui/toast";
import {
  PAGE_STATUSES,
  SECTION_TYPES,
  type PageStatus,
  type SiteStatus,
  type SectionSettings,
  type SectionType,
  type WebsitePage,
  type WebsiteSection,
} from "@/lib/website/types";

type DraftSection = WebsiteSection & { clientKey: string };

function toDraft(sections: WebsiteSection[]): DraftSection[] {
  return sections.map((section) => ({
    ...section,
    clientKey: section.id,
  }));
}

/**
 * Apply server-assigned IDs onto the local draft without replacing content.
 * Keeps clientKey stable so selection and focused inputs survive autosave.
 */
function mergeSavedSections(
  local: DraftSection[],
  saved: WebsiteSection[],
): DraftSection[] {
  const savedById = new Map(saved.map((section) => [section.id, section]));
  const usedSavedIds = new Set<string>();

  const withExistingIds = local.map((section) => {
    if (section.id.startsWith("new-")) return section;
    const serverSection = savedById.get(section.id);
    if (!serverSection) return section;
    usedSavedIds.add(serverSection.id);
    return {
      ...section,
      id: serverSection.id,
      clientKey: section.clientKey,
      sortOrder: serverSection.sortOrder,
      updatedAt: serverSection.updatedAt,
    };
  });

  const unmatchedSaved = saved.filter((section) => !usedSavedIds.has(section.id));
  let unmatchedIndex = 0;

  return withExistingIds.map((section) => {
    if (!section.id.startsWith("new-")) return section;
    const serverSection = unmatchedSaved[unmatchedIndex];
    if (!serverSection) return section;
    unmatchedIndex += 1;
    return {
      ...section,
      id: serverSection.id,
      clientKey: section.clientKey,
      sortOrder: serverSection.sortOrder,
      updatedAt: serverSection.updatedAt,
    };
  });
}

function htmlToPlain(html: string): string {
  return html
    .replace(/<p>/gi, "")
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n$/, "");
}

function plainToHtml(plain: string): string {
  const paragraphs = plain.split("\n").map((line) => `<p>${line}</p>`);
  return paragraphs.join("") || "<p></p>";
}

export function PageBuilder({
  siteId,
  page,
  initialSections,
  canManage,
  siteSlug,
  siteStatus,
}: {
  siteId: string;
  page: WebsitePage;
  initialSections: WebsiteSection[];
  canManage: boolean;
  siteSlug: string;
  siteStatus: SiteStatus;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [status, setStatus] = useState<PageStatus>(page.status);
  const [seoTitle, setSeoTitle] = useState(page.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(
    page.seoDescription ?? "",
  );
  const [seoOgImageMediaId, setSeoOgImageMediaId] = useState<string | null>(
    page.seoOgImageMediaId,
  );
  const [seoRobots, setSeoRobots] = useState(page.seoRobots ?? "");
  const [sections, setSections] = useState(() => toDraft(initialSections));
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSections[0]?.id ?? null,
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{
    targetId: string;
    position: "before" | "after";
  } | null>(null);
  const [addType, setAddType] = useState<SectionType>("hero");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [previewToken, setPreviewToken] = useState(0);
  const hydrated = useRef(false);
  const skipDirty = useRef(false);
  const savingRef = useRef(false);
  const editVersionRef = useRef(0);
  const titleRef = useRef(title);
  const slugRef = useRef(slug);
  const statusRef = useRef(status);
  const seoTitleRef = useRef(seoTitle);
  const seoDescriptionRef = useRef(seoDescription);
  const seoOgImageMediaIdRef = useRef(seoOgImageMediaId);
  const seoRobotsRef = useRef(seoRobots);
  const sectionsRef = useRef(sections);

  titleRef.current = title;
  slugRef.current = slug;
  statusRef.current = status;
  seoTitleRef.current = seoTitle;
  seoDescriptionRef.current = seoDescription;
  seoOgImageMediaIdRef.current = seoOgImageMediaId;
  seoRobotsRef.current = seoRobots;
  sectionsRef.current = sections;

  const selected = useMemo(
    () => sections.find((section) => section.clientKey === selectedId) ?? null,
    [sections, selectedId],
  );

  // Editor preview always uses authenticated preview mode so draft pages render.
  const previewPath = useMemo(() => {
    const path =
      page.pageType === "home"
        ? `/p/${siteSlug}`
        : `/p/${siteSlug}/${encodeURIComponent(page.slug)}`;
    return `${path}?preview=1`;
  }, [page.pageType, page.slug, siteSlug]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(max-width: 1023px)").matches) {
      setShowPreview(false);
    }
  }, []);

  const saveAll = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!canManage || savingRef.current) return;
      savingRef.current = true;
      const versionAtStart = editVersionRef.current;
      const snapshotTitle = titleRef.current;
      const snapshotSlug = slugRef.current;
      const snapshotStatus = statusRef.current;
      const snapshotSeoTitle = seoTitleRef.current;
      const snapshotSeoDescription = seoDescriptionRef.current;
      const snapshotSeoOgImageMediaId = seoOgImageMediaIdRef.current;
      const snapshotSeoRobots = seoRobotsRef.current;
      const snapshotSections = sectionsRef.current;

      setSaveState("saving");
      try {
        // Save meta + sections on the page route (registered). Do not use the
        // nested `/sections` PUT — it can return a framework 404 under Turbopack.
        const saveResponse = await fetch(
          `/api/website/sites/${siteId}/pages/${page.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: snapshotTitle,
              slug: snapshotSlug,
              status: snapshotStatus,
              seoTitle: snapshotSeoTitle || null,
              seoDescription: snapshotSeoDescription || null,
              seoOgImageMediaId: snapshotSeoOgImageMediaId,
              seoRobots: snapshotSeoRobots || null,
              sections: snapshotSections.map((section) => ({
                id: section.id.startsWith("new-") ? undefined : section.id,
                type: section.type,
                content: section.content,
                settings: section.settings,
              })),
            }),
          },
        );
        const saveData = (await saveResponse.json()) as {
          error?: string;
          sections?: WebsiteSection[];
        };
        if (!saveResponse.ok) {
          throw new Error(saveData.error || "Unable to save page.");
        }

        const editedDuringSave = editVersionRef.current !== versionAtStart;

        if (saveData.sections) {
          // ID remap only — never clobber in-progress content from the response.
          // Skip dirty tracking when nothing changed during the request.
          if (!editedDuringSave) {
            skipDirty.current = true;
          }
          setSections((current) =>
            mergeSavedSections(current, saveData.sections!),
          );
        }

        if (editedDuringSave) {
          // Debounced effect will schedule another save for the newer draft.
          setSaveState("dirty");
        } else {
          setSaveState("saved");
          setPreviewToken((current) => current + 1);
          if (!silent) {
            setToast({ message: "Page saved", tone: "success" });
            router.refresh();
          }
          window.setTimeout(() => {
            setSaveState((current) =>
              current === "saved" ? "idle" : current,
            );
          }, 1800);
        }
      } catch (err) {
        setSaveState("error");
        setToast({
          message:
            err instanceof Error ? err.message : "Couldn’t save the page. Try again.",
          tone: "error",
        });
      } finally {
        savingRef.current = false;
      }
    },
    [canManage, page.id, router, siteId],
  );

  // Debounce autosave on content changes so every keystroke resets the timer
  // and saveAll always reads the latest values via refs.
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    if (skipDirty.current) {
      skipDirty.current = false;
      return;
    }
    if (!canManage) return;

    editVersionRef.current += 1;
    setSaveState((current) => (current === "saving" ? current : "dirty"));

    const timer = window.setTimeout(() => {
      void saveAll({ silent: true });
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [
    title,
    slug,
    status,
    seoTitle,
    seoDescription,
    seoOgImageMediaId,
    seoRobots,
    sections,
    canManage,
    saveAll,
  ]);

  function reorder(
    fromId: string,
    targetId: string,
    position: "before" | "after" = "before",
  ) {
    setSections((current) => {
      const fromIndex = current.findIndex((item) => item.clientKey === fromId);
      let toIndex = current.findIndex((item) => item.clientKey === targetId);
      if (fromIndex < 0 || toIndex < 0) return current;
      if (fromId === targetId) return current;

      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      if (fromIndex < toIndex) toIndex -= 1;
      const insertIndex = position === "before" ? toIndex : toIndex + 1;
      next.splice(insertIndex, 0, moved);
      return next.map((item, index) => ({ ...item, sortOrder: index }));
    });
  }

  function clearDragState() {
    setDragId(null);
    setDropIndicator(null);
  }

  function handleSectionDragOver(
    event: DragEvent<HTMLLIElement>,
    clientKey: string,
  ) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (!dragId || dragId === clientKey) {
      setDropIndicator(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const position =
      event.clientY < rect.top + rect.height / 2 ? "before" : "after";
    setDropIndicator((current) => {
      if (
        current?.targetId === clientKey &&
        current.position === position
      ) {
        return current;
      }
      return { targetId: clientKey, position };
    });
  }

  function updateSelectedContent(key: string, value: unknown) {
    if (!selectedId) return;
    setSections((current) =>
      current.map((section) =>
        section.clientKey === selectedId
          ? {
              ...section,
              content: { ...section.content, [key]: value },
            }
          : section,
      ),
    );
  }

  function updateSelectedSettings(patch: Partial<SectionSettings>) {
    if (!selectedId) return;
    setSections((current) =>
      current.map((section) =>
        section.clientKey === selectedId
          ? {
              ...section,
              settings: { ...section.settings, ...patch },
            }
          : section,
      ),
    );
  }

  function addSection() {
    const clientKey = `new-${crypto.randomUUID()}`;
    const section: DraftSection = {
      id: clientKey,
      clientKey,
      pageId: page.id,
      type: addType,
      sortOrder: sections.length,
      content: defaultSectionContent(addType),
      settings: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSections((current) => [...current, section]);
    setSelectedId(clientKey);
  }

  function duplicateSection(clientKey: string) {
    setSections((current) => {
      const index = current.findIndex((item) => item.clientKey === clientKey);
      if (index < 0) return current;
      const source = current[index];
      const newKey = `new-${crypto.randomUUID()}`;
      const copy: DraftSection = {
        ...source,
        id: newKey,
        clientKey: newKey,
        content: structuredClone(source.content),
        settings: { ...source.settings },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const next = [...current];
      next.splice(index + 1, 0, copy);
      return next.map((item, i) => ({ ...item, sortOrder: i }));
    });
  }

  function toggleSectionHidden(clientKey: string) {
    setSections((current) =>
      current.map((section) =>
        section.clientKey === clientKey
          ? {
              ...section,
              settings: {
                ...section.settings,
                hidden: !section.settings.hidden,
              },
            }
          : section,
      ),
    );
  }

  function moveSection(clientKey: string, direction: -1 | 1) {
    setSections((current) => {
      const index = current.findIndex((item) => item.clientKey === clientKey);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(nextIndex, 0, moved);
      return next.map((item, order) => ({ ...item, sortOrder: order }));
    });
  }

  function deleteSection(clientKey: string) {
    const section = sections.find((item) => item.clientKey === clientKey);
    const label = section
      ? SECTION_LABELS[section.type]
      : "this section";
    if (!window.confirm(`Remove ${label} from this page?`)) return;
    setSections((current) =>
      current.filter((item) => item.clientKey !== clientKey),
    );
    setSelectedId((current) => (current === clientKey ? null : current));
  }

  function removeSelected() {
    if (!selected) return;
    deleteSection(selected.clientKey);
  }

  return (
    <div className="space-y-4 animate-[fadeRise_240ms_ease-out]">
      {canManage ? (
        <SaveBar
          state={saveState}
          onSave={() => void saveAll()}
          label="Save page"
        />
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Page editor
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-zinc-900">
              {page.title}
            </h1>
            <StatusBadge status={status} />
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
            {status === "draft"
              ? siteStatus === "published"
                ? "This page is draft — visitors will not see it until you set status to Published."
                : "Draft page. Publish the page (and the site) when you are ready for visitors."
              : siteStatus === "published"
                ? "Published — saves go live immediately."
                : "Page is ready. Publish the website to make it visible to visitors."}
          </p>
        </div>
        <EditorHeaderActions>
          {canManage ? (
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-600">
              <span className="sr-only">Page status</span>
              <select
                className={`${authInputClassName} !mt-0 !w-auto min-w-[7.5rem] py-1.5 text-xs`}
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as PageStatus)
                }
                aria-label="Page status"
              >
                {PAGE_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value === "published" ? "Published" : "Draft"}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button
            type="button"
            className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5 ${
              showSettings ? "border-zinc-900 bg-zinc-50" : ""
            }`}
            onClick={() => setShowSettings((value) => !value)}
            aria-pressed={showSettings}
          >
            {showSettings ? "Hide settings" : "Page settings"}
          </button>
          <button
            type="button"
            className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5 ${
              showPreview ? "border-zinc-900 bg-zinc-50" : ""
            }`}
            onClick={() => setShowPreview((value) => !value)}
            aria-pressed={showPreview}
          >
            {showPreview ? "Hide preview" : "Show preview"}
          </button>
          <Link
            href={`/website/${siteId}/pages`}
            className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5`}
          >
            All pages
          </Link>
        </EditorHeaderActions>
      </div>

      {showSettings ? (
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Page title"
              value={title}
              onChange={setTitle}
              disabled={!canManage}
            />
            <Field
              label="Page address"
              value={slug}
              onChange={setSlug}
              disabled={!canManage || page.pageType === "home"}
            />
            <div>
              <label className={authLabelClassName}>Page status</label>
              <select
                className={authInputClassName}
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as PageStatus)
                }
                disabled={!canManage}
              >
                {PAGE_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value === "published" ? "Published" : "Draft"}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] text-zinc-500">
                {status === "draft"
                  ? "Draft pages stay private even if the website is live."
                  : siteStatus === "published"
                    ? "This page is public. Saves update the live site."
                    : "This page will be public once you publish the website."}
              </p>
            </div>
            <div>
              <label className={authLabelClassName}>Page robots</label>
              <select
                className={authInputClassName}
                value={seoRobots}
                onChange={(event) => setSeoRobots(event.target.value)}
                disabled={!canManage}
              >
                <option value="">Use site default</option>
                <option value="index,follow">Index, follow</option>
                <option value="noindex,follow">No index, follow</option>
                <option value="index,nofollow">Index, no follow</option>
                <option value="noindex,nofollow">No index, no follow</option>
              </select>
            </div>
            <Field
              label="Search title"
              value={seoTitle}
              onChange={setSeoTitle}
              disabled={!canManage}
              placeholder="Shown in Google results"
            />
            <Field
              label="Search description"
              value={seoDescription}
              onChange={setSeoDescription}
              disabled={!canManage}
              placeholder="Short summary for search engines"
            />
          </div>
          <MediaPicker
            siteId={siteId}
            value={seoOgImageMediaId}
            onChange={setSeoOgImageMediaId}
            disabled={!canManage}
            label="Social share image"
            hint="og"
          />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="space-y-3 rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <div className="space-y-2.5 px-0.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Sections
              </p>
              <span className="tabular-nums text-[11px] font-medium text-zinc-400">
                {sections.length}
              </span>
            </div>
            <select
              className={authInputClassName}
              value={addType}
              onChange={(event) =>
                setAddType(event.target.value as SectionType)
              }
              disabled={!canManage}
            >
              {SECTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {SECTION_LABELS[type]}
                </option>
              ))}
            </select>
            {canManage ? (
              <button
                type="button"
                className={`${authButtonClassName} !w-full gap-1.5 py-2`}
                onClick={addSection}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add section
              </button>
            ) : null}
          </div>

          <ul className="space-y-1.5" role="listbox" aria-label="Page sections">
            {sections.map((section, index) => {
              const active = selectedId === section.clientKey;
              const hidden = Boolean(section.settings.hidden);
              const isDragging = dragId === section.clientKey;
              const showBefore =
                dropIndicator?.targetId === section.clientKey &&
                dropIndicator.position === "before";
              const showAfter =
                dropIndicator?.targetId === section.clientKey &&
                dropIndicator.position === "after";

              return (
                <li
                  key={section.clientKey}
                  draggable={canManage}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", section.clientKey);
                    setDragId(section.clientKey);
                  }}
                  onDragOver={(event) =>
                    handleSectionDragOver(event, section.clientKey)
                  }
                  onDragLeave={(event) => {
                    if (
                      !event.currentTarget.contains(
                        event.relatedTarget as Node | null,
                      )
                    ) {
                      setDropIndicator((current) =>
                        current?.targetId === section.clientKey
                          ? null
                          : current,
                      );
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (dragId && dropIndicator) {
                      reorder(
                        dragId,
                        dropIndicator.targetId,
                        dropIndicator.position,
                      );
                    } else if (dragId) {
                      reorder(dragId, section.clientKey, "before");
                    }
                    clearDragState();
                  }}
                  onDragEnd={clearDragState}
                  role="option"
                  aria-selected={active}
                  tabIndex={0}
                  onClick={() => setSelectedId(section.clientKey)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedId(section.clientKey);
                    }
                    if (!canManage) return;
                    if (event.key === "ArrowUp" && (event.metaKey || event.altKey)) {
                      event.preventDefault();
                      moveSection(section.clientKey, -1);
                    }
                    if (event.key === "ArrowDown" && (event.metaKey || event.altKey)) {
                      event.preventDefault();
                      moveSection(section.clientKey, 1);
                    }
                  }}
                  className={`group relative cursor-pointer rounded-xl border px-3 py-2.5 transition-[transform,box-shadow,border-color,background-color,opacity,color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/25 focus-visible:ring-offset-2 ${
                    isDragging
                      ? "z-10 scale-[1.02] border-zinc-300 bg-white opacity-90 shadow-[0_10px_28px_rgba(15,23,42,0.14)]"
                      : active
                        ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                        : "border-zinc-200/70 bg-zinc-50/80 text-zinc-900 hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-white hover:shadow-sm"
                  } ${hidden && !isDragging ? "opacity-55" : ""}`}
                >
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute inset-x-3 -top-1 h-0.5 rounded-full bg-zinc-900 transition-all duration-150 ease-out ${
                      showBefore
                        ? "scale-x-100 opacity-100"
                        : "scale-x-50 opacity-0"
                    }`}
                  />
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute inset-x-3 -bottom-1 h-0.5 rounded-full bg-zinc-900 transition-all duration-150 ease-out ${
                      showAfter
                        ? "scale-x-100 opacity-100"
                        : "scale-x-50 opacity-0"
                    }`}
                  />
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1 flex h-5 w-4 shrink-0 items-center justify-center ${
                        active ? "text-zinc-400" : "text-zinc-300"
                      }`}
                      aria-hidden
                    >
                      <DragHandleIcon />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium tracking-[-0.01em]">
                          {SECTION_LABELS[section.type]}
                        </p>
                        {hidden ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                              active
                                ? "bg-white/10 text-zinc-300"
                                : "bg-zinc-200/70 text-zinc-600"
                            }`}
                          >
                            <EyeOffIcon />
                            Hidden
                          </span>
                        ) : null}
                      </div>
                      <p
                        className={`mt-0.5 line-clamp-1 text-xs ${active ? "text-zinc-300" : "text-zinc-500"}`}
                      >
                        <span className="tabular-nums opacity-70">
                          {index + 1}.{" "}
                        </span>
                        {String(
                          section.content.heading ||
                            section.content.subheading ||
                            "Empty section",
                        )}
                      </p>
                    </div>
                  </div>
                  {canManage ? (
                    <div
                      className={`mt-2.5 flex flex-wrap gap-1 border-t pt-2 ${
                        active ? "border-white/10" : "border-zinc-200/80"
                      }`}
                      onClick={(event) => event.stopPropagation()}
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      <SectionQuickAction
                        active={active}
                        label="Up"
                        disabled={index === 0}
                        onClick={() => moveSection(section.clientKey, -1)}
                      />
                      <SectionQuickAction
                        active={active}
                        label="Down"
                        disabled={index === sections.length - 1}
                        onClick={() => moveSection(section.clientKey, 1)}
                      />
                      <SectionQuickAction
                        active={active}
                        label="Duplicate"
                        onClick={() => duplicateSection(section.clientKey)}
                      />
                      <SectionQuickAction
                        active={active}
                        label={hidden ? "Show" : "Hide"}
                        onClick={() => toggleSectionHidden(section.clientKey)}
                      />
                      <SectionQuickAction
                        active={active}
                        label="Delete"
                        danger
                        onClick={() => deleteSection(section.clientKey)}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
            {sections.length === 0 ? (
              <li>
                <EmptyState
                  compact
                  title="Start with a section"
                  description="Hero, text, and image blocks stack to build the page."
                />
              </li>
            ) : null}
          </ul>
        </aside>

        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-6">
          {!selected ? (
            <div className="flex h-full min-h-72 items-center justify-center">
              <EmptyState
                compact
                title="Select a section"
                description="Choose a section on the left to edit its content and settings."
              />
            </div>
          ) : (
            <SectionInspector
              key={selected.clientKey}
              siteId={siteId}
              section={selected}
              canManage={canManage}
              onChange={updateSelectedContent}
              onSettingsChange={updateSelectedSettings}
              onRemove={removeSelected}
            />
          )}
        </div>

      </div>

      {showPreview ? (
        <LivePreview
          src={previewPath}
          title="Live preview"
          refreshToken={previewToken}
        />
      ) : null}

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone ?? "info"}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}

function SectionInspector({
  siteId,
  section,
  canManage,
  onChange,
  onSettingsChange,
  onRemove,
}: {
  siteId: string;
  section: DraftSection;
  canManage: boolean;
  onChange: (key: string, value: unknown) => void;
  onSettingsChange: (patch: Partial<SectionSettings>) => void;
  onRemove: () => void;
}) {
  const settingsPanel = (
    <SectionSettingsPanel
      settings={section.settings}
      canManage={canManage}
      onChange={onSettingsChange}
    />
  );

  if (section.type === "hero") {
    return (
      <div className="space-y-4">
        <HeroInspector
          siteId={siteId}
          content={section.content}
          canManage={canManage}
          onChange={onChange}
        />
        {settingsPanel}
        <RemoveButton canManage={canManage} onRemove={onRemove} />
      </div>
    );
  }

  if (section.type === "richText") {
    return (
      <div className="space-y-4">
        <InspectorHeading type={section.type} />
        <RichTextField
          value={String(section.content.html ?? "")}
          onChange={(html) => onChange("html", html)}
          disabled={!canManage}
        />
        {settingsPanel}
        <RemoveButton canManage={canManage} onRemove={onRemove} />
      </div>
    );
  }

  if (section.type === "spacer") {
    return (
      <div className="space-y-4">
        <InspectorHeading type={section.type} />
        <div>
          <label className={authLabelClassName}>Spacing size</label>
          <select
            className={authInputClassName}
            value={String(section.content.height ?? "md")}
            onChange={(event) => onChange("height", event.target.value)}
            disabled={!canManage}
          >
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
            <option value="xl">Extra large</option>
          </select>
        </div>
        {settingsPanel}
        <RemoveButton canManage={canManage} onRemove={onRemove} />
      </div>
    );
  }

  if (section.type === "image") {
    return (
      <div className="space-y-4">
        <InspectorHeading type={section.type} />
        <MediaPicker
          siteId={siteId}
          value={
            typeof section.content.mediaId === "string"
              ? section.content.mediaId
              : null
          }
          onChange={(mediaId) => onChange("mediaId", mediaId)}
          disabled={!canManage}
          label="Image"
          hint="banner"
        />
        <Field
          label="Image description"
          value={String(section.content.alt ?? "")}
          onChange={(value) => onChange("alt", value)}
          disabled={!canManage}
        />
        <Field
          label="Caption"
          value={String(section.content.caption ?? "")}
          onChange={(value) => onChange("caption", value)}
          disabled={!canManage}
        />
        {settingsPanel}
        <RemoveButton canManage={canManage} onRemove={onRemove} />
      </div>
    );
  }

  if (section.type === "gallery") {
    const mediaIds = Array.isArray(section.content.mediaIds)
      ? section.content.mediaIds.map(String)
      : [];
    return (
      <div className="space-y-4">
        <InspectorHeading type={section.type} />
        <Field
          label="Headline"
          value={String(section.content.heading ?? "")}
          onChange={(value) => onChange("heading", value)}
          disabled={!canManage}
        />
        <MediaPicker
          siteId={siteId}
          value={mediaIds[0] ?? null}
          onChange={() => undefined}
          values={mediaIds}
          onChangeMultiple={(ids) => onChange("mediaIds", ids)}
          multiple
          disabled={!canManage}
          label="Gallery images"
          hint="banner"
        />
        {mediaIds.length > 1 && canManage ? (
          <GalleryOrderEditor
            mediaIds={mediaIds}
            onChange={(ids) => onChange("mediaIds", ids)}
          />
        ) : null}
        {settingsPanel}
        <RemoveButton canManage={canManage} onRemove={onRemove} />
      </div>
    );
  }

  if (section.type === "form") {
    return (
      <div className="space-y-4">
        <InspectorHeading type={section.type} />
        <Field
          label="Headline"
          value={String(section.content.heading ?? "")}
          onChange={(value) => onChange("heading", value)}
          disabled={!canManage}
        />
        <FormSlugPicker
          siteId={siteId}
          value={String(section.content.formSlug ?? "contact")}
          onChange={(value) => onChange("formSlug", value)}
          disabled={!canManage}
        />
        {settingsPanel}
        <RemoveButton canManage={canManage} onRemove={onRemove} />
      </div>
    );
  }

  if (section.type === "blogList") {
    return (
      <div className="space-y-4">
        <InspectorHeading type={section.type} />
        <Field
          label="Headline"
          value={String(section.content.heading ?? "")}
          onChange={(value) => onChange("heading", value)}
          disabled={!canManage}
        />
        <div>
          <label className={authLabelClassName}>Number of posts</label>
          <input
            type="number"
            min={1}
            max={24}
            className={authInputClassName}
            value={Number(section.content.limit ?? 6)}
            onChange={(event) =>
              onChange("limit", Math.max(1, Math.min(24, Number(event.target.value) || 6)))
            }
            disabled={!canManage}
          />
        </div>
        {settingsPanel}
        <RemoveButton canManage={canManage} onRemove={onRemove} />
      </div>
    );
  }

  if (section.type === "products" || section.type === "collections") {
    return (
      <div className="space-y-4">
        <InspectorHeading type={section.type} />
        <Field
          label="Headline"
          value={String(section.content.heading ?? "")}
          onChange={(value) => onChange("heading", value)}
          disabled={!canManage}
        />
        <CatalogItemsEditor
          siteId={siteId}
          items={Array.isArray(section.content.items) ? section.content.items : []}
          canManage={canManage}
          mode={section.type}
          onChange={(items) => onChange("items", items)}
        />
        {settingsPanel}
        <RemoveButton canManage={canManage} onRemove={onRemove} />
      </div>
    );
  }

  if (section.type === "features") {
    return (
      <div className="space-y-4">
        <InspectorHeading type={section.type} />
        <Field
          label="Headline"
          value={String(section.content.heading ?? "")}
          onChange={(value) => onChange("heading", value)}
          disabled={!canManage}
        />
        <FeaturesItemsEditor
          items={Array.isArray(section.content.items) ? section.content.items : []}
          canManage={canManage}
          onChange={(items) => onChange("items", items)}
        />
        {settingsPanel}
        <RemoveButton canManage={canManage} onRemove={onRemove} />
      </div>
    );
  }

  const textKeys = [
    "eyebrow",
    "heading",
    "subheading",
    "body",
    "primaryLabel",
    "primaryHref",
    "secondaryLabel",
    "secondaryHref",
    "buttonLabel",
    "buttonHref",
    "caption",
    "alt",
  ];

  return (
    <div className="space-y-4">
      <InspectorHeading type={section.type} />
      {textKeys.map((key) =>
        key in section.content ||
        ["heading", "subheading", "body"].includes(key) ? (
          <Field
            key={key}
            label={CONTENT_FIELD_LABELS[key] || key}
            value={String(section.content[key] ?? "")}
            onChange={(value) => onChange(key, value)}
            disabled={!canManage}
          />
        ) : null,
      )}
      {settingsPanel}
      <RemoveButton canManage={canManage} onRemove={onRemove} />
    </div>
  );
}

const HERO_FIELD_LIMITS = {
  eyebrow: 48,
  heading: 80,
  subheading: 160,
} as const;

function HeroInspector({
  siteId,
  content,
  canManage,
  onChange,
}: {
  siteId: string;
  content: Record<string, unknown>;
  canManage: boolean;
  onChange: (key: string, value: unknown) => void;
}) {
  const desktopMediaId =
    typeof content.desktopMediaId === "string"
      ? content.desktopMediaId
      : typeof content.backgroundMediaId === "string"
        ? content.backgroundMediaId
        : null;
  const mobileMediaId =
    typeof content.mobileMediaId === "string" ? content.mobileMediaId : null;
  const previewMediaId = desktopMediaId ?? mobileMediaId;

  return (
    <div className="space-y-4">
      <InspectorHeading type="hero" />

      <HeroEditorCard
        title="Content"
        description="The message visitors see first."
        defaultOpen
      >
        <HeroField
          label="Small label"
          value={String(content.eyebrow ?? "")}
          onChange={(value) => onChange("eyebrow", value)}
          disabled={!canManage}
          helper="Short label above the headline."
          maxLength={HERO_FIELD_LIMITS.eyebrow}
        />
        <HeroField
          label="Headline"
          value={String(content.heading ?? "")}
          onChange={(value) => onChange("heading", value)}
          disabled={!canManage}
          helper="Main message visitors see first."
          maxLength={HERO_FIELD_LIMITS.heading}
        />
        <HeroField
          label="Supporting text"
          value={String(content.subheading ?? "")}
          onChange={(value) => onChange("subheading", value)}
          disabled={!canManage}
          helper="One or two sentences that clarify your offer."
          maxLength={HERO_FIELD_LIMITS.subheading}
          multiline
        />
      </HeroEditorCard>

      <HeroEditorCard
        title="Buttons"
        description="Primary and secondary calls to action."
        defaultOpen
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <HeroField
            label="Primary button text"
            value={String(content.primaryLabel ?? "")}
            onChange={(value) => onChange("primaryLabel", value)}
            disabled={!canManage}
            helper="Main action label, e.g. Get started."
          />
          <HeroField
            label="Primary button link"
            value={String(content.primaryHref ?? "")}
            onChange={(value) => onChange("primaryHref", value)}
            disabled={!canManage}
            placeholder="/contact"
            helper="Where the primary button should go."
          />
          <HeroField
            label="Secondary button text"
            value={String(content.secondaryLabel ?? "")}
            onChange={(value) => onChange("secondaryLabel", value)}
            disabled={!canManage}
            helper="Optional secondary action."
          />
          <HeroField
            label="Secondary button link"
            value={String(content.secondaryHref ?? "")}
            onChange={(value) => onChange("secondaryHref", value)}
            disabled={!canManage}
            placeholder="/about"
            helper="Where the secondary button should go."
          />
        </div>
      </HeroEditorCard>

      <HeroEditorCard
        title="Background"
        description="Imagery and video behind your hero content."
        defaultOpen
      >
        {previewMediaId ? (
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/website/media/file/${previewMediaId}`}
              alt=""
              className="h-28 w-full object-cover"
            />
            <p className="border-t border-zinc-200 bg-white px-3 py-2 text-[11px] text-zinc-500">
              Live preview · {desktopMediaId ? "Desktop" : "Mobile"} image
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 px-3 py-6 text-center text-[11px] text-zinc-500">
            Select a background image to see a live thumbnail here.
          </div>
        )}

        <div className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-3.5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Desktop
          </p>
          <MediaPicker
            siteId={siteId}
            value={desktopMediaId}
            onChange={(mediaId) => {
              onChange("desktopMediaId", mediaId);
              onChange("backgroundMediaId", mediaId);
            }}
            disabled={!canManage}
            label="Desktop background image"
            hint="hero"
          />
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
            Wide image for laptop and desktop screens.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-3.5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Mobile
          </p>
          <MediaPicker
            siteId={siteId}
            value={mobileMediaId}
            onChange={(mediaId) => onChange("mobileMediaId", mediaId)}
            disabled={!canManage}
            label="Mobile background image"
            hint="banner"
          />
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
            Optional taller crop optimized for phones. Falls back to desktop if empty.
          </p>
        </div>

        <HeroField
          label="Background video URL"
          value={String(content.backgroundVideoUrl ?? "")}
          onChange={(value) => onChange("backgroundVideoUrl", value)}
          disabled={!canManage}
          placeholder="https://…"
          helper="Optional. When set, video plays behind the content on supported devices."
        />
      </HeroEditorCard>

      <HeroEditorCard
        title="Layout"
        description="Alignment, height, overlay, and entrance motion."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={authLabelClassName}>Text alignment</label>
            <select
              className={authInputClassName}
              value={String(content.align ?? "center")}
              onChange={(event) => onChange("align", event.target.value)}
              disabled={!canManage}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
              How headline and buttons align on the banner.
            </p>
          </div>
          <div>
            <label className={authLabelClassName}>Section height</label>
            <select
              className={authInputClassName}
              value={String(content.height ?? "md")}
              onChange={(event) => onChange("height", event.target.value)}
              disabled={!canManage}
            >
              <option value="sm">Compact</option>
              <option value="md">Standard</option>
              <option value="lg">Tall</option>
              <option value="xl">Full impact</option>
            </select>
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
              Controls vertical presence of the hero.
            </p>
          </div>
          <div>
            <label className={authLabelClassName}>Dark overlay</label>
            <input
              type="range"
              min={0}
              max={80}
              value={Number(content.overlay ?? 40)}
              onChange={(event) =>
                onChange("overlay", Number(event.target.value))
              }
              disabled={!canManage}
              className="mt-3 w-full"
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
              {Number(content.overlay ?? 40)}% — improves text readability on
              images.
            </p>
          </div>
          <div>
            <label className={authLabelClassName}>Animation</label>
            <select
              className={authInputClassName}
              value={String(content.animation ?? "fade")}
              onChange={(event) => onChange("animation", event.target.value)}
              disabled={!canManage}
            >
              <option value="none">None</option>
              <option value="fade">Fade in</option>
              <option value="rise">Rise up</option>
            </select>
            <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
              Subtle entrance motion when the section appears.
            </p>
          </div>
        </div>
      </HeroEditorCard>
    </div>
  );
}

function HeroEditorCard({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-zinc-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900/15"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight text-zinc-900">
            {title}
          </h3>
          {description ? (
            <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
              {description}
            </p>
          ) : null}
        </div>
        <span
          className={`shrink-0 text-zinc-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      {open ? (
        <div className="space-y-4 border-t border-zinc-100 px-4 pb-4 pt-3.5">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function HeroField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  multiline,
  helper,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  multiline?: boolean;
  helper?: string;
  maxLength?: number;
}) {
  const count = value.length;
  const over = maxLength != null && count > maxLength;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label className={`${authLabelClassName} !mb-0`}>{label}</label>
        {maxLength != null ? (
          <span
            className={`text-[11px] tabular-nums ${
              over ? "font-medium text-amber-600" : "text-zinc-400"
            }`}
          >
            {count}/{maxLength}
          </span>
        ) : null}
      </div>
      <StableTextInput
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        multiline={multiline}
      />
      {helper ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function InspectorHeading({ type }: { type: SectionType }) {
  return (
    <div className="border-b border-zinc-100 pb-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
        Editing section
      </p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900">
        {SECTION_LABELS[type]}
      </h2>
    </div>
  );
}

/** Keeps a local draft while focused so parent/autosave updates cannot overwrite typing. */
function StableTextInput({
  value,
  onChange,
  disabled,
  placeholder,
  multiline,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(value);
    }
  }, [value]);

  function handleChange(next: string) {
    setDraft(next);
    onChange(next);
  }

  function handleBlur() {
    focusedRef.current = false;
    // Flush the focused draft so a stale parent value cannot stick after blur.
    if (draft !== value) {
      onChange(draft);
    } else {
      setDraft(value);
    }
  }

  const sharedProps = {
    className: className ?? (multiline
      ? `${authInputClassName} min-h-24`
      : authInputClassName),
    value: draft,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      handleChange(event.target.value),
    onFocus: () => {
      focusedRef.current = true;
    },
    onBlur: handleBlur,
    disabled,
    placeholder,
  };

  return multiline ? (
    <textarea {...sharedProps} />
  ) : (
    <input {...sharedProps} />
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className={authLabelClassName}>{label}</label>
      <StableTextInput
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        multiline={multiline}
      />
    </div>
  );
}

function RichTextField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(() => htmlToPlain(value));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(htmlToPlain(value));
    }
  }, [value]);

  function handleChange(next: string) {
    setDraft(next);
    onChange(plainToHtml(next));
  }

  function handleBlur() {
    focusedRef.current = false;
    const html = plainToHtml(draft);
    if (html !== value) {
      onChange(html);
    } else {
      setDraft(htmlToPlain(value));
    }
  }

  return (
    <div>
      <label className={authLabelClassName}>Content</label>
      <textarea
        className={`${authInputClassName} min-h-48`}
        value={draft}
        onChange={(event) => handleChange(event.target.value)}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder="Write your story…"
      />
      <p className="mt-1 text-xs text-zinc-500">
        Plain text is fine — we format it into paragraphs for you.
      </p>
    </div>
  );
}

function asItemRecords(items: unknown[]): Array<Record<string, unknown>> {
  return items.map((item) =>
    item && typeof item === "object"
      ? { ...(item as Record<string, unknown>) }
      : {},
  );
}

function FeaturesItemsEditor({
  items,
  canManage,
  onChange,
}: {
  items: unknown[];
  canManage: boolean;
  onChange: (items: Array<Record<string, unknown>>) => void;
}) {
  const normalized = asItemRecords(items);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className={authLabelClassName}>Features</label>
        {canManage ? (
          <button
            type="button"
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
            onClick={() =>
              onChange([
                ...normalized,
                { title: "New feature", description: "Description" },
              ])
            }
          >
            Add feature
          </button>
        ) : null}
      </div>
      {normalized.map((item, index) => (
        <div
          key={`feature-${index}`}
          className="space-y-2 rounded-xl border border-zinc-200 p-3"
        >
          <StableTextInput
            value={String(item.title ?? "")}
            disabled={!canManage}
            onChange={(title) => {
              const next = asItemRecords(normalized);
              next[index] = { ...next[index], title };
              onChange(next);
            }}
            placeholder="Title"
          />
          <StableTextInput
            value={String(item.description ?? item.body ?? "")}
            disabled={!canManage}
            onChange={(description) => {
              const next = asItemRecords(normalized);
              next[index] = { ...next[index], description };
              onChange(next);
            }}
            placeholder="Description"
            multiline
            className={`${authInputClassName} min-h-16`}
          />
          {canManage ? (
            <button
              type="button"
              className="text-xs text-red-600"
              onClick={() => onChange(normalized.filter((_, i) => i !== index))}
            >
              Remove feature
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function CatalogItemsEditor({
  siteId,
  items,
  canManage,
  mode,
  onChange,
}: {
  siteId: string;
  items: unknown[];
  canManage: boolean;
  mode: "products" | "collections";
  onChange: (items: Array<Record<string, unknown>>) => void;
}) {
  const normalized = asItemRecords(items);
  const noun = mode === "products" ? "product" : "collection";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className={authLabelClassName}>
          {mode === "products" ? "Products" : "Collections"}
        </label>
        {canManage ? (
          <button
            type="button"
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
            onClick={() =>
              onChange([
                ...normalized,
                {
                  name: `New ${noun}`,
                  description: "Description",
                  price: mode === "products" ? "$0" : "",
                  href: mode === "products" ? "#" : "/products",
                  mediaId: null,
                },
              ])
            }
          >
            Add {noun}
          </button>
        ) : null}
      </div>
      {normalized.map((item, index) => {
        const name = String(item.name ?? item.title ?? "");
        const description = String(item.description ?? item.body ?? "");
        const price = String(item.price ?? "");
        const href = String(item.href ?? "");
        const mediaId =
          typeof item.mediaId === "string" ? item.mediaId : null;

        return (
          <div
            key={`catalog-${index}`}
            className="space-y-2 rounded-xl border border-zinc-200 p-3"
          >
            <StableTextInput
              value={name}
              disabled={!canManage}
              onChange={(nextName) => {
                const next = asItemRecords(normalized);
                next[index] = { ...next[index], name: nextName };
                delete next[index].title;
                onChange(next);
              }}
              placeholder="Name"
            />
            <StableTextInput
              value={description}
              disabled={!canManage}
              onChange={(nextDescription) => {
                const next = asItemRecords(normalized);
                next[index] = {
                  ...next[index],
                  description: nextDescription,
                };
                onChange(next);
              }}
              placeholder="Description"
              multiline
              className={`${authInputClassName} min-h-16`}
            />
            {mode === "products" ? (
              <StableTextInput
                value={price}
                disabled={!canManage}
                onChange={(nextPrice) => {
                  const next = asItemRecords(normalized);
                  next[index] = { ...next[index], price: nextPrice };
                  onChange(next);
                }}
                placeholder="Price"
              />
            ) : null}
            <StableTextInput
              value={href}
              disabled={!canManage}
              onChange={(nextHref) => {
                const next = asItemRecords(normalized);
                next[index] = { ...next[index], href: nextHref };
                onChange(next);
              }}
              placeholder="Link, e.g. /products"
            />
            <MediaPicker
              siteId={siteId}
              value={mediaId}
              onChange={(nextMediaId) => {
                const next = asItemRecords(normalized);
                next[index] = { ...next[index], mediaId: nextMediaId };
                onChange(next);
              }}
              disabled={!canManage}
              label="Image"
              hint="product"
            />
            {canManage ? (
              <button
                type="button"
                className="text-xs text-red-600"
                onClick={() =>
                  onChange(normalized.filter((_, i) => i !== index))
                }
              >
                Remove {noun}
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function GalleryOrderEditor({
  mediaIds,
  onChange,
}: {
  mediaIds: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <label className={authLabelClassName}>Image order</label>
      <ul className="space-y-2">
        {mediaIds.map((id, index) => (
          <li
            key={`${id}-${index}`}
            className="flex items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/website/media/file/${id}`}
              alt=""
              className="h-10 w-14 rounded-md object-cover"
            />
            <span className="min-w-0 flex-1 truncate text-xs text-zinc-500">
              Image {index + 1}
            </span>
            <button
              type="button"
              className="text-xs text-zinc-500 hover:text-zinc-900 disabled:opacity-40"
              disabled={index === 0}
              onClick={() => {
                const next = [...mediaIds];
                const [moved] = next.splice(index, 1);
                next.splice(index - 1, 0, moved);
                onChange(next);
              }}
            >
              Up
            </button>
            <button
              type="button"
              className="text-xs text-zinc-500 hover:text-zinc-900 disabled:opacity-40"
              disabled={index === mediaIds.length - 1}
              onClick={() => {
                const next = [...mediaIds];
                const [moved] = next.splice(index, 1);
                next.splice(index + 1, 0, moved);
                onChange(next);
              }}
            >
              Down
            </button>
            <button
              type="button"
              className="text-xs text-red-600"
              onClick={() => onChange(mediaIds.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FormSlugPicker({
  siteId,
  value,
  onChange,
  disabled,
}: {
  siteId: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [forms, setForms] = useState<Array<{ slug: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/website/sites/${siteId}/forms`);
        const data = (await response.json()) as {
          forms?: Array<{ slug: string; name: string }>;
        };
        if (!cancelled) {
          setForms(
            (data.forms ?? []).map((form) => ({
              slug: form.slug,
              name: form.name,
            })),
          );
        }
      } catch {
        if (!cancelled) setForms([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  return (
    <div>
      <label className={authLabelClassName}>Form</label>
      {loading ? (
        <div
          className="h-10 animate-pulse rounded-md border border-zinc-200 bg-zinc-50"
          aria-busy="true"
          aria-label="Loading forms"
        />
      ) : (
        <select
          className={authInputClassName}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        >
          {forms.length === 0 ? (
            <option value={value}>{value || "contact"}</option>
          ) : (
            forms.map((form) => (
              <option key={form.slug} value={form.slug}>
                {form.name}
              </option>
            ))
          )}
        </select>
      )}
      <p className="mt-1.5 text-[11px] text-zinc-500">
        Choose which form visitors will see in this section.
      </p>
    </div>
  );
}

function SectionSettingsPanel({
  settings,
  canManage,
  onChange,
}: {
  settings: SectionSettings;
  canManage: boolean;
  onChange: (patch: Partial<SectionSettings>) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
          Section layout
        </p>
        <p className="mt-0.5 text-[11px] text-zinc-500">
          Spacing, background, and width for this block.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={authLabelClassName}>Vertical padding</label>
          <select
            className={authInputClassName}
            value={settings.paddingY ?? "md"}
            onChange={(event) =>
              onChange({
                paddingY: event.target.value as SectionSettings["paddingY"],
              })
            }
            disabled={!canManage}
          >
            <option value="none">None</option>
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
            <option value="xl">Extra large</option>
          </select>
        </div>
        <div>
          <label className={authLabelClassName}>Background</label>
          <input
            type="text"
            className={authInputClassName}
            value={settings.background ?? ""}
            onChange={(event) =>
              onChange({ background: event.target.value || undefined })
            }
            disabled={!canManage}
            placeholder="#ffffff or leave empty"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={Boolean(settings.fullWidth)}
          onChange={(event) => onChange({ fullWidth: event.target.checked })}
          disabled={!canManage}
        />
        Full width (edge to edge)
      </label>
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={Boolean(settings.hidden)}
          onChange={(event) => onChange({ hidden: event.target.checked })}
          disabled={!canManage}
        />
        Hide this section on the live site
      </label>
      <div className="rounded-xl border border-zinc-200 bg-white p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
          Responsive visibility
        </p>
        <p className="mt-0.5 text-[11px] text-zinc-500">
          Preview with Desktop / Tablet / Mobile above the live preview.
        </p>
        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={Boolean(settings.hideOnMobile)}
              onChange={(event) =>
                onChange({ hideOnMobile: event.target.checked })
              }
              disabled={!canManage}
            />
            Hide on phones
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={Boolean(settings.hideOnDesktop)}
              onChange={(event) =>
                onChange({ hideOnDesktop: event.target.checked })
              }
              disabled={!canManage}
            />
            Hide on tablet & desktop
          </label>
        </div>
      </div>
    </div>
  );
}

function DragHandleIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden>
      <circle cx="2.5" cy="2.5" r="1.1" />
      <circle cx="7.5" cy="2.5" r="1.1" />
      <circle cx="2.5" cy="7" r="1.1" />
      <circle cx="7.5" cy="7" r="1.1" />
      <circle cx="2.5" cy="11.5" r="1.1" />
      <circle cx="7.5" cy="11.5" r="1.1" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 10.7a2 2 0 002.8 2.8" />
      <path d="M9.9 5.1A10.4 10.4 0 0112 5c5 0 8.5 4 10 7-0.5 1.1-1.3 2.3-2.4 3.4M6.1 6.1C4.2 7.5 2.8 9.3 2 12c1.5 3 5 7 10 7 1.4 0 2.7-.3 3.9-.8" />
    </svg>
  );
}

function SectionQuickAction({
  label,
  onClick,
  active,
  danger = false,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  active: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-2 py-1 text-[11px] font-medium tracking-[-0.01em] transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-35 ${
        danger
          ? active
            ? "text-red-300 hover:bg-white/10 hover:text-red-200 focus-visible:ring-white/40"
            : "text-red-600 hover:bg-red-50 focus-visible:ring-red-200"
          : active
            ? "text-zinc-300 hover:bg-white/10 hover:text-white focus-visible:ring-white/40"
            : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 focus-visible:ring-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}

function RemoveButton({
  canManage,
  onRemove,
}: {
  canManage: boolean;
  onRemove: () => void;
}) {
  if (!canManage) return null;
  return (
    <div className="flex justify-end border-t border-zinc-100 pt-4">
      <button
        type="button"
        className={`${authSecondaryButtonClassName} !w-auto border-red-200 px-3.5 py-2 text-red-700 hover:border-red-300 hover:bg-red-50`}
        onClick={onRemove}
      >
        Remove section
      </button>
    </div>
  );
}
