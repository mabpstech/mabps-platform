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
} from "react";
import {
  authButtonClassName,
  authInputClassName,
  authLabelClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import { LivePreview } from "@/components/website/live-preview";
import { MediaPicker } from "@/components/website/media-picker";
import { defaultSectionContent } from "@/components/website/section-defaults";
import {
  CONTENT_FIELD_LABELS,
  SECTION_LABELS,
} from "@/components/website/ui/labels";
import { SaveBar, type SaveState } from "@/components/website/ui/save-bar";
import { Toast } from "@/components/website/ui/toast";
import {
  SECTION_TYPES,
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
}: {
  siteId: string;
  page: WebsitePage;
  initialSections: WebsiteSection[];
  canManage: boolean;
  siteSlug: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [seoTitle, setSeoTitle] = useState(page.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(
    page.seoDescription ?? "",
  );
  const [sections, setSections] = useState(() => toDraft(initialSections));
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSections[0]?.id ?? null,
  );
  const [dragId, setDragId] = useState<string | null>(null);
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
  const seoTitleRef = useRef(seoTitle);
  const seoDescriptionRef = useRef(seoDescription);
  const sectionsRef = useRef(sections);

  titleRef.current = title;
  slugRef.current = slug;
  seoTitleRef.current = seoTitle;
  seoDescriptionRef.current = seoDescription;
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

  const saveAll = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!canManage || savingRef.current) return;
      savingRef.current = true;
      const versionAtStart = editVersionRef.current;
      const snapshotTitle = titleRef.current;
      const snapshotSlug = slugRef.current;
      const snapshotSeoTitle = seoTitleRef.current;
      const snapshotSeoDescription = seoDescriptionRef.current;
      const snapshotSections = sectionsRef.current;

      setSaveState("saving");
      try {
        const metaResponse = await fetch(
          `/api/website/sites/${siteId}/pages/${page.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: snapshotTitle,
              slug: snapshotSlug,
              seoTitle: snapshotSeoTitle || null,
              seoDescription: snapshotSeoDescription || null,
            }),
          },
        );
        const metaData = (await metaResponse.json()) as { error?: string };
        if (!metaResponse.ok) {
          throw new Error(metaData.error || "Unable to save page settings.");
        }

        const sectionsResponse = await fetch(
          `/api/website/sites/${siteId}/pages/${page.id}/sections`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sections: snapshotSections.map((section) => ({
                id: section.id.startsWith("new-") ? undefined : section.id,
                type: section.type,
                content: section.content,
                settings: section.settings,
              })),
            }),
          },
        );
        const sectionsData = (await sectionsResponse.json()) as {
          error?: string;
          sections?: WebsiteSection[];
        };
        if (!sectionsResponse.ok) {
          throw new Error(sectionsData.error || "Unable to save sections.");
        }

        const editedDuringSave = editVersionRef.current !== versionAtStart;

        if (sectionsData.sections) {
          // ID remap only — never clobber in-progress content from the response.
          // Skip dirty tracking when nothing changed during the request.
          if (!editedDuringSave) {
            skipDirty.current = true;
          }
          setSections((current) =>
            mergeSavedSections(current, sectionsData.sections!),
          );
        }

        if (editedDuringSave) {
          // Debounced effect will schedule another save for the newer draft.
          setSaveState("dirty");
        } else {
          setSaveState("saved");
          setPreviewToken((current) => current + 1);
          if (!silent) {
            setToast({ message: "Page saved ✓", tone: "success" });
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
          message: err instanceof Error ? err.message : "Unable to save page.",
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
  }, [title, slug, seoTitle, seoDescription, sections, canManage, saveAll]);

  function reorder(fromId: string, toId: string) {
    setSections((current) => {
      const fromIndex = current.findIndex((item) => item.clientKey === fromId);
      const toIndex = current.findIndex((item) => item.clientKey === toId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next.map((item, index) => ({ ...item, sortOrder: index }));
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

  function removeSelected() {
    if (!selected) return;
    setSections((current) =>
      current.filter((section) => section.clientKey !== selected.clientKey),
    );
    setSelectedId(null);
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <SaveBar
          state={saveState}
          onSave={() => void saveAll()}
          label="Save page"
        />
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-400">
            Page editor
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {page.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Select a section on the left, edit on the right, preview instantly.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5`}
            onClick={() => setShowSettings((value) => !value)}
          >
            {showSettings ? "Hide settings" : "Page settings"}
          </button>
          <button
            type="button"
            className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5`}
            onClick={() => setShowPreview((value) => !value)}
          >
            {showPreview ? "Hide preview" : "Show preview"}
          </button>
          <Link
            href={`/website/${siteId}/pages`}
            className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5`}
          >
            All pages
          </Link>
        </div>
      </div>

      {showSettings ? (
        <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-5 sm:grid-cols-2">
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
      ) : null}

      <div
        className={`grid gap-4 ${showPreview ? "xl:grid-cols-[16rem_minmax(0,1fr)_22rem]" : "lg:grid-cols-[16rem_minmax(0,1fr)]"}`}
      >
        <aside className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-3">
          <div className="space-y-2 px-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Sections
            </p>
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
                className={`${authButtonClassName} !w-full`}
                onClick={addSection}
              >
                Add section
              </button>
            ) : null}
          </div>

          <ul className="space-y-1.5">
            {sections.map((section, index) => {
              const active = selectedId === section.clientKey;
              return (
                <li
                  key={section.clientKey}
                  draggable={canManage}
                  onDragStart={() => setDragId(section.clientKey)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (dragId) reorder(dragId, section.clientKey);
                    setDragId(null);
                  }}
                  onClick={() => setSelectedId(section.clientKey)}
                  className={`cursor-pointer rounded-xl border px-3 py-3 transition ${
                    active
                      ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                      : "border-transparent bg-zinc-50 text-zinc-900 hover:border-zinc-200 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide opacity-60">
                        {index + 1}
                      </p>
                      <p className="truncate text-sm font-medium">
                        {SECTION_LABELS[section.type]}
                      </p>
                      <p
                        className={`mt-0.5 line-clamp-1 text-xs ${active ? "text-zinc-300" : "text-zinc-500"}`}
                      >
                        {String(
                          section.content.heading ||
                            section.content.subheading ||
                            "Empty section",
                        )}
                      </p>
                    </div>
                    <span className={`text-xs ${active ? "text-zinc-400" : "text-zinc-300"}`}>
                      ⋮⋮
                    </span>
                  </div>
                </li>
              );
            })}
            {sections.length === 0 ? (
              <li className="rounded-xl border border-dashed border-zinc-300 px-3 py-10 text-center text-sm text-zinc-500">
                Add your first section to start building this page.
              </li>
            ) : null}
          </ul>
        </aside>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          {!selected ? (
            <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
              <p className="text-sm font-medium text-zinc-900">
                Select a section
              </p>
              <p className="mt-1 max-w-xs text-sm text-zinc-500">
                Choose a section from the left to edit its content.
              </p>
            </div>
          ) : (
            <SectionInspector
              key={selected.clientKey}
              siteId={siteId}
              section={selected}
              canManage={canManage}
              onChange={updateSelectedContent}
              onRemove={removeSelected}
            />
          )}
        </div>

        {showPreview ? (
          <div className="xl:sticky xl:top-20 xl:self-start">
            <LivePreview
              src={previewPath}
              title="Live preview"
              refreshToken={previewToken}
            />
          </div>
        ) : null}
      </div>

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
  onRemove,
}: {
  siteId: string;
  section: DraftSection;
  canManage: boolean;
  onChange: (key: string, value: unknown) => void;
  onRemove: () => void;
}) {
  if (section.type === "hero") {
    return (
      <HeroInspector
        siteId={siteId}
        content={section.content}
        canManage={canManage}
        onChange={onChange}
        onRemove={onRemove}
      />
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
    "formSlug",
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
      {"mediaId" in section.content ? (
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
          hint="product"
        />
      ) : null}
      {(section.type === "features" ||
        section.type === "products" ||
        section.type === "collections") && (
        <ItemsEditor
          items={Array.isArray(section.content.items) ? section.content.items : []}
          canManage={canManage}
          onChange={(items) => onChange("items", items)}
        />
      )}
      <RemoveButton canManage={canManage} onRemove={onRemove} />
    </div>
  );
}

function HeroInspector({
  siteId,
  content,
  canManage,
  onChange,
  onRemove,
}: {
  siteId: string;
  content: Record<string, unknown>;
  canManage: boolean;
  onChange: (key: string, value: unknown) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-5">
      <InspectorHeading type="hero" />
      <Field
        label="Small label"
        value={String(content.eyebrow ?? "")}
        onChange={(value) => onChange("eyebrow", value)}
        disabled={!canManage}
      />
      <Field
        label="Headline"
        value={String(content.heading ?? "")}
        onChange={(value) => onChange("heading", value)}
        disabled={!canManage}
      />
      <Field
        label="Supporting text"
        value={String(content.subheading ?? "")}
        onChange={(value) => onChange("subheading", value)}
        disabled={!canManage}
        multiline
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Primary button text"
          value={String(content.primaryLabel ?? "")}
          onChange={(value) => onChange("primaryLabel", value)}
          disabled={!canManage}
        />
        <Field
          label="Primary button link"
          value={String(content.primaryHref ?? "")}
          onChange={(value) => onChange("primaryHref", value)}
          disabled={!canManage}
          placeholder="/contact"
        />
        <Field
          label="Secondary button text"
          value={String(content.secondaryLabel ?? "")}
          onChange={(value) => onChange("secondaryLabel", value)}
          disabled={!canManage}
        />
        <Field
          label="Secondary button link"
          value={String(content.secondaryHref ?? "")}
          onChange={(value) => onChange("secondaryHref", value)}
          disabled={!canManage}
          placeholder="/about"
        />
      </div>

      <MediaPicker
        siteId={siteId}
        value={
          typeof content.desktopMediaId === "string"
            ? content.desktopMediaId
            : typeof content.backgroundMediaId === "string"
              ? content.backgroundMediaId
              : null
        }
        onChange={(mediaId) => {
          onChange("desktopMediaId", mediaId);
          onChange("backgroundMediaId", mediaId);
        }}
        disabled={!canManage}
        label="Desktop / background image"
        hint="hero"
      />
      <MediaPicker
        siteId={siteId}
        value={
          typeof content.mobileMediaId === "string"
            ? content.mobileMediaId
            : null
        }
        onChange={(mediaId) => onChange("mobileMediaId", mediaId)}
        disabled={!canManage}
        label="Mobile image"
        hint="banner"
      />
      <Field
        label="Background video URL"
        value={String(content.backgroundVideoUrl ?? "")}
        onChange={(value) => onChange("backgroundVideoUrl", value)}
        disabled={!canManage}
        placeholder="https://…"
      />

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
        </div>
        <div>
          <label className={authLabelClassName}>Dark overlay</label>
          <input
            type="range"
            min={0}
            max={80}
            value={Number(content.overlay ?? 40)}
            onChange={(event) => onChange("overlay", Number(event.target.value))}
            disabled={!canManage}
            className="mt-3 w-full"
          />
          <p className="mt-1 text-xs text-zinc-500">
            {Number(content.overlay ?? 40)}% — improves text readability on images
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
        </div>
      </div>

      <RemoveButton canManage={canManage} onRemove={onRemove} />
    </div>
  );
}

function InspectorHeading({ type }: { type: SectionType }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-400">
        Editing
      </p>
      <h2 className="mt-1 text-lg font-semibold text-zinc-900">
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

function ItemsEditor({
  items,
  canManage,
  onChange,
}: {
  items: unknown[];
  canManage: boolean;
  onChange: (items: Array<Record<string, string>>) => void;
}) {
  const normalized = items.map((item) => {
    const record = (item ?? {}) as Record<string, unknown>;
    return {
      title: String(record.title ?? ""),
      description: String(record.description ?? record.body ?? ""),
    };
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className={authLabelClassName}>Items</label>
        {canManage ? (
          <button
            type="button"
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
            onClick={() =>
              onChange([
                ...normalized,
                { title: "New item", description: "Description" },
              ])
            }
          >
            Add item
          </button>
        ) : null}
      </div>
      {normalized.map((item, index) => (
        <div
          key={`item-${index}`}
          className="space-y-2 rounded-xl border border-zinc-200 p-3"
        >
          <StableTextInput
            value={item.title}
            disabled={!canManage}
            onChange={(title) => {
              const next = [...normalized];
              next[index] = { ...next[index], title };
              onChange(next);
            }}
            placeholder="Title"
          />
          <StableTextInput
            value={item.description}
            disabled={!canManage}
            onChange={(description) => {
              const next = [...normalized];
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
              Remove item
            </button>
          ) : null}
        </div>
      ))}
    </div>
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
    <button
      type="button"
      className={`${authSecondaryButtonClassName} text-red-700`}
      onClick={onRemove}
    >
      Remove section
    </button>
  );
}
