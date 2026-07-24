import type { EmailProvider } from "@/lib/email/providers/types";
import type { EmailSendResult } from "@/lib/email/types";

type ResendSuccessBody = {
  id?: string;
};

type ResendErrorBody = {
  message?: string;
  name?: string;
};

/**
 * Resend EmailProvider implementation.
 * Uses RESEND_API_KEY from the environment.
 */
export class ResendEmailProvider implements EmailProvider {
  readonly id = "resend" as const;

  constructor(private readonly apiKey: string = process.env.RESEND_API_KEY ?? "") {}

  isConfigured(): boolean {
    return Boolean(this.apiKey.trim());
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
    if (!this.isConfigured()) {
      return {
        ok: false,
        provider: this.id,
        error: "Resend is not configured. Set RESEND_API_KEY.",
      };
    }

    const body: Record<string, unknown> = {
      from: input.from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    };
    if (input.replyTo) body.reply_to = input.replyTo;
    if (input.tags?.length) {
      body.tags = input.tags.map((name) => ({ name, value: name }));
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const raw = (await response.json().catch(() => ({}))) as
        | ResendSuccessBody
        | ResendErrorBody;

      if (!response.ok) {
        const message =
          "message" in raw && typeof raw.message === "string"
            ? raw.message
            : `Resend send failed (${response.status}).`;
        return { ok: false, provider: this.id, error: message };
      }

      return {
        ok: true,
        provider: this.id,
        providerMessageId:
          "id" in raw && typeof raw.id === "string" ? raw.id : undefined,
      };
    } catch (error) {
      return {
        ok: false,
        provider: this.id,
        error: error instanceof Error ? error.message : "Resend send failed.",
      };
    }
  }
}
