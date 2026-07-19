"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import type { WebsiteFormWithFields } from "@/lib/website/types";

export function FormsManager({
  siteId,
  forms,
  canManage,
}: {
  siteId: string;
  forms: WebsiteFormWithFields[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function createForm(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/website/sites/${siteId}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await response.json()) as {
        error?: string;
        form?: WebsiteFormWithFields;
      };
      if (!response.ok) throw new Error(data.error || "Unable to create form.");
      setName("");
      if (data.form) {
        router.push(`/website/${siteId}/forms/${data.form.id}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create form.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Forms</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Build forms, embed them in pages, and review submissions.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}

      {canManage ? (
        <form
          onSubmit={createForm}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4"
        >
          <div className="min-w-[16rem] flex-1">
            <label className={authLabelClassName}>Form name</label>
            <input
              className={authInputClassName}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              disabled={pending}
            />
          </div>
          <button
            type="submit"
            className={`${authButtonClassName} !w-auto px-4`}
            disabled={pending}
          >
            {pending ? "Creating…" : "Create form"}
          </button>
        </form>
      ) : null}

      <div className="space-y-3">
        {forms.map((form) => (
          <div
            key={form.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4"
          >
            <div>
              <Link
                href={`/website/${siteId}/forms/${form.id}`}
                className="font-medium text-zinc-900 hover:underline"
              >
                {form.name}
              </Link>
              <p className="mt-1 text-sm text-zinc-500">
                /{form.slug} · {form.fields.length} fields · {form.status}
              </p>
            </div>
            <Link
              href={`/website/${siteId}/forms/${form.id}`}
              className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5`}
            >
              Manage
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
