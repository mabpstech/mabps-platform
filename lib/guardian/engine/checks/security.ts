import type { GuardianCheckOutput } from "@/lib/guardian/types";

export async function runSecurityChecks(
  _workspaceId: string,
): Promise<GuardianCheckOutput[]> {
  const outputs: GuardianCheckOutput[] = [];
  const nodeEnv = process.env.NODE_ENV || "development";
  const authUrl = process.env.BETTER_AUTH_URL || "";
  const isProd = nodeEnv === "production";

  outputs.push({
    category: "security",
    checkKey: "security.node_env",
    title: "NODE_ENV configuration",
    status: isProd || nodeEnv === "development" || nodeEnv === "test"
      ? "pass"
      : "warn",
    severity: "info",
    message: `NODE_ENV is "${nodeEnv}".`,
    details: { nodeEnv },
  });

  const insecureUrl =
    isProd &&
    (authUrl.includes("localhost") || authUrl.startsWith("http://"));
  outputs.push({
    category: "security",
    checkKey: "security.auth_url",
    title: "Auth URL security",
    status: insecureUrl ? "fail" : authUrl ? "pass" : "warn",
    severity: insecureUrl ? "high" : "info",
    message: !authUrl
      ? "BETTER_AUTH_URL is not set."
      : insecureUrl
        ? "Production BETTER_AUTH_URL uses localhost or plain HTTP."
        : "BETTER_AUTH_URL looks appropriate for the environment.",
    details: { authUrl: authUrl || null, isProd },
    findings: insecureUrl
      ? [
          {
            code: "SEC_INSECURE_AUTH_URL",
            title: "Insecure BETTER_AUTH_URL in production",
            description:
              "Production should use an HTTPS public URL, not localhost or HTTP.",
            severity: "high",
            suggestion: "Set BETTER_AUTH_URL to your HTTPS production origin.",
            autoRepairable: false,
            repair: {
              action: "review_security",
              title: "Update BETTER_AUTH_URL for production",
              description: "Point auth to the public HTTPS origin.",
              oneClick: false,
              riskLevel: "high",
              steps: [
                "Set BETTER_AUTH_URL=https://your-domain.com",
                "Redeploy / restart",
              ],
            },
          },
        ]
      : undefined,
  });

  const hasGoogle =
    Boolean(process.env.GOOGLE_CLIENT_ID) &&
    Boolean(process.env.GOOGLE_CLIENT_SECRET);
  const partialGoogle =
    Boolean(process.env.GOOGLE_CLIENT_ID) !==
    Boolean(process.env.GOOGLE_CLIENT_SECRET);
  outputs.push({
    category: "security",
    checkKey: "security.oauth_pair",
    title: "OAuth credential pairing",
    status: partialGoogle ? "fail" : "pass",
    severity: partialGoogle ? "medium" : "info",
    message: partialGoogle
      ? "Google OAuth client id/secret are only partially configured."
      : hasGoogle
        ? "Google OAuth credentials are paired."
        : "Google OAuth is not configured (optional).",
    findings: partialGoogle
      ? [
          {
            code: "SEC_OAUTH_PARTIAL",
            title: "Incomplete Google OAuth credentials",
            description:
              "Both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set together.",
            severity: "medium",
            suggestion: "Set both Google OAuth env vars or clear both.",
            autoRepairable: false,
          },
        ]
      : undefined,
  });

  return outputs;
}
