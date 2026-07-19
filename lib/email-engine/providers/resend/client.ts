import { formatFromAddress } from "@/lib/email-engine/defaults";
import type { EmailProviderSendResult } from "@/lib/email-engine/types";

export async function sendWithResend(input: {
  apiKey: string;
  fromEmail: string;
  fromName?: string | null;
  to: string;
  toName?: string | null;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string | null;
}): Promise<EmailProviderSendResult> {
  const to =
    input.toName?.trim()
      ? `${input.toName.trim()} <${input.to}>`
      : input.to;

  const body: Record<string, unknown> = {
    from: formatFromAddress(input.fromEmail, input.fromName),
    to: [to],
    subject: input.subject,
  };
  if (input.html) body.html = input.html;
  if (input.text) body.text = input.text;
  if (input.replyTo) body.reply_to = input.replyTo;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const raw = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    if (!response.ok) {
      const message =
        typeof raw.message === "string"
          ? raw.message
          : `Resend send failed (${response.status}).`;
      return { ok: false, error: message, raw };
    }

    return {
      ok: true,
      providerMessageId:
        typeof raw.id === "string" ? raw.id : undefined,
      raw,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Resend send failed.",
    };
  }
}
