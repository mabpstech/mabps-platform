"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";
import type { EmailTemplate } from "@/lib/email-engine/types";

export function EmailTemplatesPanel({
  templates,
  canManage,
}: {
  templates: EmailTemplate[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"transactional" | "marketing">(
    "transactional",
  );
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState(
    "<p>Hello {{name}},</p><p>Thanks for connecting with us.</p>",
  );

  async function createTemplate(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/email/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          subject,
          html,
          variables: ["name", "email"],
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to create.");
      setName("");
      setSubject("");
      setSuccess("Template saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create.");
    } finally {
      setPending(false);
    }
  }

  async function removeTemplate(templateId: string) {
    if (!canManage) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/email/templates/${templateId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to delete.");
      setSuccess("Template deleted.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Templates</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Reusable transactional and marketing email templates with{" "}
          {"{{variable}}"} placeholders.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      {canManage ? (
        <form
          onSubmit={createTemplate}
          className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2"
        >
          <div>
            <label className={authLabelClassName}>Name</label>
            <input
              className={authInputClassName}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={pending}
            />
          </div>
          <div>
            <label className={authLabelClassName}>Category</label>
            <select
              className={authInputClassName}
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as "transactional" | "marketing")
              }
              disabled={pending}
            >
              <option value="transactional">Transactional</option>
              <option value="marketing">Marketing</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={authLabelClassName}>Subject</label>
            <input
              className={authInputClassName}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              disabled={pending}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={authLabelClassName}>HTML</label>
            <textarea
              className={`${authInputClassName} min-h-32 font-mono text-xs`}
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              required
              disabled={pending}
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className={`${authButtonClassName} !w-auto px-4`}
              disabled={pending}
            >
              Create template
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-zinc-500" colSpan={5}>
                  No templates yet.
                </td>
              </tr>
            ) : (
              templates.map((template) => (
                <tr key={template.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{template.name}</p>
                    <p className="font-mono text-xs text-zinc-400">
                      {template.slug}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {template.category}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{template.subject}</td>
                  <td className="px-4 py-3 text-zinc-600">{template.status}</td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <button
                        type="button"
                        className="text-sm text-red-600 hover:underline"
                        disabled={pending}
                        onClick={() => removeTemplate(template.id)}
                      >
                        Delete
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
