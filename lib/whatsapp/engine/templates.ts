import { fetchMessageTemplates } from "@/lib/whatsapp/cloud/client";
import {
  createWhatsAppLog,
  listTemplates,
  requireConnectedCredentials,
  upsertTemplate,
} from "@/lib/whatsapp/repository";
import type { WhatsAppTemplate, WhatsAppTemplateStatus } from "@/lib/whatsapp/types";

function extractBody(components: unknown[]): string | null {
  for (const component of components) {
    if (!component || typeof component !== "object") continue;
    const row = component as Record<string, unknown>;
    if (row.type === "BODY" && typeof row.text === "string") return row.text;
  }
  return null;
}

function mapStatus(value: unknown): WhatsAppTemplateStatus {
  const status = String(value || "PENDING").toUpperCase();
  if (
    status === "APPROVED" ||
    status === "REJECTED" ||
    status === "PAUSED" ||
    status === "DISABLED" ||
    status === "PENDING"
  ) {
    return status;
  }
  return "PENDING";
}

/**
 * Pull message templates from Meta WABA and upsert into workspace storage.
 */
export async function syncWhatsAppTemplates(
  workspaceId: string,
): Promise<{ synced: number; templates: WhatsAppTemplate[] }> {
  const credentials = requireConnectedCredentials(workspaceId);
  const result = await fetchMessageTemplates({
    phoneNumberId: credentials.phoneNumberId,
    accessToken: credentials.accessToken,
    wabaId: credentials.wabaId,
    apiVersion: credentials.apiVersion,
  });

  if (!result.ok) {
    createWhatsAppLog({
      workspaceId,
      operation: "template_sync",
      status: "error",
      errorMessage: result.error || "Template sync failed.",
    });
    throw new Error(result.error || "Template sync failed.");
  }

  let synced = 0;
  for (const row of result.templates) {
    const name = typeof row.name === "string" ? row.name : null;
    if (!name) continue;
    const components = Array.isArray(row.components)
      ? (row.components as unknown[])
      : [];
    upsertTemplate({
      workspaceId,
      name,
      language:
        typeof row.language === "string"
          ? row.language
          : typeof (row.language as { code?: string } | undefined)?.code ===
              "string"
            ? (row.language as { code: string }).code
            : "en_US",
      category: typeof row.category === "string" ? row.category : null,
      status: mapStatus(row.status),
      body: extractBody(components),
      components,
      providerTemplateId: typeof row.id === "string" ? row.id : null,
      isLocal: false,
    });
    synced += 1;
  }

  createWhatsAppLog({
    workspaceId,
    operation: "template_sync",
    status: "success",
    requestSummary: `Synced ${synced} templates`,
  });

  return {
    synced,
    templates: listTemplates(workspaceId, { limit: 500 }),
  };
}
