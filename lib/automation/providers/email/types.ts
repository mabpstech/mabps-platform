export type EmailProviderSendInput = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  toName?: string;
  replyTo?: string;
  templateId?: string;
  variables?: Record<string, string>;
  kind?: "transactional" | "marketing";
  metadata?: Record<string, unknown>;
};

export type EmailProviderSendResult = {
  ok: boolean;
  providerMessageId?: string;
  messageId?: string;
  error?: string;
  raw?: Record<string, unknown>;
};

export type EmailAutomationProviderConfig = {
  workspaceId?: string;
};

/**
 * Email provider interface for Automation actions.
 * Backed by the multi-tenant Email Engine (SMTP / Resend / SES).
 */
export interface EmailAutomationProvider {
  id: string;
  isImplemented: boolean;
  sendEmail(
    config: EmailAutomationProviderConfig,
    input: EmailProviderSendInput,
  ): Promise<EmailProviderSendResult>;
}
