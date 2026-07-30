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
import {
  editorFetchJson,
  useEditorPersistence,
} from "@/components/website/hooks/use-editor-persistence";
import { EmptyState } from "@/components/website/ui/empty-state";
import { InlineBanner } from "@/components/website/ui/inline-banner";
import { SaveBar } from "@/components/website/ui/save-bar";
import {
  FORM_FIELD_TYPES,
  type FormFieldType,
  type WebsiteFormSubmission,
  type WebsiteFormWithFields,
} from "@/lib/website/types";

type DraftField = {
  key: string;
  label: string;
  name: string;
  fieldType: FormFieldType;
  placeholder: string;
  required: boolean;
  options: string;
};

export function FormEditor({
  siteId,
  form,
  submissions,
  canManage,
}: {
  siteId: string;
  form: WebsiteFormWithFields;
  submissions: WebsiteFormSubmission[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(form.name);
  const [slug, setSlug] = useState(form.slug);
  const [successMessage, setSuccessMessage] = useState(form.successMessage);
  const [notifyEmail, setNotifyEmail] = useState(form.notifyEmail ?? "");
  const [fields, setFields] = useState<DraftField[]>(
    form.fields.map((field) => ({
      key: field.id,
      label: field.label,
      name: field.name,
      fieldType: field.fieldType,
      placeholder: field.placeholder ?? "",
      required: field.required,
      options: field.options.join(", "),
    })),
  );
  const [revision, setRevision] = useState(form.updatedAt);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const skipDirty = useRef(false);
  const nameRef = useRef(name);
  const slugRef = useRef(slug);
  const successMessageRef = useRef(successMessage);
  const notifyEmailRef = useRef(notifyEmail);
  const fieldsRef = useRef(fields);
  nameRef.current = name;
  slugRef.current = slug;
  successMessageRef.current = successMessage;
  notifyEmailRef.current = notifyEmail;
  fieldsRef.current = fields;

  useEffect(() => {
    skipDirty.current = true;
    setName(form.name);
    setSlug(form.slug);
    setSuccessMessage(form.successMessage);
    setNotifyEmail(form.notifyEmail ?? "");
    setFields(
      form.fields.map((field) => ({
        key: field.id,
        label: field.label,
        name: field.name,
        fieldType: field.fieldType,
        placeholder: field.placeholder ?? "",
        required: field.required,
        options: field.options.join(", "),
      })),
    );
    setRevision(form.updatedAt);
  }, [form]);

  const { saveState, saveNow } = useEditorPersistence<{
    form?: WebsiteFormWithFields;
  }>({
    enabled: canManage,
    resourceKey: `form:${form.id}`,
    revision,
    onRevisionChange: setRevision,
    skipNextDirtyRef: skipDirty,
    deps: [name, slug, successMessage, notifyEmail, fields],
    onRemoteUpdate: () => router.refresh(),
    onError: (err) => {
      setMessage(null);
      setError(err.message);
    },
    onSaved: (result, { silent, editedDuringSave }) => {
      if (result.data?.form && !editedDuringSave) {
        skipDirty.current = true;
        setName(result.data.form.name);
        setSlug(result.data.form.slug);
        setSuccessMessage(result.data.form.successMessage);
        setNotifyEmail(result.data.form.notifyEmail ?? "");
        setFields(
          result.data.form.fields.map((field) => ({
            key: field.id,
            label: field.label,
            name: field.name,
            fieldType: field.fieldType,
            placeholder: field.placeholder ?? "",
            required: field.required,
            options: field.options.join(", "),
          })),
        );
      }
      if (!silent) {
        setError(null);
        setMessage("Form saved.");
        router.refresh();
      }
    },
    save: async ({ expectedUpdatedAt, signal }) => {
      const data = await editorFetchJson<{ form?: WebsiteFormWithFields }>(
        `/api/website/sites/${siteId}/forms/${form.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          signal,
          body: JSON.stringify({
            name: nameRef.current,
            slug: slugRef.current,
            successMessage: successMessageRef.current,
            notifyEmail: notifyEmailRef.current || null,
            expectedUpdatedAt,
            fields: fieldsRef.current.map((field) => ({
              label: field.label,
              name: field.name,
              fieldType: field.fieldType,
              placeholder: field.placeholder || null,
              required: field.required,
              options: field.options
                .split(",")
                .map((part) => part.trim())
                .filter(Boolean),
            })),
          }),
        },
      );
      if (!data.form?.updatedAt) throw new Error("Unable to save form.");
      return { updatedAt: data.form.updatedAt, data };
    },
  });

  const pending = saveState === "saving" || saveState === "retrying";

  return (
    <div className="space-y-6">
      {canManage ? (
        <SaveBar
          state={saveState}
          onSave={() => void saveNow({ silent: false })}
          onReload={() => router.refresh()}
          label="Save form"
        />
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{form.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Embed with a form section using slug <code>{form.slug}</code>.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/website/${siteId}/forms`}
            className={`${authSecondaryButtonClassName} !w-auto px-3`}
          >
            All forms
          </Link>
          {canManage ? (
            <button
              type="button"
              className={`${authButtonClassName} !w-auto px-4`}
              onClick={() => void saveNow({ silent: false })}
              disabled={pending || saveState === "conflict"}
            >
              {pending ? "Saving…" : "Save form"}
            </button>
          ) : null}
        </div>
      </div>

      <InlineBanner message={error} tone="error" />
      <InlineBanner message={message} tone="success" />

      <div className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-6 sm:grid-cols-2">
        <div>
          <label className={authLabelClassName}>Name</label>
          <input
            className={authInputClassName}
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={!canManage || pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Slug</label>
          <input
            className={authInputClassName}
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            disabled={!canManage || pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Success message</label>
          <input
            className={authInputClassName}
            value={successMessage}
            onChange={(event) => setSuccessMessage(event.target.value)}
            disabled={!canManage || pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Notify email</label>
          <input
            className={authInputClassName}
            value={notifyEmail}
            onChange={(event) => setNotifyEmail(event.target.value)}
            disabled={!canManage || pending}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-900">Fields</h2>
          {canManage ? (
            <button
              type="button"
              className={`${authSecondaryButtonClassName} !w-auto px-3`}
              onClick={() =>
                setFields((current) => [
                  ...current,
                  {
                    key: crypto.randomUUID(),
                    label: "New field",
                    name: "new_field",
                    fieldType: "text",
                    placeholder: "",
                    required: false,
                    options: "",
                  },
                ])
              }
            >
              Add field
            </button>
          ) : null}
        </div>
        {fields.map((field) => (
          <div
            key={field.key}
            className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2"
          >
            <div>
              <label className={authLabelClassName}>Label</label>
              <input
                className={authInputClassName}
                value={field.label}
                onChange={(event) =>
                  setFields((current) =>
                    current.map((entry) =>
                      entry.key === field.key
                        ? { ...entry, label: event.target.value }
                        : entry,
                    ),
                  )
                }
                disabled={!canManage || pending}
              />
            </div>
            <div>
              <label className={authLabelClassName}>Name</label>
              <input
                className={authInputClassName}
                value={field.name}
                onChange={(event) =>
                  setFields((current) =>
                    current.map((entry) =>
                      entry.key === field.key
                        ? { ...entry, name: event.target.value }
                        : entry,
                    ),
                  )
                }
                disabled={!canManage || pending}
              />
            </div>
            <div>
              <label className={authLabelClassName}>Type</label>
              <select
                className={authInputClassName}
                value={field.fieldType}
                onChange={(event) =>
                  setFields((current) =>
                    current.map((entry) =>
                      entry.key === field.key
                        ? {
                            ...entry,
                            fieldType: event.target.value as FormFieldType,
                          }
                        : entry,
                    ),
                  )
                }
                disabled={!canManage || pending}
              >
                {FORM_FIELD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={authLabelClassName}>Placeholder</label>
              <input
                className={authInputClassName}
                value={field.placeholder}
                onChange={(event) =>
                  setFields((current) =>
                    current.map((entry) =>
                      entry.key === field.key
                        ? { ...entry, placeholder: event.target.value }
                        : entry,
                    ),
                  )
                }
                disabled={!canManage || pending}
              />
            </div>
            {field.fieldType === "select" ? (
              <div className="sm:col-span-2">
                <label className={authLabelClassName}>
                  Options (comma-separated)
                </label>
                <input
                  className={authInputClassName}
                  value={field.options}
                  onChange={(event) =>
                    setFields((current) =>
                      current.map((entry) =>
                        entry.key === field.key
                          ? { ...entry, options: event.target.value }
                          : entry,
                      ),
                    )
                  }
                  disabled={!canManage || pending}
                />
              </div>
            ) : null}
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(event) =>
                  setFields((current) =>
                    current.map((entry) =>
                      entry.key === field.key
                        ? { ...entry, required: event.target.checked }
                        : entry,
                    ),
                  )
                }
                disabled={!canManage || pending}
              />
              Required
            </label>
            {canManage ? (
              <button
                type="button"
                className="justify-self-start text-sm text-red-600"
                onClick={() =>
                  setFields((current) =>
                    current.filter((entry) => entry.key !== field.key),
                  )
                }
              >
                Remove field
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium text-zinc-900">
          Submissions ({submissions.length})
        </h2>
        {submissions.length === 0 ? (
          <EmptyState
            compact
            title="No submissions yet"
            description="Responses will appear here once visitors submit this form on your site."
          />
        ) : (
          submissions.map((submission) => (
            <div
              key={submission.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 text-sm"
            >
              <p className="text-xs text-zinc-400">
                {new Date(submission.createdAt).toLocaleString()}
              </p>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-zinc-700">
                {JSON.stringify(submission.payload, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
