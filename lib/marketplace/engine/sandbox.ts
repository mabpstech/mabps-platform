import { assertPermissions } from "@/lib/marketplace/engine/permissions";
import type {
  MarketplaceInstall,
  MarketplaceListing,
  PluginApiContext,
  PluginManifest,
  PluginPermission,
  SandboxRunStatus,
} from "@/lib/marketplace/types";

export type SandboxExecutionInput = {
  workspaceId: string;
  install: MarketplaceInstall | null;
  listing: MarketplaceListing;
  hook: string;
  input?: Record<string, unknown>;
  /** Override permissions (defaults to install grants or listing permissions). */
  permissions?: PluginPermission[];
};

export type SandboxExecutionResult = {
  status: SandboxRunStatus;
  output: Record<string, unknown>;
  logs: string[];
  permissionsUsed: PluginPermission[];
  errorMessage: string | null;
  durationMs: number;
};

const DEFAULT_TIMEOUT_MS = 2_000;
const DEFAULT_MAX_OUTPUT_BYTES = 64_000;

/**
 * Secure sandbox executor for marketplace plugins.
 *
 * Design notes:
 * - No arbitrary JS eval / dynamic import of untrusted packages.
 * - Only known hooks from the listing manifest may run.
 * - Permission checks gate side-effect style operations.
 * - Network is denied unless the listing manifest allows it AND permission is granted.
 * - Output size and wall-clock timeout are enforced.
 */
export function executeInSandbox(
  input: SandboxExecutionInput,
): SandboxExecutionResult {
  const started = Date.now();
  const logs: string[] = [];
  const permissions =
    input.permissions ??
    input.install?.grantedPermissions ??
    input.listing.permissions;
  const manifest = resolveManifest(input.listing, input.install);
  const timeoutMs = manifest.sandbox?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxOutputBytes =
    manifest.sandbox?.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  const permissionsUsed: PluginPermission[] = [];

  try {
    if (!manifest.hooks.includes(input.hook)) {
      return finish("denied", {
        output: {},
        logs: [`Hook "${input.hook}" is not declared in the plugin manifest.`],
        permissionsUsed,
        errorMessage: `Hook "${input.hook}" is not allowed for this plugin.`,
        started,
      });
    }

    if (input.install && !input.install.enabled) {
      return finish("denied", {
        output: {},
        logs: ["Install is disabled."],
        permissionsUsed,
        errorMessage: "Plugin is disabled for this workspace.",
        started,
      });
    }

    const required = requiredPermissionsForHook(input.hook, manifest);
    assertPermissions(permissions, required);
    permissionsUsed.push(...required);

    const ctx: PluginApiContext = {
      workspaceId: input.workspaceId,
      installId: input.install?.id ?? "",
      listingId: input.listing.id,
      permissions,
      config: input.install?.config ?? {},
    };

    const deadline = started + timeoutMs;
    const output = runDeclaredHook({
      hook: input.hook,
      listing: input.listing,
      ctx,
      payload: input.input ?? {},
      logs,
      allowNetwork: Boolean(
        manifest.sandbox?.allowNetwork && permissions.includes("http.outbound"),
      ),
      permissionsUsed,
      deadline,
    });

    if (Date.now() > deadline) {
      return finish("timed_out", {
        output: {},
        logs: [...logs, "Sandbox execution exceeded timeout."],
        permissionsUsed,
        errorMessage: `Sandbox timed out after ${timeoutMs}ms.`,
        started,
      });
    }

    const serialized = JSON.stringify(output);
    if (Buffer.byteLength(serialized, "utf8") > maxOutputBytes) {
      return finish("failed", {
        output: {},
        logs: [...logs, "Sandbox output exceeded maxOutputBytes."],
        permissionsUsed,
        errorMessage: "Sandbox output too large.",
        started,
      });
    }

    logs.push(`Hook "${input.hook}" completed successfully.`);
    return finish("succeeded", {
      output,
      logs,
      permissionsUsed,
      errorMessage: null,
      started,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Sandbox execution failed.";
    const status: SandboxRunStatus = message.includes("permission")
      ? "denied"
      : "failed";
    logs.push(message);
    return finish(status, {
      output: {},
      logs,
      permissionsUsed,
      errorMessage: message,
      started,
    });
  }
}

function finish(
  status: SandboxRunStatus,
  args: {
    output: Record<string, unknown>;
    logs: string[];
    permissionsUsed: PluginPermission[];
    errorMessage: string | null;
    started: number;
  },
): SandboxExecutionResult {
  return {
    status,
    output: args.output,
    logs: args.logs,
    permissionsUsed: [...new Set(args.permissionsUsed)],
    errorMessage: args.errorMessage,
    durationMs: Math.max(0, Date.now() - args.started),
  };
}

function resolveManifest(
  listing: MarketplaceListing,
  install: MarketplaceInstall | null,
): PluginManifest {
  if (install) {
    return listing.manifest;
  }
  return listing.manifest;
}

function requiredPermissionsForHook(
  hook: string,
  manifest: PluginManifest,
): PluginPermission[] {
  if (hook.startsWith("crm.")) {
    return intersectKnown(manifest.permissions, ["crm.read", "crm.write"]);
  }
  if (hook.startsWith("website.") || hook.startsWith("theme.") || hook.startsWith("template.")) {
    return intersectKnown(manifest.permissions, [
      "website.read",
      "website.write",
    ]);
  }
  if (hook.startsWith("automation.")) {
    return intersectKnown(manifest.permissions, [
      "automation.read",
      "automation.write",
    ]);
  }
  if (hook.startsWith("prompt.") || hook.startsWith("ai.")) {
    return intersectKnown(manifest.permissions, ["ai.read", "ai.write"]);
  }
  if (hook.startsWith("chatbot.")) {
    return intersectKnown(manifest.permissions, [
      "chatbot.read",
      "chatbot.write",
    ]);
  }
  if (hook === "on_install" || hook === "on_uninstall") {
    return [];
  }
  return [];
}

function intersectKnown(
  available: readonly PluginPermission[],
  candidates: readonly PluginPermission[],
): PluginPermission[] {
  return candidates.filter((permission) => available.includes(permission));
}

function runDeclaredHook(args: {
  hook: string;
  listing: MarketplaceListing;
  ctx: PluginApiContext;
  payload: Record<string, unknown>;
  logs: string[];
  allowNetwork: boolean;
  permissionsUsed: PluginPermission[];
  deadline: number;
}): Record<string, unknown> {
  const { hook, listing, ctx, payload, logs, allowNetwork } = args;

  // Deterministic, side-effect-free handlers. Real I/O goes through Plugin API
  // with explicit permission checks — never through eval'd third-party code.
  switch (listing.kind) {
    case "plugin":
      return runPluginHook(hook, listing, ctx, payload, logs, allowNetwork);
    case "theme":
      return {
        applied: true,
        theme: listing.slug,
        tokens: listing.metadata.tokens ?? {
          background: listing.slug === "midnight-theme" ? "#0b0f14" : "#ffffff",
          accent: listing.slug === "midnight-theme" ? "#5eead4" : "#0f766e",
        },
      };
    case "website_template":
      return {
        applied: true,
        template: listing.slug,
        sections: listing.metadata.sections ?? [
          "hero",
          "features",
          "pricing",
          "faq",
          "contact",
        ],
      };
    case "ai_prompt":
      return {
        installed: true,
        promptId: listing.slug,
        prompt: listing.metadata.prompt ?? listing.description,
      };
    case "automation_template":
      return {
        installed: true,
        workflowDraft: listing.metadata.workflow ?? {
          name: listing.name,
          triggerType: "crm.lead_created",
        },
      };
    case "crm_template":
      return {
        applied: true,
        template: listing.slug,
        stages: listing.metadata.stages ?? [
          "Prospect",
          "Qualified",
          "Proposal",
          "Negotiation",
          "Won",
          "Lost",
        ],
      };
    case "chatbot_template":
      return {
        applied: true,
        template: listing.slug,
        persona: listing.metadata.persona ?? listing.name,
      };
    default:
      throw new Error(`Unsupported listing kind for sandbox: ${listing.kind}`);
  }
}

function runPluginHook(
  hook: string,
  listing: MarketplaceListing,
  ctx: PluginApiContext,
  payload: Record<string, unknown>,
  logs: string[],
  allowNetwork: boolean,
): Record<string, unknown> {
  logs.push(`Running plugin hook "${hook}" for ${listing.slug}.`);

  if (hook === "on_install") {
    return {
      ok: true,
      message: `${listing.name} installed for workspace ${ctx.workspaceId}.`,
      configKeys: Object.keys(ctx.config),
    };
  }

  if (hook === "on_uninstall") {
    return {
      ok: true,
      message: `${listing.name} uninstalled.`,
    };
  }

  if (hook === "crm.lead_created") {
    const leadId =
      typeof payload.leadId === "string" ? payload.leadId : "unknown";
    return {
      enriched: true,
      leadId,
      fields: {
        companySize: "11-50",
        industry: "software",
        source: listing.slug,
      },
    };
  }

  if (hook === "crm.deal_stage_changed") {
    if (!allowNetwork) {
      throw new Error(
        "Outbound HTTP is not allowed for this plugin sandbox configuration.",
      );
    }
    const webhookUrl =
      typeof ctx.config.webhookUrl === "string" ? ctx.config.webhookUrl : null;
    if (!webhookUrl) {
      logs.push("No webhookUrl configured; simulated dry-run notification.");
      return {
        notified: false,
        dryRun: true,
        dealId: payload.dealId ?? null,
        stage: payload.stage ?? null,
      };
    }
    // Intentionally do not perform real network I/O in-process.
    // Plugin API / workers own outbound HTTP with allowlists.
    logs.push("Queued outbound notification (sandbox dry-run).");
    return {
      notified: true,
      dryRun: true,
      destinationHost: safeHost(webhookUrl),
      dealId: payload.dealId ?? null,
      stage: payload.stage ?? null,
    };
  }

  return {
    ok: true,
    hook,
    echo: payload,
  };
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}
