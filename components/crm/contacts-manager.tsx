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
import type { CrmCompany, CrmContact, CrmTag } from "@/lib/crm/types";

export function ContactsManager({
  contacts,
  companies,
  tags,
  canManage,
}: {
  contacts: CrmContact[];
  companies: CrmCompany[];
  tags: CrmTag[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const companyMap = new Map(companies.map((c) => [c.id, c.name]));

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          companyId: companyId || null,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        contact?: CrmContact;
      };
      if (!response.ok) throw new Error(data.error || "Unable to create contact.");
      setFirstName("");
      setLastName("");
      setEmail("");
      setCompanyId("");
      if (data.contact) router.push(`/crm/contacts/${data.contact.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create contact.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Contacts</h1>
        <p className="mt-1 text-sm text-zinc-500">
          People associated with companies, leads, and customers.
        </p>
      </div>

      <Suspense fallback={null}>
        <SearchFilters
          statuses={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
          extraFilters={[
            {
              key: "companyId",
              label: "Company",
              options: companies.map((c) => ({ value: c.id, label: c.name })),
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
          <select
            className={authInputClassName}
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            disabled={pending}
          >
            <option value="">None</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className={authButtonClassName} disabled={pending}>
            {pending ? "Creating…" : "Create contact"}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canManage ? <th className="px-4 py-3 font-medium" /> : null}
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr key={contact.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">
                  <Link
                    href={`/crm/contacts/${contact.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {personName(contact.firstName, contact.lastName)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {contact.email || "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {contact.companyId
                    ? companyMap.get(contact.companyId) || "—"
                    : "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600">{contact.status}</td>
                {canManage ? (
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="text-sm text-red-600 hover:underline"
                      onClick={async () => {
                        if (!window.confirm("Delete this contact?")) return;
                        await fetch(`/api/crm/contacts/${contact.id}`, {
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
            {contacts.length === 0 ? (
              <tr>
                <td
                  colSpan={canManage ? 5 : 4}
                  className="px-4 py-8 text-center text-zinc-500"
                >
                  No contacts yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
