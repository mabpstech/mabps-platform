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
import type { ChatbotBot } from "@/lib/chatbot/types";

export function BotsManager({
  bots,
  canManage,
}: {
  bots: ChatbotBot[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/chatbot/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, status: "active" }),
      });
      const data = (await response.json()) as {
        error?: string;
        bot?: ChatbotBot;
      };
      if (!response.ok) throw new Error(data.error || "Unable to create bot.");
      setName("");
      if (data.bot) router.push(`/chatbot/bots/${data.bot.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create bot.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Bots</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Configure assistants, prompts, providers, and lead/handoff behavior.
        </p>
      </div>

      {error ? <p className={authErrorClassName}>{error}</p> : null}

      <form
        onSubmit={create}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4"
      >
        <div className="min-w-[220px] flex-1">
          <label className={authLabelClassName}>Bot name</label>
          <input
            className={authInputClassName}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            disabled={pending}
            placeholder="Website assistant"
          />
        </div>
        <button
          type="submit"
          className={`${authButtonClassName} !w-auto px-4`}
          disabled={pending}
        >
          {pending ? "Creating…" : "Create bot"}
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Public key</th>
            </tr>
          </thead>
          <tbody>
            {bots.map((bot) => (
              <tr key={bot.id} className="border-b border-zinc-100">
                <td className="px-4 py-3">
                  <Link
                    href={`/chatbot/bots/${bot.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {bot.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {bot.provider}
                  {bot.model ? ` / ${bot.model}` : ""}
                </td>
                <td className="px-4 py-3 text-zinc-600">{bot.status}</td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                  {bot.publicKey.slice(0, 14)}…
                </td>
              </tr>
            ))}
            {!bots.length ? (
              <tr>
                <td className="px-4 py-8 text-zinc-500" colSpan={4}>
                  No bots yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {!canManage ? (
        <p className="text-xs text-zinc-400">
          Only owners and admins can delete bots.
        </p>
      ) : null}
    </div>
  );
}
