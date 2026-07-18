"use client";

import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { formatDateTime } from "@/components/crm/format";
import { SearchFilters } from "@/components/crm/search-filters";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth/styles";
import type { CrmActivity, CrmCustomer } from "@/lib/crm/types";

export function ActivitiesManager({
  activities,
  customers,
  canManage,
}: {
  activities: CrmActivity[];
  customers: CrmCustomer[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(customers[0]?.id || "");
  const [type, setType] = useState("call");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!customerId) {
      setError("Create a customer before logging activities.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/crm/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "customer",
          entityId: customerId,
          type,
          subject,
          body,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to log activity.");
      }
      setSubject("");
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to log activity.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Activities</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Calls, emails, meetings, and other interactions logged against customers.
        </p>
      </div>

      <Suspense fallback={null}>
        <SearchFilters
          extraFilters={[
            {
              key: "type",
              label: "Type",
              options: [
                { value: "call", label: "Call" },
                { value: "email", label: "Email" },
                { value: "meeting", label: "Meeting" },
                { value: "message", label: "Message" },
                { value: "other", label: "Other" },
              ],
            },
          ]}
        />
      </Suspense>

      {error ? <p className={authErrorClassName}>{error}</p> : null}

      <form
        onSubmit={create}
        className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2"
      >
        <div>
          <label className={authLabelClassName}>Customer</label>
          <select
            className={authInputClassName}
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            disabled={pending}
          >
            {customers.length === 0 ? (
              <option value="">No customers</option>
            ) : (
              customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.displayName}
                </option>
              ))
            )}
          </select>
        </div>
        <div>
          <label className={authLabelClassName}>Type</label>
          <select
            className={authInputClassName}
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={pending}
          >
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
            <option value="message">Message</option>
            <option value="other">Other</option>
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
          <label className={authLabelClassName}>Details</label>
          <textarea
            className={`${authInputClassName} min-h-20`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={pending}
          />
        </div>
        <div>
          <button type="submit" className={authButtonClassName} disabled={pending}>
            {pending ? "Saving…" : "Log activity"}
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {activities.map((activity) => (
          <article
            key={activity.id}
            className="rounded-xl border border-zinc-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-zinc-900">{activity.subject}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {activity.type} · {formatDateTime(activity.occurredAt)}
                </p>
                {activity.body ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                    {activity.body}
                  </p>
                ) : null}
              </div>
              {canManage ? (
                <button
                  type="button"
                  className="text-sm text-red-600 hover:underline"
                  onClick={async () => {
                    if (!window.confirm("Delete this activity?")) return;
                    await fetch(`/api/crm/activities/${activity.id}`, {
                      method: "DELETE",
                    });
                    router.refresh();
                  }}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </article>
        ))}
        {activities.length === 0 ? (
          <p className="text-sm text-zinc-500">No activities yet.</p>
        ) : null}
      </div>
    </div>
  );
}
