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
import {
  SECTION_TYPES,
  type SectionType,
  type WebsitePage,
  type WebsiteSection,
} from "@/lib/website/types";

const SECTION_LABELS: Record<SectionType, string> = {
  hero: "Hero",
  richText: "Rich text",
  image: "Image",
  features: "Features",
  cta: "Call to action",
  products: "Products",
  collections: "Collections",
  form: "Form",
  blogList: "Blog list",
  gallery: "Gallery",
  spacer: "Spacer",
};

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
}: {
  siteId: string;
  page: WebsitePage;
  initialSections: WebsiteSection[];
  canManage: boolean;
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
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selected = useMemo(
    () => sections.find((section) => section.clientKey === selectedId) ?? null,
    [sections, selectedId],
  );

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
      content: {},
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

  async function saveAll() {
    if (!canManage) return;
    setPending(true);
    setError(null);
    setMessage(null);
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
        setSections(draft);
        setSelectedId(draft[0]?.clientKey ?? null);
      }
      setMessage("Page saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save page.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Page builder
          </p>
          <h1 className="text-2xl font-semibold text-zinc-900">{page.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Drag sections to reorder. Edit content in the inspector.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/sites/${siteId}/pages`}
            className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5`}
          >
            All pages
          </Link>
          {canManage ? (
            <button
              type="button"
              className={`${authButtonClassName} !w-auto px-4`}
              onClick={saveAll}
              disabled={pending}
            >
              {pending ? "Saving…" : "Save page"}
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {message ? <p className={authSuccessClassName}>{message}</p> : null}

      <div className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2">
        <div>
          <label className={authLabelClassName}>Title</label>
          <input
            className={authInputClassName}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={!canManage || pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Slug</label>
          <input
            className={authInputClassName}
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            disabled={!canManage || pending || page.pageType === "home"}
          />
        </div>
        <div>
          <label className={authLabelClassName}>SEO title</label>
          <input
            className={authInputClassName}
            value={seoTitle}
            onChange={(event) => setSeoTitle(event.target.value)}
            disabled={!canManage || pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>SEO description</label>
          <input
            className={authInputClassName}
            value={seoDescription}
            onChange={(event) => setSeoDescription(event.target.value)}
            disabled={!canManage || pending}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
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
                className={`${authSecondaryButtonClassName} !w-auto px-3`}
                onClick={addSection}
              >
                Add section
              </button>
            ) : null}
          </div>

          <ul className="space-y-2">
            {sections.map((section) => (
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
                className={`cursor-pointer rounded-lg border px-3 py-3 transition ${
                  selectedId === section.clientKey
                    ? "border-zinc-900 bg-zinc-50"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {SECTION_LABELS[section.type]}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
                      {String(
                        section.content.heading ||
                          section.content.html ||
                          section.type,
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-zinc-400">⋮⋮</span>
                </div>
              </li>
            ))}
            {sections.length === 0 ? (
              <li className="rounded-lg border border-dashed border-zinc-300 px-3 py-8 text-center text-sm text-zinc-500">
                No sections yet. Add one to start building.
              </li>
            ) : null}
          </ul>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Inspector</h2>
          {!selected ? (
            <p className="mt-3 text-sm text-zinc-500">
              Select a section to edit its content.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-xs uppercase tracking-wide text-zinc-400">
                {SECTION_LABELS[selected.type]}
              </p>
              {selected.type === "richText" ? (
                <div>
                  <label className={authLabelClassName}>HTML</label>
                  <textarea
                    className={`${authInputClassName} min-h-40 font-mono text-xs`}
                    value={String(selected.content.html ?? "")}
                    onChange={(event) =>
                      updateSelectedContent("html", event.target.value)
                    }
                    disabled={!canManage}
                  />
                </div>
              ) : selected.type === "spacer" ? (
                <div>
                  <label className={authLabelClassName}>Height</label>
                  <select
                    className={authInputClassName}
                    value={String(selected.content.height ?? "md")}
                    onChange={(event) =>
                      updateSelectedContent("height", event.target.value)
                    }
                    disabled={!canManage}
                  >
                    <option value="sm">Small</option>
                    <option value="md">Medium</option>
                    <option value="lg">Large</option>
                    <option value="xl">Extra large</option>
                  </select>
                </div>
              ) : (
                <>
                  {[
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
                    "mediaId",
                  ].map((key) =>
                    key in selected.content ||
                    ["heading", "subheading", "body"].includes(key) ? (
                      <div key={key}>
                        <label className={authLabelClassName}>{key}</label>
                        <input
                          className={authInputClassName}
                          value={String(selected.content[key] ?? "")}
                          onChange={(event) =>
                            updateSelectedContent(key, event.target.value)
                          }
                          disabled={!canManage}
                        />
                      </div>
                    ) : null,
                  )}
                  {(selected.type === "features" ||
                    selected.type === "products" ||
                    selected.type === "collections") && (
                    <div>
                      <label className={authLabelClassName}>
                        Items (JSON array)
                      </label>
                      <textarea
                        className={`${authInputClassName} min-h-36 font-mono text-xs`}
                        value={JSON.stringify(
                          selected.content.items ?? [],
                          null,
                          2,
                        )}
                        onChange={(event) => {
                          try {
                            const parsed = JSON.parse(event.target.value);
                            if (Array.isArray(parsed)) {
                              updateSelectedContent("items", parsed);
                            }
                          } catch {
                            // keep typing until valid JSON
                          }
                        }}
                        disabled={!canManage}
                      />
                    </div>
                  )}
                </>
              )}
              {canManage ? (
                <button
                  type="button"
                  className={`${authSecondaryButtonClassName} text-red-700`}
                  onClick={removeSelected}
                >
                  Remove section
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
