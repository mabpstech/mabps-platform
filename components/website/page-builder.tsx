"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const hydrated = useRef(false);
  const skipDirty = useRef(false);

  const selected = useMemo(
    () => sections.find((section) => section.clientKey === selectedId) ?? null,
    [sections, selectedId],
  );

  const previewPath =
    page.pageType === "home"
      ? `/p/${siteSlug}`
      : `/p/${siteSlug}/${page.slug}`;

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    if (skipDirty.current) {
      skipDirty.current = false;
      return;
    }
    setSaveState((current) => (current === "saving" ? current : "dirty"));
  }, [title, slug, seoTitle, seoDescription, sections]);

  useEffect(() => {
    if (saveState !== "dirty" || !canManage) return;
    const timer = window.setTimeout(() => {
      void saveAll({ silent: true });
    }, 2500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveState, canManage]);

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
    if (!selected) return;
    setSections((current) =>
      current.map((section) =>
        section.clientKey === selected.clientKey
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

  const saveAll = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!canManage) return;
      setSaveState("saving");
      try {
        const metaResponse = await fetch(
          `/api/website/sites/${siteId}/pages/${page.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              slug,
              seoTitle: seoTitle || null,
              seoDescription: seoDescription || null,
            }),
          },
        );
        const metaData = (await metaResponse.json()) as { error?: string };
        if (!metaResponse.ok) {
          throw new Error(metaData.error || "Unable to save page settings.");
        }

        const keepSelected = selectedId;
        const sectionsResponse = await fetch(
          `/api/website/sites/${siteId}/pages/${page.id}/sections`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sections: sections.map((section) => ({
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

        if (sectionsData.sections) {
          const draft = toDraft(sectionsData.sections);
          skipDirty.current = true;
          setSections(draft);
          const stillThere = draft.find(
            (section) =>
              section.clientKey === keepSelected ||
              section.id === keepSelected,
          );
          setSelectedId(stillThere?.clientKey ?? draft[0]?.clientKey ?? null);
        }
        setSaveState("saved");
        if (!silent) {
          setToast({ message: "Page saved ✓", tone: "success" });
        }
        router.refresh();
        window.setTimeout(() => {
          setSaveState((current) => (current === "saved" ? "idle" : current));
        }, 1800);
      } catch (err) {
        setSaveState("error");
        setToast({
          message: err instanceof Error ? err.message : "Unable to save page.",
          tone: "error",
        });
      }
    },
    [
      canManage,
      page.id,
      router,
      sections,
      selectedId,
      seoDescription,
      seoTitle,
      siteId,
      slug,
      title,
    ],
  );

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
          <div>
            <label className={authLabelClassName}>Page title</label>
            <input
              className={authInputClassName}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={!canManage}
            />
          </div>
          <div>
            <label className={authLabelClassName}>Page address</label>
            <input
              className={authInputClassName}
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              disabled={!canManage || page.pageType === "home"}
            />
          </div>
          <div>
            <label className={authLabelClassName}>Search title</label>
            <input
              className={authInputClassName}
              value={seoTitle}
              onChange={(event) => setSeoTitle(event.target.value)}
              disabled={!canManage}
              placeholder="Shown in Google results"
            />
          </div>
          <div>
            <label className={authLabelClassName}>Search description</label>
            <input
              className={authInputClassName}
              value={seoDescription}
              onChange={(event) => setSeoDescription(event.target.value)}
              disabled={!canManage}
              placeholder="Short summary for search engines"
            />
          </div>
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
            <LivePreview src={previewPath} title="Live preview" />
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
        <div>
          <label className={authLabelClassName}>Content</label>
          <textarea
            className={`${authInputClassName} min-h-48`}
            value={String(section.content.html ?? "")
              .replace(/<p>/g, "")
              .replace(/<\/p>/g, "\n")
              .replace(/<[^>]+>/g, "")}
            onChange={(event) => {
              const paragraphs = event.target.value
                .split(/\n+/)
                .filter(Boolean)
                .map((line) => `<p>${line}</p>`)
                .join("");
              onChange("html", paragraphs || "<p></p>");
            }}
            disabled={!canManage}
            placeholder="Write your story…"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Plain text is fine — we format it into paragraphs for you.
          </p>
        </div>
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
      {multiline ? (
        <textarea
          className={`${authInputClassName} min-h-24`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          placeholder={placeholder}
        />
      ) : (
        <input
          className={authInputClassName}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          placeholder={placeholder}
        />
      )}
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
          key={index}
          className="space-y-2 rounded-xl border border-zinc-200 p-3"
        >
          <input
            className={authInputClassName}
            value={item.title}
            disabled={!canManage}
            onChange={(event) => {
              const next = [...normalized];
              next[index] = { ...next[index], title: event.target.value };
              onChange(next);
            }}
            placeholder="Title"
          />
          <textarea
            className={`${authInputClassName} min-h-16`}
            value={item.description}
            disabled={!canManage}
            onChange={(event) => {
              const next = [...normalized];
              next[index] = { ...next[index], description: event.target.value };
              onChange(next);
            }}
            placeholder="Description"
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
