import {
  sendTemplateMessage,
  sendTextMessage,
} from "@/lib/whatsapp/cloud/client";
import {
  ensureWorkspaceWhatsApp,
  requireConnectedCredentials,
} from "@/lib/whatsapp/repository";
import type {
  WhatsAppProvider,
  WhatsAppProviderConfig,
  WhatsAppSendInput,
  WhatsAppSendResult,
} from "@/lib/automation/providers/whatsapp/types";

type RuntimeConfig = WhatsAppProviderConfig & { workspaceId?: string };

function resolveCredentials(config: RuntimeConfig): {
  phoneNumberId: string;
  accessToken: string;
  wabaId?: string | null;
  apiVersion?: string;
} {
  if (config.phoneNumberId?.trim() && config.accessToken?.trim()) {
    return {
      phoneNumberId: config.phoneNumberId.trim(),
      accessToken: config.accessToken.trim(),
      wabaId: config.wabaId,
      apiVersion: config.apiVersion,
    };
  }

  if (!config.workspaceId) {
    throw new Error(
      "WhatsApp send requires workspace credentials or workspaceId.",
    );
  }

  ensureWorkspaceWhatsApp(config.workspaceId);
  const connected = requireConnectedCredentials(config.workspaceId);
  return {
    phoneNumberId: connected.phoneNumberId,
    accessToken: connected.accessToken,
    wabaId: connected.wabaId,
    apiVersion: connected.apiVersion,
  };
}

/**
 * Meta WhatsApp Cloud API provider backed by the WhatsApp Integration module.
 */
export const metaWhatsAppProvider: WhatsAppProvider = {
  id: "meta_cloud",
  isImplemented: true,
  async sendMessage(
    config: RuntimeConfig,
    input: WhatsAppSendInput,
  ): Promise<WhatsAppSendResult> {
    try {
      const credentials = resolveCredentials(config);

      if (input.templateName) {
        const result = await sendTemplateMessage(credentials, {
          to: input.to,
          templateName: input.templateName,
          bodyParams: input.templateParams
            ? Object.values(input.templateParams)
            : undefined,
        });
        return {
          ok: result.ok,
          providerMessageId: result.providerMessageId,
          error: result.error,
          raw: result.raw,
        };
      }

      if (!input.message?.trim()) {
        return {
          ok: false,
          error: "whatsapp.send requires message or templateName.",
        };
      }

      const result = await sendTextMessage(credentials, {
        to: input.to,
        text: input.message,
      });
      return {
        ok: result.ok,
        providerMessageId: result.providerMessageId,
        error: result.error,
        raw: result.raw,
      };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error ? error.message : "WhatsApp send failed.",
      };
    }
  },
};

const providers: Record<string, WhatsAppProvider> = {
  meta_cloud: metaWhatsAppProvider,
};

export function getWhatsAppProvider(id = "meta_cloud"): WhatsAppProvider {
  return providers[id] ?? metaWhatsAppProvider;
}

export type {
  WhatsAppProvider,
  WhatsAppProviderConfig,
  WhatsAppSendInput,
  WhatsAppSendResult,
};
