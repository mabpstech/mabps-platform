import {
  createGuardianLog,
  createMonitorEvent,
  ensureWorkspaceGuardian,
  listFindings,
  listRepairs,
} from "@/lib/guardian/repository";
import type {
  GuardianFinding,
  GuardianTroubleshootResult,
} from "@/lib/guardian/types";

function ruleBasedTroubleshoot(
  findings: GuardianFinding[],
): Omit<GuardianTroubleshootResult, "aiUsed" | "rawAiResponse"> {
  const open = findings.filter((f) =>
    ["open", "acknowledged", "repairing", "failed"].includes(f.status),
  );
  const byCategory = new Map<string, number>();
  for (const finding of open) {
    byCategory.set(
      finding.category,
      (byCategory.get(finding.category) || 0) + 1,
    );
  }

  const topCategories = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, count]) => `${category} (${count})`);

  const likelyCauses: string[] = [];
  const recommendedActions: string[] = [];

  if (open.some((f) => f.code.startsWith("ENV_"))) {
    likelyCauses.push("Missing or weak environment configuration.");
    recommendedActions.push(
      "Set required env vars from .env.example and restart the app.",
    );
  }
  if (open.some((f) => f.category === "database")) {
    likelyCauses.push("Database connectivity, integrity, or pragma misconfiguration.");
    recommendedActions.push(
      "Apply one-click database repairs (foreign keys / vacuum) where available.",
    );
  }
  if (open.some((f) => f.category === "dependencies")) {
    likelyCauses.push("Incomplete node_modules installation.");
    recommendedActions.push("Run npm install and re-scan.");
  }
  if (open.some((f) => f.category === "deployment")) {
    likelyCauses.push("Deployment pipeline failures or down published URLs.");
    recommendedActions.push(
      "Inspect Deployment history/health and retry health probes.",
    );
  }
  if (open.some((f) => f.category === "security")) {
    likelyCauses.push("Insecure production auth/OAuth configuration.");
    recommendedActions.push(
      "Use HTTPS auth URL and complete OAuth credential pairs.",
    );
  }
  if (!likelyCauses.length) {
    likelyCauses.push(
      open.length
        ? "Mixed workspace health issues across modules."
        : "No open findings — system appears healthy.",
    );
  }
  if (!recommendedActions.length) {
    recommendedActions.push(
      open.length
        ? "Run a full Guardian scan and apply suggested one-click repairs."
        : "Keep monitoring enabled and schedule periodic scans.",
    );
  }

  const critical = open.filter((f) => f.severity === "critical").length;
  const high = open.filter((f) => f.severity === "high").length;
  const summary = open.length
    ? `Diagnosed ${open.length} open finding(s) (${critical} critical, ${high} high). Top areas: ${topCategories.join(", ") || "n/a"}.`
    : "No open findings. Workspace health looks good.";

  return {
    summary,
    likelyCauses,
    recommendedActions,
    relatedFindingIds: open.slice(0, 20).map((f) => f.id),
  };
}

async function maybeEnhanceWithAi(options: {
  workspaceId: string;
  base: Omit<GuardianTroubleshootResult, "aiUsed" | "rawAiResponse">;
  findings: GuardianFinding[];
  question?: string | null;
}): Promise<Pick<GuardianTroubleshootResult, "aiUsed" | "rawAiResponse"> & {
  summary?: string;
  likelyCauses?: string[];
  recommendedActions?: string[];
}> {
  const settings = ensureWorkspaceGuardian(options.workspaceId);
  if (!settings.aiTroubleshootingEnabled) {
    return { aiUsed: false, rawAiResponse: null };
  }

  try {
    const { resolveProviderCredential, ensureWorkspaceAi } = await import(
      "@/lib/ai/repository"
    );
    const { runAiChat, defaultModelForProvider } = await import(
      "@/lib/ai/providers"
    );
    const aiSettings = ensureWorkspaceAi(options.workspaceId);
    const credential = resolveProviderCredential(
      options.workspaceId,
      aiSettings.defaultProvider,
    );
    if (!credential) {
      return { aiUsed: false, rawAiResponse: null };
    }

    const prompt = [
      "You are MABPS AI Guardian, a production diagnostics assistant.",
      "Given findings JSON, return concise troubleshooting guidance.",
      "Respond with short paragraphs: Summary, Likely causes (bullets), Recommended actions (bullets).",
      options.question ? `Operator question: ${options.question}` : "",
      `Rule-based summary: ${options.base.summary}`,
      `Findings: ${JSON.stringify(
        options.findings.slice(0, 15).map((f) => ({
          code: f.code,
          title: f.title,
          severity: f.severity,
          category: f.category,
          suggestion: f.suggestion,
        })),
      )}`,
    ]
      .filter(Boolean)
      .join("\n");

    const result = await runAiChat(
      [
        {
          role: "system",
          content:
            "You diagnose MABPS platform issues. Be practical and specific. No markdown tables.",
        },
        { role: "user", content: prompt },
      ],
      {
        provider: aiSettings.defaultProvider,
        apiKey: credential.apiKey,
        baseUrl: credential.baseUrl,
        model:
          aiSettings.defaultModel ||
          credential.defaultModel ||
          defaultModelForProvider(aiSettings.defaultProvider),
        temperature: Math.min(aiSettings.temperature, 0.4),
      },
    );

    const text = result.content?.trim() || "";
    if (!text) return { aiUsed: false, rawAiResponse: null };

    const causes = [...text.matchAll(/[-*]\s+(.+)/g)].map((m) => m[1]).slice(0, 8);
    return {
      aiUsed: true,
      rawAiResponse: text,
      summary: text.split("\n").find((line) => line.trim()) || options.base.summary,
      likelyCauses: causes.length ? causes.slice(0, 4) : undefined,
      recommendedActions: causes.length ? causes.slice(4, 8) : undefined,
    };
  } catch {
    return { aiUsed: false, rawAiResponse: null };
  }
}

export async function troubleshootWorkspace(options: {
  workspaceId: string;
  findingIds?: string[];
  question?: string | null;
}): Promise<GuardianTroubleshootResult> {
  ensureWorkspaceGuardian(options.workspaceId);
  const findings = listFindings(options.workspaceId, { limit: 100 }).filter(
    (finding) =>
      !options.findingIds?.length ||
      options.findingIds.includes(finding.id),
  );
  const repairs = listRepairs(options.workspaceId, {
    status: "suggested",
    limit: 20,
  });

  const base = ruleBasedTroubleshoot(findings);
  if (repairs.length) {
    base.recommendedActions = [
      ...base.recommendedActions,
      `Review ${repairs.length} suggested one-click repair(s) in Guardian → Repairs.`,
    ];
  }

  const ai = await maybeEnhanceWithAi({
    workspaceId: options.workspaceId,
    base,
    findings,
    question: options.question,
  });

  const result: GuardianTroubleshootResult = {
    summary: ai.summary || base.summary,
    likelyCauses: ai.likelyCauses || base.likelyCauses,
    recommendedActions: ai.recommendedActions || base.recommendedActions,
    relatedFindingIds: base.relatedFindingIds,
    aiUsed: ai.aiUsed,
    rawAiResponse: ai.rawAiResponse,
  };

  createMonitorEvent(options.workspaceId, {
    type: "troubleshoot_completed",
    severity: "info",
    title: "Troubleshooting completed",
    message: result.summary,
    metadata: { aiUsed: result.aiUsed },
  });

  createGuardianLog(options.workspaceId, {
    operation: "troubleshoot.run",
    status: "success",
    requestSummary: options.question || "auto",
    responseSummary: result.summary,
    metadata: { aiUsed: result.aiUsed },
  });

  return result;
}
