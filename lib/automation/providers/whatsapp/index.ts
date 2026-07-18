import type {
  WhatsAppProvider,
  WhatsAppProviderConfig,
  WhatsAppSendInput,
  WhatsAppSendResult,
} from "@/lib/automation/providers/whatsapp/types";

/**
 * Stub Meta WhatsApp Cloud API provider.
 * Interface is ready; wire credentials + Graph API when Integrations ships.
 */
export const metaWhatsAppProvider: WhatsAppProvider = {
  id: "meta_cloud",
  isImplemented: false,
  async sendMessage(
    _config: WhatsAppProviderConfig,
    _input: WhatsAppSendInput,
  ): Promise<WhatsAppSendResult> {
    return {
      ok: false,
      error:
        "WhatsApp Cloud API is not implemented yet. Provider interface is ready.",
    };
  },
};

const providers: Record<string, WhatsAppProvider> = {
  meta_cloud: metaWhatsAppProvider,
};

export function getWhatsAppProvider(
  id = "meta_cloud",
): WhatsAppProvider {
  return providers[id] ?? metaWhatsAppProvider;
}

export type {
  WhatsAppProvider,
  WhatsAppProviderConfig,
  WhatsAppSendInput,
  WhatsAppSendResult,
};
