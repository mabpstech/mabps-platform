export type WhatsAppSendInput = {
  to: string;
  message: string;
  templateName?: string;
  templateParams?: Record<string, string>;
  metadata?: Record<string, unknown>;
};

export type WhatsAppSendResult = {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
  raw?: Record<string, unknown>;
};

export type WhatsAppProviderConfig = {
  workspaceId?: string;
  phoneNumberId?: string;
  accessToken?: string;
  wabaId?: string;
  apiVersion?: string;
};

/**
 * WhatsApp provider interface for Automation actions.
 * Implementations can wrap Meta Cloud API or other BSP adapters.
 */
export interface WhatsAppProvider {
  id: string;
  isImplemented: boolean;
  sendMessage(
    config: WhatsAppProviderConfig,
    input: WhatsAppSendInput,
  ): Promise<WhatsAppSendResult>;
}
