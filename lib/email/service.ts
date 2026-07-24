import {
  resolveEmailProvider,
  type EmailProvider,
} from "@/lib/email/providers";
import {
  renderPasswordResetEmail,
  renderPaymentSuccessEmail,
  renderSubscriptionCancelledEmail,
  renderTrialEndingEmail,
  renderVerifyEmail,
  renderWelcomeEmail,
} from "@/lib/email/templates";
import type {
  EmailProviderId,
  EmailSendResult,
  EmailService,
  PasswordResetEmailInput,
  PaymentSuccessEmailInput,
  SendEmailInput,
  SubscriptionCancelledEmailInput,
  TrialEndingEmailInput,
  VerifyEmailInput,
  WelcomeEmailInput,
} from "@/lib/email/types";

export type EmailServiceContext = {
  provider?: EmailProvider;
  from?: string;
};

function defaultFromAddress(): string {
  return process.env.EMAIL_FROM ?? "MABPS <noreply@localhost>";
}

/**
 * Create a platform EmailService backed by Resend (or console in dev).
 */
export function createEmailService(
  context: EmailServiceContext = {},
): EmailService {
  const provider = resolveEmailProvider(context.provider);
  const from = context.from ?? defaultFromAddress();

  async function send(input: SendEmailInput): Promise<EmailSendResult> {
    const result = await provider.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
      tags: input.tags,
    });

    if (!result.ok) {
      throw new Error(
        result.error || `Failed to send email via ${result.provider}.`,
      );
    }

    return result;
  }

  return {
    getActiveProvider(): EmailProviderId {
      return provider.id;
    },

    send,

    async sendWelcome(input: WelcomeEmailInput): Promise<EmailSendResult> {
      const rendered = renderWelcomeEmail(input);
      return send({
        to: input.to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        tags: ["welcome"],
      });
    },

    async sendVerifyEmail(input: VerifyEmailInput): Promise<EmailSendResult> {
      const rendered = renderVerifyEmail(input);
      return send({
        to: input.to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        tags: ["verify"],
      });
    },

    async sendPasswordReset(
      input: PasswordResetEmailInput,
    ): Promise<EmailSendResult> {
      const rendered = renderPasswordResetEmail(input);
      return send({
        to: input.to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        tags: ["password_reset"],
      });
    },

    async sendPaymentSuccess(
      input: PaymentSuccessEmailInput,
    ): Promise<EmailSendResult> {
      const rendered = renderPaymentSuccessEmail(input);
      return send({
        to: input.to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        tags: ["payment_success"],
      });
    },

    async sendTrialEnding(
      input: TrialEndingEmailInput,
    ): Promise<EmailSendResult> {
      const rendered = renderTrialEndingEmail(input);
      return send({
        to: input.to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        tags: ["trial_ending"],
      });
    },

    async sendSubscriptionCancelled(
      input: SubscriptionCancelledEmailInput,
    ): Promise<EmailSendResult> {
      const rendered = renderSubscriptionCancelledEmail(input);
      return send({
        to: input.to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        tags: ["subscription_cancelled"],
      });
    },
  };
}

let defaultService: EmailService | null = null;

/**
 * Shared EmailService instance for platform auth and lifecycle mail.
 */
export function getEmailService(): EmailService {
  if (!defaultService) {
    defaultService = createEmailService();
  }
  return defaultService;
}
