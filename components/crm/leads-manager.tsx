"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { personName } from "@/components/crm/format";
import { SearchFilters } from "@/components/crm/search-filters";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth/styles";
import type { CrmLead, CrmTag } from "@/lib/crm/types";

export function LeadsManager({
  leads,
  tags,
  canManage,
}: {
  leads: CrmLead[];
  tags: CrmTag[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, companyName }),
      });
      const data = (await response.json()) as {
        error?: string;
        lead?: CrmLead;
      };
      if (!response.ok) throw new Error(data.error || "Unable to create lead.");
      setFirstName("");
      setLastName("");
      setEmail("");
      setCompanyName("");
      if (data.lead) router.push(`/crm/leads/${data.lead.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create lead.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Leads</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Capture inbound and outbound prospects, then convert them to customers.
        </p>
      </div>

      <Suspense fallback={null}>
        <SearchFilters
          statuses={[
            { value: "new", label: "New" },
            { value: "contacted", label: "Contacted" },
            { value: "qualified", label: "Qualified" },
            { value: "unqualified", label: "Unqualified" },
            { value: "converted", label: "Converted" },
          ]}
          extraFilters={[
            {
              key: "source",
              label: "Source",
              options: [
                { value: "manual", label: "Manual" },
                { value: "website", label: "Website" },
                { value: "referral", label: "Referral" },
                { value: "ads", label: "Ads" },
                { value: "import", label: "Import" },
                { value: "other", label: "Other" },
              ],
            },
            {
              key: "tagId",
              label: "Tag",
              options: tags.map((tag) => ({ value: tag.id, label: tag.name })),
            },
          ]}
        />
      </Suspense>

      {error ? <p className={authErrorClassName}>{error}</p> : null}

      <form
        onSubmit={create}
        className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-5"
      >
        <div>
          <label className={authLabelClassName}>First name</label>
          <input
            className={authInputClassName}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            disabled={pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Last name</label>
          <input
            className={authInputClassName}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Email</label>
          <input
            className={authInputClassName}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Company</label>
          <input
            className={authInputClassName}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="flex items-end">
          <button type="submit" className={authButtonClassName} disabled={pending}>
            {pending ? "Creating…" : "Create lead"}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Score</th>
              {canManage ? <th className="px-4 py-3 font-medium" /> : null}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">
                  <Link
                    href={`/crm/leads/${lead.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {personName(lead.firstName, lead.lastName)}
                  </Link>
                  <p className="text-xs text-zinc-500">{lead.email || "—"}</p>
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {lead.companyName || "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600">{lead.status}</td>
                <td className="px-4 py-3 text-zinc-600">{lead.source}</td>
                <td className="px-4 py-3 text-zinc-600">{lead.score}</td>
                {canManage ? (
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="text-sm text-red-600 hover:underline"
                      onClick={async () => {
                        if (!window.confirm("Delete this lead?")) return;
                        await fetch(`/api/crm/leads/${lead.id}`, {
                          method: "DELETE",
                        });
                        router.refresh();
                      }}
                    >
                      Delete
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
            {leads.length === 0 ? (
              <tr>
                <td
                  colSpan={canManage ? 6 : 5}
                  className="px-4 py-8 text-center text-zinc-500"
                >
                  No leads yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
