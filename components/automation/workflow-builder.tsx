"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
  authSecondaryButtonClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";
import { TRIGGER_LABELS } from "@/lib/automation/defaults";
import type {
  ActionType,
  AutomationWorkflow,
  ConditionOperator,
  NodeKind,
  TriggerType,
  WorkflowNode,
  WorkflowStatus,
} from "@/lib/automation/types";
import {
  ACTION_TYPES,
  CONDITION_OPERATORS,
  TRIGGER_TYPES,
  WORKFLOW_STATUSES,
} from "@/lib/automation/types";

type DraftNode = WorkflowNode & { clientKey: string };

function toDraft(nodes: WorkflowNode[]): DraftNode[] {
  return nodes.map((node) => ({ ...node, clientKey: node.id }));
}

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

const KIND_LABELS: Record<NodeKind, string> = {
  trigger: "Trigger",
  condition: "Condition",
  action: "Action",
  delay: "Delay",
  wait: "Wait",
};

function defaultNode(kind: Exclude<NodeKind, "trigger">): DraftNode {
  const id = newId(kind);
  if (kind === "condition") {
    return {
      clientKey: id,
      id,
      name: "Condition",
      kind: "condition",
      type: "condition",
      config: { logic: "and", rules: [] },
    };
  }
  if (kind === "delay") {
    return {
      clientKey: id,
      id,
      name: "Delay",
      kind: "delay",
      type: "delay",
      config: { seconds: 60, minutes: 0, hours: 0 },
    };
  }
  if (kind === "wait") {
    return {
      clientKey: id,
      id,
      name: "Wait until",
      kind: "wait",
      type: "wait",
      config: { until: "{{vars.waitUntil}}" },
    };
  }
  return {
    clientKey: id,
    id,
    name: "Send email",
    kind: "action",
    type: "email.send",
    config: {
      to: "{{trigger.email}}",
      subject: "Hello from {{workflow.name}}",
      text: "Automation ran for {{trigger.firstName}}.",
      html: "<p>Automation ran for {{trigger.firstName}}.</p>",
    },
  };
}

export function WorkflowBuilder({
  workflow,
}: {
  workflow: AutomationWorkflow;
}) {
  const router = useRouter();
  const [name, setName] = useState(workflow.name);
  const [description, setDescription] = useState(workflow.description ?? "");
  const [status, setStatus] = useState<WorkflowStatus>(workflow.status);
  const [triggerType, setTriggerType] = useState<TriggerType>(
    workflow.triggerType,
  );
  const [cron, setCron] = useState(
    typeof workflow.triggerConfig.cron === "string"
      ? workflow.triggerConfig.cron
      : "0 * * * *",
  );
  const [nodes, setNodes] = useState(() => toDraft(workflow.definition));
  const [selectedId, setSelectedId] = useState<string | null>(
    workflow.definition[0]?.id ?? null,
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [addKind, setAddKind] = useState<Exclude<NodeKind, "trigger">>("action");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [runPayload, setRunPayload] = useState('{"email":"test@example.com","firstName":"Alex"}');

  const selected = useMemo(
    () => nodes.find((node) => node.clientKey === selectedId) ?? null,
    [nodes, selectedId],
  );

  function reorder(fromId: string, toId: string) {
    setNodes((current) => {
      const fromIndex = current.findIndex((item) => item.clientKey === fromId);
      const toIndex = current.findIndex((item) => item.clientKey === toId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return current;
      // Keep trigger first.
      if (current[fromIndex]?.kind === "trigger" || current[toIndex]?.kind === "trigger") {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function updateSelected(patch: Partial<DraftNode>) {
    if (!selected) return;
    setNodes((current) =>
      current.map((node) =>
        node.clientKey === selected.clientKey
          ? ({ ...node, ...patch } as DraftNode)
          : node,
      ),
    );
  }

  function updateSelectedConfig(key: string, value: unknown) {
    if (!selected) return;
    updateSelected({
      config: { ...selected.config, [key]: value },
    } as Partial<DraftNode>);
  }

  async function save() {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const definition = nodes.map(({ clientKey: _c, ...node }) => {
        if (node.kind === "trigger") {
          return { ...node, type: triggerType };
        }
        return node;
      });
      const triggerConfig =
        triggerType === "schedule"
          ? { cron, timezone: "UTC" }
          : workflow.triggerConfig;

      const response = await fetch(`/api/automation/workflows/${workflow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          status,
          triggerType,
          triggerConfig,
          definition,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        workflow?: AutomationWorkflow;
      };
      if (!response.ok) throw new Error(data.error || "Unable to save.");
      if (data.workflow) {
        setNodes(toDraft(data.workflow.definition));
        setStatus(data.workflow.status);
      }
      setMessage("Workflow saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setPending(false);
    }
  }

  async function runNow() {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(runPayload) as Record<string, unknown>;
      } catch {
        throw new Error("Run payload must be valid JSON.");
      }
      const response = await fetch(
        `/api/automation/workflows/${workflow.id}/run`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload }),
        },
      );
      const data = (await response.json()) as {
        error?: string;
        run?: { id: string };
      };
      if (!response.ok) throw new Error(data.error || "Unable to run.");
      setMessage(`Run queued: ${data.run?.id ?? ""}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            {workflow.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Visual builder — drag steps, edit Trigger → Condition → Action.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`${authSecondaryButtonClassName} !w-auto px-4`}
            onClick={runNow}
            disabled={pending}
          >
            Run now
          </button>
          <button
            type="button"
            className={`${authButtonClassName} !w-auto px-4`}
            onClick={save}
            disabled={pending}
          >
            {pending ? "Saving…" : "Save workflow"}
          </button>
        </div>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}
      {message ? <p className={authSuccessClassName}>{message}</p> : null}

      <div className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-4 lg:grid-cols-3">
        <div>
          <label className={authLabelClassName}>Name</label>
          <input
            className={authInputClassName}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className={authLabelClassName}>Status</label>
          <select
            className={authInputClassName}
            value={status}
            onChange={(e) => setStatus(e.target.value as WorkflowStatus)}
          >
            {WORKFLOW_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={authLabelClassName}>Trigger type</label>
          <select
            className={authInputClassName}
            value={triggerType}
            onChange={(e) => {
              const next = e.target.value as TriggerType;
              setTriggerType(next);
              setNodes((current) =>
                current.map((node) =>
                  node.kind === "trigger"
                    ? { ...node, type: next }
                    : node,
                ),
              );
            }}
          >
            {TRIGGER_TYPES.map((type) => (
              <option key={type} value={type}>
                {TRIGGER_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <div className="lg:col-span-3">
          <label className={authLabelClassName}>Description</label>
          <input
            className={authInputClassName}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {triggerType === "schedule" ? (
          <div className="lg:col-span-3">
            <label className={authLabelClassName}>
              Cron expression (UTC, 5 fields)
            </label>
            <input
              className={authInputClassName}
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              placeholder="0 * * * *"
            />
          </div>
        ) : null}
        {triggerType === "webhook" && workflow.webhookSecret ? (
          <div className="lg:col-span-3">
            <label className={authLabelClassName}>Webhook URL</label>
            <code className="block break-all rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
              /api/automation/public/webhook/{workflow.webhookSecret}
            </code>
          </div>
        ) : null}
        {triggerType === "api" && workflow.apiKey ? (
          <div className="lg:col-span-3">
            <label className={authLabelClassName}>API trigger URL</label>
            <code className="block break-all rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
              /api/automation/public/api/{workflow.apiKey}
            </code>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[160px]">
              <label className={authLabelClassName}>Add step</label>
              <select
                className={authInputClassName}
                value={addKind}
                onChange={(e) =>
                  setAddKind(e.target.value as Exclude<NodeKind, "trigger">)
                }
              >
                <option value="condition">Condition</option>
                <option value="action">Action</option>
                <option value="delay">Delay</option>
                <option value="wait">Wait</option>
              </select>
            </div>
            <button
              type="button"
              className={`${authSecondaryButtonClassName} !w-auto px-4`}
              onClick={() => {
                const node = defaultNode(addKind);
                setNodes((current) => [...current, node]);
                setSelectedId(node.clientKey);
              }}
            >
              Add node
            </button>
          </div>

          <ol className="space-y-2">
            {nodes.map((node, index) => (
              <li key={node.clientKey}>
                {index > 0 ? (
                  <div className="mx-4 h-4 w-px bg-zinc-300" aria-hidden />
                ) : null}
                <button
                  type="button"
                  draggable={node.kind !== "trigger"}
                  onDragStart={() => setDragId(node.clientKey)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragId) reorder(dragId, node.clientKey);
                    setDragId(null);
                  }}
                  onClick={() => setSelectedId(node.clientKey)}
                  className={`flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition ${
                    selectedId === node.clientKey
                      ? "border-zinc-900 bg-zinc-50"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <span className="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded bg-zinc-900 px-1.5 text-xs font-medium text-white">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium uppercase tracking-wide text-zinc-400">
                      {KIND_LABELS[node.kind]}
                      {node.kind === "action" || node.kind === "trigger"
                        ? ` · ${node.type}`
                        : ""}
                    </span>
                    <span className="block truncate text-sm font-medium text-zinc-900">
                      {node.name}
                    </span>
                  </span>
                  {node.kind !== "trigger" ? (
                    <span
                      role="button"
                      tabIndex={0}
                      className="text-xs text-red-600 hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNodes((current) =>
                          current.filter(
                            (item) => item.clientKey !== node.clientKey,
                          ),
                        );
                        if (selectedId === node.clientKey) {
                          setSelectedId(nodes[0]?.clientKey ?? null);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                        }
                      }}
                    >
                      Remove
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Node settings</h2>
          {!selected ? (
            <p className="text-sm text-zinc-500">Select a node to edit.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className={authLabelClassName}>Label</label>
                <input
                  className={authInputClassName}
                  value={selected.name}
                  onChange={(e) => updateSelected({ name: e.target.value })}
                />
              </div>

              {selected.kind === "action" ? (
                <>
                  <div>
                    <label className={authLabelClassName}>Action type</label>
                    <select
                      className={authInputClassName}
                      value={selected.type}
                      onChange={(e) =>
                        updateSelected({
                          type: e.target.value as ActionType,
                        })
                      }
                    >
                      {ACTION_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={authLabelClassName}>
                      Config (JSON) — supports {"{{templates}}"}
                    </label>
                    <textarea
                      className={`${authInputClassName} min-h-40 font-mono text-xs`}
                      value={JSON.stringify(selected.config, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value) as Record<
                            string,
                            unknown
                          >;
                          updateSelected({ config: parsed } as Partial<DraftNode>);
                          setError(null);
                        } catch {
                          /* allow typing invalid JSON temporarily */
                        }
                      }}
                    />
                  </div>
                </>
              ) : null}

              {selected.kind === "condition" ? (
                <>
                  <div>
                    <label className={authLabelClassName}>Logic</label>
                    <select
                      className={authInputClassName}
                      value={selected.config.logic}
                      onChange={(e) =>
                        updateSelectedConfig("logic", e.target.value)
                      }
                    >
                      <option value="and">AND</option>
                      <option value="or">OR</option>
                    </select>
                  </div>
                  <div>
                    <label className={authLabelClassName}>
                      Rules (JSON array)
                    </label>
                    <textarea
                      className={`${authInputClassName} min-h-32 font-mono text-xs`}
                      value={JSON.stringify(selected.config.rules ?? [], null, 2)}
                      onChange={(e) => {
                        try {
                          const rules = JSON.parse(e.target.value) as Array<{
                            path: string;
                            operator: ConditionOperator;
                            value?: unknown;
                          }>;
                          updateSelectedConfig("rules", rules);
                        } catch {
                          /* ignore while typing */
                        }
                      }}
                    />
                    <p className="mt-1 text-xs text-zinc-500">
                      Operators: {CONDITION_OPERATORS.join(", ")}. Paths use
                      trigger.*, vars.*, steps.*.
                    </p>
                  </div>
                </>
              ) : null}

              {selected.kind === "delay" ? (
                <div className="grid grid-cols-3 gap-2">
                  {(["hours", "minutes", "seconds"] as const).map((field) => (
                    <div key={field}>
                      <label className={authLabelClassName}>{field}</label>
                      <input
                        type="number"
                        min={0}
                        className={authInputClassName}
                        value={Number(selected.config[field] ?? 0)}
                        onChange={(e) =>
                          updateSelectedConfig(field, Number(e.target.value))
                        }
                      />
                    </div>
                  ))}
                </div>
              ) : null}

              {selected.kind === "wait" ? (
                <div>
                  <label className={authLabelClassName}>
                    Wait until (ISO or template)
                  </label>
                  <input
                    className={authInputClassName}
                    value={selected.config.until ?? ""}
                    onChange={(e) =>
                      updateSelectedConfig("until", e.target.value)
                    }
                  />
                </div>
              ) : null}

              {selected.kind === "trigger" ? (
                <p className="text-sm text-zinc-500">
                  Trigger is configured above. Payload arrives as{" "}
                  <code className="text-xs">{"{{trigger.*}}"}</code>.
                </p>
              ) : null}
            </div>
          )}

          <div className="border-t border-zinc-100 pt-3">
            <label className={authLabelClassName}>Manual run payload (JSON)</label>
            <textarea
              className={`${authInputClassName} min-h-24 font-mono text-xs`}
              value={runPayload}
              onChange={(e) => setRunPayload(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
