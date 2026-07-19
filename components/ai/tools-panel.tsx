"use client";

import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth/styles";
import type { AiToolDefinition, AiToolResult } from "@/lib/ai/types";

export function ToolsPanel({
  tools,
  toolsEnabled,
}: {
  tools: AiToolDefinition[];
  toolsEnabled: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState(tools[0]?.name || "");
  const [argsJson, setArgsJson] = useState("{}");
  const [result, setResult] = useState<AiToolResult | null>(null);

  async function run(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setResult(null);
    try {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(argsJson) as Record<string, unknown>;
      } catch {
        throw new Error("Arguments must be valid JSON.");
      }
      const response = await fetch("/api/ai/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selected, arguments: args }),
      });
      const data = (await response.json()) as {
        error?: string;
        result?: AiToolResult;
      };
      if (!response.ok) throw new Error(data.error || "Tool execution failed.");
      setResult(data.result || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tool execution failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">AI tools</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Actions the assistant can call across CRM, knowledge, memory,
          chatbot, automation, website, analytics, and billing.
        </p>
      </div>

      {!toolsEnabled ? (
        <p className={authErrorClassName}>
          Tools are disabled in AI settings.
        </p>
      ) : null}
      {error ? <p className={authErrorClassName}>{error}</p> : null}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {tools.map((tool) => (
              <tr key={tool.name} className="border-b border-zinc-100">
                <td className="px-4 py-3 font-mono text-xs">{tool.name}</td>
                <td className="px-4 py-3 text-zinc-600">{tool.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form
        onSubmit={run}
        className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4"
      >
        <h2 className="text-sm font-semibold text-zinc-900">Run tool</h2>
        <div>
          <label className={authLabelClassName}>Tool</label>
          <select
            className={authInputClassName}
            value={selected}
            disabled={pending || !toolsEnabled}
            onChange={(event) => setSelected(event.target.value)}
          >
            {tools.map((tool) => (
              <option key={tool.name} value={tool.name}>
                {tool.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={authLabelClassName}>Arguments (JSON)</label>
          <textarea
            className={`${authInputClassName} min-h-28 font-mono text-xs`}
            value={argsJson}
            disabled={pending || !toolsEnabled}
            onChange={(event) => setArgsJson(event.target.value)}
          />
        </div>
        <button
          type="submit"
          className={`${authButtonClassName} !w-auto px-4`}
          disabled={pending || !toolsEnabled}
        >
          {pending ? "Running…" : "Execute"}
        </button>
        {result ? (
          <pre className="overflow-x-auto rounded-md bg-zinc-50 p-3 text-xs text-zinc-700">
            {JSON.stringify(result, null, 2)}
          </pre>
        ) : null}
      </form>
    </div>
  );
}
