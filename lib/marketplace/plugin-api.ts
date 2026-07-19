import { executeInSandbox } from "@/lib/marketplace/engine/sandbox";
import { assertPermissions } from "@/lib/marketplace/engine/permissions";
import type {
  MarketplaceInstallWithListing,
  PluginApiResult,
  PluginPermission,
} from "@/lib/marketplace/types";

export type PluginApiRequest = {
  workspaceId: string;
  install: MarketplaceInstallWithListing;
  action: string;
  input?: Record<string, unknown>;
};

/**
 * Workspace Plugin API — the stable surface installed plugins call into.
 * All actions are permission-gated and executed inside the sandbox.
 */
export function invokePluginApi(request: PluginApiRequest): PluginApiResult {
  const { install, workspaceId, action, input } = request;

  if (!install.enabled || install.status !== "installed") {
    return {
      ok: false,
      error: "Plugin install is not enabled.",
    };
  }

  try {
    const required = actionPermissions(action);
    assertPermissions(install.grantedPermissions, required);

    const result = executeInSandbox({
      workspaceId,
      install,
      listing: install.listing,
      hook: mapActionToHook(action, install.listing.kind),
      input: {
        action,
        ...(input ?? {}),
      },
      permissions: install.grantedPermissions,
    });

    if (result.status !== "succeeded") {
      return {
        ok: false,
        error: result.errorMessage ?? `Plugin action failed (${result.status}).`,
        data: {
          status: result.status,
          logs: result.logs,
        },
      };
    }

    return {
      ok: true,
      data: {
        ...result.output,
        logs: result.logs,
        permissionsUsed: result.permissionsUsed,
        durationMs: result.durationMs,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Plugin API error.",
    };
  }
}

function actionPermissions(action: string): PluginPermission[] {
  switch (action) {
    case "crm.enrich_lead":
      return ["crm.read", "crm.write"];
    case "crm.read":
      return ["crm.read"];
    case "website.apply_theme":
    case "website.apply_template":
      return ["website.write"];
    case "ai.install_prompt":
      return ["ai.write"];
    case "automation.install_template":
      return ["automation.write"];
    case "chatbot.apply_template":
      return ["chatbot.write"];
    case "workspace.profile":
      return ["workspace.read"];
    case "ping":
      return [];
    default:
      return [];
  }
}

function mapActionToHook(
  action: string,
  kind: MarketplaceInstallWithListing["listing"]["kind"],
): string {
  switch (action) {
    case "crm.enrich_lead":
      return "crm.lead_created";
    case "website.apply_theme":
      return kind === "theme" ? "theme.apply" : "template.apply";
    case "website.apply_template":
      return "template.apply";
    case "ai.install_prompt":
      return "prompt.install";
    case "automation.install_template":
      return "automation.install";
    case "chatbot.apply_template":
      return "chatbot.template.apply";
    case "ping":
      return "on_install";
    default:
      return action;
  }
}
