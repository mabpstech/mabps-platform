"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EntityTags } from "@/components/crm/entity-tags";
import { formatDate, formatMoney, personName } from "@/components/crm/format";
import { NotesPanel } from "@/components/crm/notes-panel";
import { CustomerTimeline } from "@/components/crm/timeline";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
  authSecondaryButtonClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";
import type {
  CrmCompany,
  CrmContact,
  CrmCustomer,
  CrmDeal,
  CrmLead,
  CrmNote,
  CrmPipelineStage,
  CrmTag,
  CrmTimelineEvent,
} from "@/lib/crm/types";

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className={authLabelClassName}>{label}</label>
      <input
        className={authInputClassName}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function CompanyDetail({
  company,
  notes,
  tags,
  allTags,
}: {
  company: CrmCompany;
  notes: CrmNote[];
  tags: CrmTag[];
  allTags: CrmTag[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: company.name,
    email: company.email || "",
    phone: company.phone || "",
    domain: company.domain || "",
    industry: company.industry || "",
    website: company.website || "",
    description: company.description || "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/crm/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save.");
      setSuccess("Company saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/crm/companies" className="text-sm text-zinc-500 hover:underline">
          ← Companies
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          {company.name}
        </h1>
      </div>
      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {success ? <p className={authSuccessClassName}>{success}</p> : null}
      <form
        onSubmit={save}
        className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-2"
      >
        <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label="Domain" value={form.domain} onChange={(v) => setForm({ ...form, domain: v })} />
        <Field label="Industry" value={form.industry} onChange={(v) => setForm({ ...form, industry: v })} />
        <Field label="Website" value={form.website} onChange={(v) => setForm({ ...form, website: v })} />
        <div className="sm:col-span-2">
          <label className={authLabelClassName}>Description</label>
          <textarea
            className={`${authInputClassName} min-h-24`}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <button type="submit" className={`${authButtonClassName} !w-auto px-4`} disabled={pending}>
          {pending ? "Saving…" : "Save company"}
        </button>
      </form>
      <EntityTags entityType="company" entityId={company.id} assigned={tags} allTags={allTags} />
      <NotesPanel entityType="company" entityId={company.id} notes={notes} />
    </div>
  );
}

export function ContactDetail({
  contact,
  notes,
  tags,
  allTags,
  companies,
}: {
  contact: CrmContact;
  notes: CrmNote[];
  tags: CrmTag[];
  allTags: CrmTag[];
  companies: CrmCompany[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email || "",
    phone: contact.phone || "",
    jobTitle: contact.jobTitle || "",
    companyId: contact.companyId || "",
    status: contact.status,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/crm/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          companyId: form.companyId || null,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/crm/contacts" className="text-sm text-zinc-500 hover:underline">
          ← Contacts
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          {personName(contact.firstName, contact.lastName)}
        </h1>
      </div>
      {error ? <p className={authErrorClassName}>{error}</p> : null}
      <form
        onSubmit={save}
        className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-2"
      >
        <Field label="First name" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
        <Field label="Last name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
        <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label="Job title" value={form.jobTitle} onChange={(v) => setForm({ ...form, jobTitle: v })} />
        <div>
          <label className={authLabelClassName}>Company</label>
          <select
            className={authInputClassName}
            value={form.companyId}
            onChange={(e) => setForm({ ...form, companyId: e.target.value })}
          >
            <option value="">None</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={authLabelClassName}>Status</label>
          <select
            className={authInputClassName}
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as "active" | "inactive" })
            }
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button type="submit" className={`${authButtonClassName} !w-auto px-4`} disabled={pending}>
          {pending ? "Saving…" : "Save contact"}
        </button>
      </form>
      <EntityTags entityType="contact" entityId={contact.id} assigned={tags} allTags={allTags} />
      <NotesPanel entityType="contact" entityId={contact.id} notes={notes} />
    </div>
  );
}

export function LeadDetail({
  lead,
  notes,
  tags,
  allTags,
}: {
  lead: CrmLead;
  notes: CrmNote[];
  tags: CrmTag[];
  allTags: CrmTag[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email || "",
    phone: lead.phone || "",
    companyName: lead.companyName || "",
    status: lead.status,
    source: lead.source,
    score: String(lead.score),
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/crm/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          score: Number(form.score || 0),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setPending(false);
    }
  }

  async function convert(createDeal: boolean) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/crm/leads/${lead.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ createDeal }),
      });
      const data = (await response.json()) as {
        error?: string;
        customer?: CrmCustomer;
      };
      if (!response.ok) throw new Error(data.error || "Unable to convert.");
      if (data.customer) router.push(`/crm/customers/${data.customer.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to convert.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/crm/leads" className="text-sm text-zinc-500 hover:underline">
            ← Leads
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
            {personName(lead.firstName, lead.lastName)}
          </h1>
        </div>
        {lead.status !== "converted" ? (
          <div className="flex gap-2">
            <button
              type="button"
              className={`${authSecondaryButtonClassName} !w-auto px-3`}
              disabled={pending}
              onClick={() => convert(false)}
            >
              Convert
            </button>
            <button
              type="button"
              className={`${authButtonClassName} !w-auto px-3`}
              disabled={pending}
              onClick={() => convert(true)}
            >
              Convert + deal
            </button>
          </div>
        ) : lead.convertedCustomerId ? (
          <Link
            href={`/crm/customers/${lead.convertedCustomerId}`}
            className="text-sm text-zinc-700 underline"
          >
            View customer
          </Link>
        ) : null}
      </div>
      {error ? <p className={authErrorClassName}>{error}</p> : null}
      <form
        onSubmit={save}
        className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-2"
      >
        <Field label="First name" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
        <Field label="Last name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
        <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label="Company" value={form.companyName} onChange={(v) => setForm({ ...form, companyName: v })} />
        <Field label="Score" value={form.score} onChange={(v) => setForm({ ...form, score: v })} type="number" />
        <div>
          <label className={authLabelClassName}>Status</label>
          <select
            className={authInputClassName}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as CrmLead["status"] })}
            disabled={lead.status === "converted"}
          >
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="unqualified">Unqualified</option>
            <option value="converted">Converted</option>
          </select>
        </div>
        <div>
          <label className={authLabelClassName}>Source</label>
          <select
            className={authInputClassName}
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value as CrmLead["source"] })}
          >
            <option value="manual">Manual</option>
            <option value="website">Website</option>
            <option value="referral">Referral</option>
            <option value="ads">Ads</option>
            <option value="import">Import</option>
            <option value="other">Other</option>
          </select>
        </div>
        <button type="submit" className={`${authButtonClassName} !w-auto px-4`} disabled={pending}>
          {pending ? "Saving…" : "Save lead"}
        </button>
      </form>
      <EntityTags entityType="lead" entityId={lead.id} assigned={tags} allTags={allTags} />
      <NotesPanel entityType="lead" entityId={lead.id} notes={notes} />
    </div>
  );
}

export function CustomerDetail({
  customer,
  notes,
  tags,
  allTags,
  timeline,
}: {
  customer: CrmCustomer;
  notes: CrmNote[];
  tags: CrmTag[];
  allTags: CrmTag[];
  timeline: CrmTimelineEvent[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    displayName: customer.displayName,
    email: customer.email || "",
    phone: customer.phone || "",
    status: customer.status,
    lifecycleStage: customer.lifecycleStage,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/crm/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/crm/customers" className="text-sm text-zinc-500 hover:underline">
          ← Customers
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          {customer.displayName}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Acquired {formatDate(customer.acquiredAt)}
        </p>
      </div>
      {error ? <p className={authErrorClassName}>{error}</p> : null}
      <form
        onSubmit={save}
        className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-2"
      >
        <Field label="Name" value={form.displayName} onChange={(v) => setForm({ ...form, displayName: v })} />
        <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <div>
          <label className={authLabelClassName}>Status</label>
          <select
            className={authInputClassName}
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as CrmCustomer["status"] })
            }
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="churned">Churned</option>
          </select>
        </div>
        <div>
          <label className={authLabelClassName}>Lifecycle</label>
          <select
            className={authInputClassName}
            value={form.lifecycleStage}
            onChange={(e) =>
              setForm({
                ...form,
                lifecycleStage: e.target.value as CrmCustomer["lifecycleStage"],
              })
            }
          >
            <option value="onboarding">Onboarding</option>
            <option value="customer">Customer</option>
            <option value="renewal">Renewal</option>
            <option value="at_risk">At risk</option>
            <option value="churned">Churned</option>
          </select>
        </div>
        <button type="submit" className={`${authButtonClassName} !w-auto px-4`} disabled={pending}>
          {pending ? "Saving…" : "Save customer"}
        </button>
      </form>
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-medium text-zinc-900">Timeline</h2>
        <div className="mt-4">
          <CustomerTimeline events={timeline} />
        </div>
      </section>
      <EntityTags entityType="customer" entityId={customer.id} assigned={tags} allTags={allTags} />
      <NotesPanel entityType="customer" entityId={customer.id} notes={notes} />
    </div>
  );
}

export function DealDetail({
  deal,
  notes,
  tags,
  allTags,
  stages,
  customers,
}: {
  deal: CrmDeal;
  notes: CrmNote[];
  tags: CrmTag[];
  allTags: CrmTag[];
  stages: CrmPipelineStage[];
  customers: CrmCustomer[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: deal.title,
    amount: String(deal.amountCents / 100),
    stageId: deal.stageId,
    customerId: deal.customerId || "",
    description: deal.description || "",
    expectedCloseDate: deal.expectedCloseDate?.slice(0, 10) || "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/crm/deals/${deal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          amountCents: Math.round(Number(form.amount || 0) * 100),
          stageId: form.stageId,
          customerId: form.customerId || null,
          description: form.description || null,
          expectedCloseDate: form.expectedCloseDate
            ? new Date(form.expectedCloseDate).toISOString()
            : null,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/crm/deals" className="text-sm text-zinc-500 hover:underline">
          ← Deals
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">{deal.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {formatMoney(deal.amountCents, deal.currency)} · {deal.status}
        </p>
      </div>
      {error ? <p className={authErrorClassName}>{error}</p> : null}
      <form
        onSubmit={save}
        className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-2"
      >
        <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <Field label="Amount (USD)" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} type="number" />
        <div>
          <label className={authLabelClassName}>Stage</label>
          <select
            className={authInputClassName}
            value={form.stageId}
            onChange={(e) => setForm({ ...form, stageId: e.target.value })}
          >
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={authLabelClassName}>Customer</label>
          <select
            className={authInputClassName}
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value })}
          >
            <option value="">None</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.displayName}
              </option>
            ))}
          </select>
        </div>
        <Field
          label="Expected close"
          value={form.expectedCloseDate}
          onChange={(v) => setForm({ ...form, expectedCloseDate: v })}
          type="date"
        />
        <div className="sm:col-span-2">
          <label className={authLabelClassName}>Description</label>
          <textarea
            className={`${authInputClassName} min-h-24`}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <button type="submit" className={`${authButtonClassName} !w-auto px-4`} disabled={pending}>
          {pending ? "Saving…" : "Save deal"}
        </button>
      </form>
      <EntityTags entityType="deal" entityId={deal.id} assigned={tags} allTags={allTags} />
      <NotesPanel entityType="deal" entityId={deal.id} notes={notes} />
    </div>
  );
}
