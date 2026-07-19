import { sendWithResend } from "@/lib/email-engine/providers/resend/client";
import { sendWithSes } from "@/lib/email-engine/providers/ses/client";
import { sendWithSmtp } from "@/lib/email-engine/providers/smtp/client";
import type {
  EmailProviderCredentials,
  EmailProviderSendResult,
} from "@/lib/email-engine/types";

export async function sendWithProvider(
  credentials: EmailProviderCredentials,
  input: {
    to: string;
    toName?: string | null;
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string | null;
  },
): Promise<EmailProviderSendResult> {
  if (credentials.provider === "resend") {
    return sendWithResend({
      apiKey: credentials.apiKey,
      fromEmail: credentials.fromEmail,
      fromName: credentials.fromName,
      to: input.to,
      toName: input.toName,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    });
  }

  if (credentials.provider === "ses") {
    return sendWithSes({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      region: credentials.region,
      fromEmail: credentials.fromEmail,
      fromName: credentials.fromName,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    });
  }

  return sendWithSmtp({
    host: credentials.host,
    port: credentials.port,
    secure: credentials.secure,
    user: credentials.user,
    password: credentials.password,
    fromEmail: credentials.fromEmail,
    fromName: credentials.fromName,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
  });
}

export { sendWithResend } from "@/lib/email-engine/providers/resend/client";
export { sendWithSes } from "@/lib/email-engine/providers/ses/client";
export { sendWithSmtp } from "@/lib/email-engine/providers/smtp/client";
