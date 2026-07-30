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
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-4" noValidate>
      {form.fields.map((field) => {
        const inputId = `field-${field.id}`;
        return (
        <div key={field.id}>
          {field.fieldType === "checkbox" ? null : (
            <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">
              {field.label}
              {field.required ? (
                <span aria-hidden="true"> *</span>
              ) : null}
              {field.required ? (
                <span className="sr-only"> (required)</span>
              ) : null}
            </label>
          )}
          {field.fieldType === "textarea" ? (
            <textarea
              id={inputId}
              name={field.name}
              className="w-full border px-3 py-2 text-sm"
              style={{ borderRadius }}
              required={field.required}
              aria-required={field.required || undefined}
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
              id={inputId}
              name={field.name}
              className="w-full border px-3 py-2 text-sm"
              style={{ borderRadius }}
              required={field.required}
              aria-required={field.required || undefined}
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
            <label htmlFor={inputId} className="flex items-center gap-2 text-sm">
              <input
                id={inputId}
                name={field.name}
                type="checkbox"
                checked={values[field.name] === "true"}
                aria-required={field.required || undefined}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [field.name]: event.target.checked ? "true" : "false",
                  }))
                }
                disabled={pending}
              />
              {field.placeholder || field.label}
              {field.required ? (
                <span className="sr-only"> (required)</span>
              ) : null}
            </label>
          ) : (
            <input
              id={inputId}
              name={field.name}
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
              aria-required={field.required || undefined}
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
        );
      })}
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}
      {success ? (
        <p
          role="status"
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
        >
          {success}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        style={{
          background: `var(--site-color-primary, ${primaryColor})`,
          borderRadius: `var(--site-radius-button, ${borderRadius})`,
          fontFamily: "var(--site-font-button, inherit)",
          boxShadow: "var(--site-shadow-button, none)",
        }}
      >
        {pending ? "Sending…" : "Submit"}
      </button>
    </form>
  );
}
