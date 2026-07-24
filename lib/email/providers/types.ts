import type { EmailProviderId, EmailSendResult } from "@/lib/email/types";

export type EmailProviderSendInput = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  tags?: string[];
};

/**
 * Low-level delivery adapter. Resend and console implement this.
 */
export type EmailProvider = {
  readonly id: EmailProviderId;
  isConfigured(): boolean;
  send(input: EmailProviderSendInput): Promise<EmailSendResult>;
};
