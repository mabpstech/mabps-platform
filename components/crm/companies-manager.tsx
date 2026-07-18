"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { SearchFilters } from "@/components/crm/search-filters";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth/styles";
import type { CrmCompany, CrmTag } from "@/lib/crm/types";

export function CompaniesManager({
  companies,
  tags,
  canManage,
}: {
  companies: CrmCompany[];
  tags: CrmTag[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/crm/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, domain }),
      });
      const data = (await response.json()) as {
        error?: string;
        company?: CrmCompany;
      };
      if (!response.ok) throw new Error(data.error || "Unable to create company.");
      setName("");
      setEmail("");
      setDomain("");
      if (data.company) router.push(`/crm/companies/${data.company.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create company.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Companies</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Organization accounts linked to contacts, customers, and deals.
        </p>
      </div>

      <Suspense fallback={null}>
        <SearchFilters
          extraFilters={[
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
        className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-4"
      >
        <div className="sm:col-span-1">
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
          <label className={authLabelClassName}>Email</label>
          <input
            className={authInputClassName}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Domain</label>
          <input
            className={authInputClassName}
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className={authButtonClassName}
            disabled={pending}
          >
            {pending ? "Creating…" : "Create company"}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Domain</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Industry</th>
              {canManage ? <th className="px-4 py-3 font-medium" /> : null}
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">
                  <Link
                    href={`/crm/companies/${company.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {company.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {company.domain || "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {company.email || "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {company.industry || "—"}
                </td>
                {canManage ? (
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="text-sm text-red-600 hover:underline"
                      onClick={async () => {
                        if (!window.confirm("Delete this company?")) return;
                        await fetch(`/api/crm/companies/${company.id}`, {
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
            {companies.length === 0 ? (
              <tr>
                <td
                  colSpan={canManage ? 5 : 4}
                  className="px-4 py-8 text-center text-zinc-500"
                >
                  No companies yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
