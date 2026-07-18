"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import {
  authButtonClassName,
  authInputClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";

export function SearchFilters({
  statuses,
  statusLabel = "Status",
  extraFilters,
}: {
  statuses?: Array<{ value: string; label: string }>;
  statusLabel?: string;
  extraFilters?: Array<{
    key: string;
    label: string;
    options: Array<{ value: string; label: string }>;
  }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [extras, setExtras] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const filter of extraFilters || []) {
      initial[filter.key] = searchParams.get(filter.key) || "";
    }
    return initial;
  });

  function apply(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    for (const [key, value] of Object.entries(extras)) {
      if (value) params.set(key, value);
    }
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `?${query}` : "?");
    });
  }

  function clear() {
    setQ("");
    setStatus("");
    const cleared: Record<string, string> = {};
    for (const filter of extraFilters || []) cleared[filter.key] = "";
    setExtras(cleared);
    startTransition(() => router.push("?"));
  }

  return (
    <form
      onSubmit={apply}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4"
    >
      <div className="min-w-[14rem] flex-1">
        <label className="mb-1.5 block text-sm font-medium text-zinc-700">
          Search
        </label>
        <input
          className={authInputClassName}
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search…"
          disabled={pending}
        />
      </div>
      {statuses?.length ? (
        <div className="min-w-[10rem]">
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            {statusLabel}
          </label>
          <select
            className={authInputClassName}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            disabled={pending}
          >
            <option value="">All</option>
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {(extraFilters || []).map((filter) => (
        <div key={filter.key} className="min-w-[10rem]">
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            {filter.label}
          </label>
          <select
            className={authInputClassName}
            value={extras[filter.key] || ""}
            onChange={(event) =>
              setExtras((current) => ({
                ...current,
                [filter.key]: event.target.value,
              }))
            }
            disabled={pending}
          >
            <option value="">All</option>
            {filter.options.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      ))}
      <button
        type="submit"
        className={`${authButtonClassName} !w-auto px-4`}
        disabled={pending}
      >
        {pending ? "Filtering…" : "Apply"}
      </button>
      <button
        type="button"
        className={`${authSecondaryButtonClassName} !w-auto px-4`}
        onClick={clear}
        disabled={pending}
      >
        Clear
      </button>
    </form>
  );
}
