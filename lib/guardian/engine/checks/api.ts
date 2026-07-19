import { DEFAULT_API_PROBE_TIMEOUT_MS } from "@/lib/guardian/defaults";
import type { GuardianCheckOutput } from "@/lib/guardian/types";

async function probe(url: string, timeoutMs: number) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "MABPS-Guardian/1.0" },
      cache: "no-store",
    });
    return {
      ok: response.ok || response.status === 401 || response.status === 403,
      status: response.status,
      latencyMs: Date.now() - started,
      error: null as string | null,
    };
  } catch (error) {
    return {
      ok: false,
      status: null as number | null,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : "Request failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function runApiChecks(
  _workspaceId: string,
): Promise<GuardianCheckOutput[]> {
  const base =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  const origin = base.replace(/\/$/, "");
  const endpoints = [
    { key: "api.app_root", title: "App root", path: "/" },
    { key: "api.auth_ok", title: "Auth session endpoint", path: "/api/auth/get-session" },
  ];

  const outputs: GuardianCheckOutput[] = [];

  for (const endpoint of endpoints) {
    const result = await probe(
      `${origin}${endpoint.path}`,
      DEFAULT_API_PROBE_TIMEOUT_MS,
    );
    outputs.push({
      category: "api",
      checkKey: endpoint.key,
      title: endpoint.title,
      status: result.ok ? "pass" : "fail",
      severity: result.ok ? "info" : "high",
      message: result.ok
        ? `Responded ${result.status} in ${result.latencyMs}ms.`
        : result.error || `Unhealthy response ${result.status ?? "n/a"}.`,
      latencyMs: result.latencyMs,
      details: {
        url: `${origin}${endpoint.path}`,
        httpStatus: result.status,
        error: result.error,
      },
      findings: result.ok
        ? undefined
        : [
            {
              code: `API_UNHEALTHY_${endpoint.key.toUpperCase().replace(/\./g, "_")}`,
              title: `${endpoint.title} is unhealthy`,
              description:
                result.error ||
                `Endpoint ${endpoint.path} returned ${result.status ?? "no status"}.`,
              severity: "high",
              evidence: {
                path: endpoint.path,
                status: result.status,
                error: result.error,
              },
              suggestion: "Verify the app is running and routes are deployed.",
              autoRepairable: false,
              repair: {
                action: "retry_health_check",
                title: `Retry probe for ${endpoint.path}`,
                description: "Re-run API health checks after confirming the server is up.",
                oneClick: true,
                riskLevel: "low",
                steps: [
                  "Confirm the Next.js server is running",
                  "Apply one-click retry",
                ],
                metadata: { path: endpoint.path },
              },
            },
          ],
    });
  }

  return outputs;
}
