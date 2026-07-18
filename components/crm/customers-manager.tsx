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
import type { CrmCustomer, CrmTag } from "@/lib/crm/types";

export function CustomersManager({
  customers,
  tags,
  canManage,
}: {
  customers: CrmCustomer[];
  tags: CrmTag[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/crm/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, phone }),
      });
      const data = (await response.json()) as {
        error?: string;
        customer?: CrmCustomer;
      };
      if (!response.ok) {
        throw new Error(data.error || "Unable to create customer.");
      }
      setDisplayName("");
      setEmail("");
      setPhone("");
      if (data.customer) router.push(`/crm/customers/${data.customer.id}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create customer.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Customers</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Active customer records with timeline, notes, tags, and related deals.
        </p>
      </div>

      <Suspense fallback={null}>
        <SearchFilters
          statuses={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "churned", label: "Churned" },
          ]}
          extraFilters={[
            {
              key: "lifecycleStage",
              label: "Lifecycle",
              options: [
                { value: "onboarding", label: "Onboarding" },
                { value: "customer", label: "Customer" },
                { value: "renewal", label: "Renewal" },
                { value: "at_risk", label: "At risk" },
                { value: "churned", label: "Churned" },
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
        className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-4"
      >
        <div>
          <label className={authLabelClassName}>Name</label>
          <input
            className={authInputClassName}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
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
          <label className={authLabelClassName}>Phone</label>
          <input
            className={authInputClassName}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="flex items-end">
          <button type="submit" className={authButtonClassName} disabled={pending}>
            {pending ? "Creating…" : "Create customer"}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Lifecycle</th>
              {canManage ? <th className="px-4 py-3 font-medium" /> : null}
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">
                  <Link
                    href={`/crm/customers/${customer.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {customer.displayName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {customer.email || "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600">{customer.status}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {customer.lifecycleStage}
                </td>
                {canManage ? (
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="text-sm text-red-600 hover:underline"
                      onClick={async () => {
                        if (!window.confirm("Delete this customer?")) return;
                        await fetch(`/api/crm/customers/${customer.id}`, {
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
            {customers.length === 0 ? (
              <tr>
                <td
                  colSpan={canManage ? 5 : 4}
                  className="px-4 py-8 text-center text-zinc-500"
                >
                  No customers yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
