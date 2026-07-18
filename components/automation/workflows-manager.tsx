"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth/styles";
import { TRIGGER_LABELS } from "@/lib/automation/defaults";
import type { AutomationWorkflow, TriggerType } from "@/lib/automation/types";
import { TRIGGER_TYPES } from "@/lib/automation/types";

export function WorkflowsManager({
  workflows,
}: {
  workflows: AutomationWorkflow[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>("manual");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const triggerConfig =
        triggerType === "schedule"
          ? { cron: "0 * * * *", timezone: "UTC" }
          : {};
      const response = await fetch("/api/automation/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          triggerType,
          triggerConfig,
          status: "draft",
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        workflow?: AutomationWorkflow;
      };
      if (!response.ok) {
        throw new Error(data.error || "Unable to create workflow.");
      }
      setName("");
      if (data.workflow) {
        router.push(`/automations/workflows/${data.workflow.id}`);
      }
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create workflow.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Workflows</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Build visual automations with triggers, conditions, delays, and
          actions.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}

      <form
        onSubmit={create}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4"
      >
        <div className="min-w-[220px] flex-1">
          <label className={authLabelClassName}>Workflow name</label>
          <input
            className={authInputClassName}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            disabled={pending}
            placeholder="Welcome new leads"
          />
        </div>
        <div className="min-w-[200px]">
          <label className={authLabelClassName}>Trigger</label>
          <select
            className={authInputClassName}
            value={triggerType}
            onChange={(event) =>
              setTriggerType(event.target.value as TriggerType)
            }
            disabled={pending}
          >
            {TRIGGER_TYPES.map((type) => (
              <option key={type} value={type}>
                {TRIGGER_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className={`${authButtonClassName} !w-auto px-4`}
          disabled={pending}
        >
          {pending ? "Creating…" : "Create workflow"}
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Trigger</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Steps</th>
              <th className="px-4 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {workflows.map((workflow) => (
              <tr key={workflow.id} className="border-b border-zinc-100">
                <td className="px-4 py-3">
                  <Link
                    href={`/automations/workflows/${workflow.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {workflow.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {TRIGGER_LABELS[workflow.triggerType]}
                </td>
                <td className="px-4 py-3 text-zinc-600">{workflow.status}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {workflow.definition.length}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {new Date(workflow.updatedAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {!workflows.length ? (
              <tr>
                <td className="px-4 py-8 text-zinc-500" colSpan={5}>
                  No workflows yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
