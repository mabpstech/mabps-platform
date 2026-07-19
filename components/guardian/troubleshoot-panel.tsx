"use client";

import { useState } from "react";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";
import type {
  GuardianFinding,
  GuardianTroubleshootResult,
} from "@/lib/guardian/types";

export function GuardianTroubleshootPanel({
  findings,
  canManage,
}: {
  findings: GuardianFinding[];
  canManage: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GuardianTroubleshootResult | null>(null);

  async function runTroubleshoot(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/guardian/troubleshoot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim() || null,
          findingIds: findings.slice(0, 20).map((f) => f.id),
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        result?: GuardianTroubleshootResult;
      };
      if (!response.ok || !data.result) {
        throw new Error(data.error || "Troubleshooting failed.");
      }
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Troubleshooting failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          AI troubleshooting
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Rule-based diagnosis with optional AI enhancement when workspace AI
          credentials are configured.
        </p>
      </div>

      <form onSubmit={runTroubleshoot} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <div>
          <label className={authLabelClassName} htmlFor="question">
            Question (optional)
          </label>
          <input
            id="question"
            className={authInputClassName}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Why are deployments failing after the last publish?"
            disabled={!canManage || pending}
          />
        </div>
        <p className="text-xs text-zinc-500">
          Using {findings.length} open finding(s) as context.
        </p>
        {canManage ? (
          <button
            type="submit"
            className={`${authButtonClassName} sm:w-auto`}
            disabled={pending}
          >
            {pending ? "Diagnosing…" : "Run troubleshooting"}
          </button>
        ) : (
          <p className="text-sm text-zinc-500">
            Only workspace owners and admins can run troubleshooting.
          </p>
        )}
      </form>

      {error ? <p className={authErrorClassName}>{error}</p> : null}

      {result ? (
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
          <p className={authSuccessClassName}>
            {result.aiUsed
              ? "AI-enhanced diagnosis ready."
              : "Rule-based diagnosis ready."}
          </p>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Summary</h2>
            <p className="mt-1 text-sm text-zinc-700">{result.summary}</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              Likely causes
            </h2>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-700">
              {result.likelyCauses.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              Recommended actions
            </h2>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-700">
              {result.recommendedActions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          {result.rawAiResponse ? (
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">
                AI response
              </h2>
              <pre className="mt-1 whitespace-pre-wrap rounded-md bg-zinc-50 p-3 text-xs text-zinc-700">
                {result.rawAiResponse}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
