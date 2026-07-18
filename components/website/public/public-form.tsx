"use client";

import { useState } from "react";
import type { WebsiteFormWithFields } from "@/lib/website/types";

export function PublicForm({
  form,
  sourceUrl,
  primaryColor,
  borderRadius,
}: {
  form: WebsiteFormWithFields;
  sourceUrl?: string;
  primaryColor: string;
  borderRadius: string;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        `/api/website/public/forms/${form.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ values, sourceUrl }),
        },
      );
      const data = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) throw new Error(data.error || "Submission failed.");
      setSuccess(data.message || form.successMessage);
      setValues({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-4">
      {form.fields.map((field) => (
        <div key={field.id}>
          <label className="mb-1.5 block text-sm font-medium">
            {field.label}
            {field.required ? " *" : ""}
          </label>
          {field.fieldType === "textarea" ? (
            <textarea
              className="w-full border px-3 py-2 text-sm"
              style={{ borderRadius }}
              required={field.required}
              placeholder={field.placeholder ?? undefined}
              value={values[field.name] ?? ""}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [field.name]: event.target.value,
                }))
              }
              disabled={pending}
              rows={4}
            />
          ) : field.fieldType === "select" ? (
            <select
              className="w-full border px-3 py-2 text-sm"
              style={{ borderRadius }}
              required={field.required}
              value={values[field.name] ?? ""}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [field.name]: event.target.value,
                }))
              }
              disabled={pending}
            >
              <option value="">Select…</option>
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : field.fieldType === "checkbox" ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values[field.name] === "true"}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [field.name]: event.target.checked ? "true" : "false",
                  }))
                }
                disabled={pending}
              />
              {field.placeholder || field.label}
            </label>
          ) : (
            <input
              type={
                field.fieldType === "email"
                  ? "email"
                  : field.fieldType === "number"
                    ? "number"
                    : field.fieldType === "phone"
                      ? "tel"
                      : "text"
              }
              className="w-full border px-3 py-2 text-sm"
              style={{ borderRadius }}
              required={field.required}
              placeholder={field.placeholder ?? undefined}
              value={values[field.name] ?? ""}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [field.name]: event.target.value,
                }))
              }
              disabled={pending}
            />
          )}
        </div>
      ))}
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        style={{ background: primaryColor, borderRadius }}
      >
        {pending ? "Sending…" : "Submit"}
      </button>
    </form>
  );
}
