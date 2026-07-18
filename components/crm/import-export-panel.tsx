"use client";

import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
  authSecondaryButtonClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";
import type { CrmExportEntity } from "@/lib/crm/types";

const ENTITIES: Array<{ value: CrmExportEntity; label: string }> = [
  { value: "companies", label: "Companies" },
  { value: "contacts", label: "Contacts" },
  { value: "leads", label: "Leads" },
  { value: "customers", label: "Customers" },
  { value: "deals", label: "Deals" },
];

export function ImportExportPanel({ canImport }: { canImport: boolean }) {
  const [entity, setEntity] = useState<CrmExportEntity>("contacts");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function exportCsv() {
    setError(null);
    setSuccess(null);
    const response = await fetch(`/api/crm/export?entity=${entity}`);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error || "Export failed.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `crm-${entity}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setSuccess(`Exported ${entity}.`);
  }

  async function importCsv(event: React.FormEvent) {
    event.preventDefault();
    if (!canImport) return;
    if (!file) {
      setError("Choose a CSV file to import.");
      return;
    }
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const form = new FormData();
      form.set("entity", entity);
      form.set("file", file);
      const response = await fetch("/api/crm/import", {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as {
        error?: string;
        imported?: number;
        errors?: string[];
      };
      if (!response.ok) throw new Error(data.error || "Import failed.");
      const failureNote =
        data.errors && data.errors.length
          ? ` ${data.errors.length} row error(s).`
          : "";
      setSuccess(`Imported ${data.imported ?? 0} row(s).${failureNote}`);
      if (data.errors?.length) {
        setError(data.errors.slice(0, 5).join(" · "));
      }
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Import / Export</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Move CRM records in and out as CSV. Import is limited to workspace
          owners and admins.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
        <div>
          <label className={authLabelClassName}>Entity</label>
          <select
            className={authInputClassName}
            value={entity}
            onChange={(e) => setEntity(e.target.value as CrmExportEntity)}
          >
            {ENTITIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={`${authSecondaryButtonClassName} !w-auto px-4`}
            onClick={exportCsv}
          >
            Export CSV
          </button>
        </div>
      </section>

      {canImport ? (
        <form
          onSubmit={importCsv}
          className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5"
        >
          <div>
            <label className={authLabelClassName}>CSV file</label>
            <input
              className={authInputClassName}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={pending}
            />
          </div>
          <button
            type="submit"
            className={`${authButtonClassName} !w-auto px-4`}
            disabled={pending}
          >
            {pending ? "Importing…" : "Import CSV"}
          </button>
          <p className="text-xs text-zinc-500">
            Expected headers vary by entity. Contacts use firstName, lastName,
            email, phone, jobTitle, status, companyId.
          </p>
        </form>
      ) : (
        <p className="text-sm text-zinc-500">
          Ask a workspace owner or admin to import CSV data.
        </p>
      )}
    </div>
  );
}
