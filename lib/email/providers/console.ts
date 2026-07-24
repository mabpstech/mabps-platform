import type { EmailProvider } from "@/lib/email/providers/types";
import type { EmailSendResult } from "@/lib/email/types";

/**
 * Dev-safe provider: logs the message and reports success.
 * Used when RESEND_API_KEY is not set.
 */
export class ConsoleEmailProvider implements EmailProvider {
  readonly id = "console" as const;

  isConfigured(): boolean {
    return true;
  }

  async send(input: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text: string;
    replyTo?: string;
    tags?: string[];
  }): Promise<EmailSendResult> {
    console.info("[email:dev]", {
      provider: this.id,
      from: input.from,
      to: input.to,
      subject: input.subject,
      replyTo: input.replyTo,
      tags: input.tags,
      text: input.text,
    });

    return {
      ok: true,
      provider: this.id,
      providerMessageId: `console_${Date.now()}`,
    };
  }
}
