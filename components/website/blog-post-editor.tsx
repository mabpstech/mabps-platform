"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  authButtonClassName,
  authInputClassName,
  authLabelClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import { MediaPicker } from "@/components/website/media-picker";
import {
  editorFetchJson,
  useEditorPersistence,
} from "@/components/website/hooks/use-editor-persistence";
import { StatusBadge } from "@/components/website/ui/empty-state";
import { SaveBar } from "@/components/website/ui/save-bar";
import { Toast } from "@/components/website/ui/toast";
import type { WebsiteBlogPost } from "@/lib/website/types";

export function BlogPostEditor({
  siteId,
  post,
  canManage,
}: {
  siteId: string;
  post: WebsiteBlogPost;
  canManage: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState(post);
  const [revision, setRevision] = useState(post.updatedAt);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const skipDirty = useRef(false);
  const formRef = useRef(form);
  const pendingStatusRef = useRef<WebsiteBlogPost["status"] | null>(null);
  formRef.current = form;

  useEffect(() => {
    skipDirty.current = true;
    setForm(post);
    setRevision(post.updatedAt);
  }, [post]);

  const { saveState, saveNow } = useEditorPersistence<{ post?: WebsiteBlogPost }>({
    enabled: canManage,
    resourceKey: `blog:${post.id}`,
    revision,
    onRevisionChange: setRevision,
    skipNextDirtyRef: skipDirty,
    deps: [form],
    onRemoteUpdate: () => router.refresh(),
    onError: (error) => setToast({ message: error.message, tone: "error" }),
    onSaved: (result, { silent, editedDuringSave }) => {
      if (result.data?.post && !editedDuringSave) {
        skipDirty.current = true;
        setForm(result.data.post);
      }
      if (!silent) {
        setToast({
          message:
            result.data?.post?.status === "published"
              ? "Post published"
              : "Post saved",
          tone: "success",
        });
        router.refresh();
      }
    },
    save: async ({ expectedUpdatedAt, signal }) => {
      const status = pendingStatusRef.current ?? formRef.current.status;
      pendingStatusRef.current = null;
      const data = await editorFetchJson<{ post?: WebsiteBlogPost }>(
        `/api/website/sites/${siteId}/blog/${post.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          signal,
          body: JSON.stringify({
            title: formRef.current.title,
            slug: formRef.current.slug,
            excerpt: formRef.current.excerpt,
            content: formRef.current.content,
            authorName: formRef.current.authorName,
            coverMediaId: formRef.current.coverMediaId,
            seoTitle: formRef.current.seoTitle,
            seoDescription: formRef.current.seoDescription,
            status,
            expectedUpdatedAt,
          }),
        },
      );
      if (!data.post?.updatedAt) throw new Error("Unable to save post.");
      return { updatedAt: data.post.updatedAt, data };
    },
  });

  async function saveWithStatus(status: WebsiteBlogPost["status"]) {
    pendingStatusRef.current = status;
    await saveNow({ silent: false });
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <SaveBar
          state={saveState}
          onSave={() => void saveWithStatus(form.status === "published" ? "published" : "draft")}
          onReload={() => router.refresh()}
          label="Save post"
        />
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Edit post
          </h1>
          <div className="mt-2">
            <StatusBadge status={form.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/website/${siteId}/blog`}
            className={`${authSecondaryButtonClassName} !w-auto px-3`}
          >
            Back
          </Link>
          {canManage ? (
            <>
              <button
                type="button"
                className={`${authSecondaryButtonClassName} !w-auto px-3`}
                onClick={() => void saveWithStatus("draft")}
                disabled={saveState === "saving" || saveState === "retrying"}
              >
                Save draft
              </button>
              <button
                type="button"
                className={`${authButtonClassName} !w-auto px-4`}
                onClick={() => void saveWithStatus("published")}
                disabled={saveState === "saving" || saveState === "retrying"}
              >
                {saveState === "saving" || saveState === "retrying"
                  ? "Saving…"
                  : "Publish"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6">
        <div>
          <label className={authLabelClassName}>Title</label>
          <input
            className={authInputClassName}
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
            disabled={!canManage}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Post address</label>
          <input
            className={authInputClassName}
            value={form.slug}
            onChange={(event) =>
              setForm((current) => ({ ...current, slug: event.target.value }))
            }
            disabled={!canManage}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Short summary</label>
          <textarea
            className={`${authInputClassName} min-h-20`}
            value={form.excerpt ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                excerpt: event.target.value || null,
              }))
            }
            disabled={!canManage}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Content</label>
          <textarea
            className={`${authInputClassName} min-h-64`}
            value={form.content}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                content: event.target.value,
              }))
            }
            disabled={!canManage}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={authLabelClassName}>Author</label>
            <input
              className={authInputClassName}
              value={form.authorName ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  authorName: event.target.value || null,
                }))
              }
              disabled={!canManage}
            />
          </div>
          <MediaPicker
            siteId={siteId}
            value={form.coverMediaId}
            onChange={(coverMediaId) =>
              setForm((current) => ({ ...current, coverMediaId }))
            }
            disabled={!canManage}
            label="Cover image"
            hint="cover"
          />
        </div>
      </div>

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone ?? "info"}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
