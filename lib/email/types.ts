/**
 * Platform transactional email types.
 * Distinct from product email-engine (campaigns / workspace mail).
 */

export type EmailProviderId = "resend" | "console";

export type EmailKind =
  | "welcome"
  | "verify"
  | "password_reset"
  | "payment_success"
  | "trial_ending"
  | "subscription_cancelled";

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  tags?: string[];
};

export type EmailSendResult = {
  ok: boolean;
  provider: EmailProviderId;
  providerMessageId?: string;
  error?: string;
};

export type WelcomeEmailInput = {
  to: string;
  name?: string | null;
  workspaceName?: string | null;
  dashboardUrl?: string | null;
};

export type VerifyEmailInput = {
  to: string;
  name?: string | null;
  url: string;
};

export type PasswordResetEmailInput = {
  to: string;
  name?: string | null;
  url: string;
};

export type PaymentSuccessEmailInput = {
  to: string;
  name?: string | null;
  workspaceName?: string | null;
  planName: string;
  amountFormatted: string;
  invoiceUrl?: string | null;
  billingUrl?: string | null;
};

export type TrialEndingEmailInput = {
  to: string;
  name?: string | null;
  workspaceName?: string | null;
  planName: string;
  trialEndsAt: string;
  upgradeUrl?: string | null;
};

export type SubscriptionCancelledEmailInput = {
  to: string;
  name?: string | null;
  workspaceName?: string | null;
  planName: string;
  endsAt?: string | null;
  billingUrl?: string | null;
};

/**
 * EmailService contract for platform transactional mail.
 */
export type EmailService = {
  getActiveProvider(): EmailProviderId;

  send(input: SendEmailInput): Promise<EmailSendResult>;

  sendWelcome(input: WelcomeEmailInput): Promise<EmailSendResult>;

  sendVerifyEmail(input: VerifyEmailInput): Promise<EmailSendResult>;

  sendPasswordReset(input: PasswordResetEmailInput): Promise<EmailSendResult>;

  sendPaymentSuccess(input: PaymentSuccessEmailInput): Promise<EmailSendResult>;

  sendTrialEnding(input: TrialEndingEmailInput): Promise<EmailSendResult>;

  sendSubscriptionCancelled(
    input: SubscriptionCancelledEmailInput,
  ): Promise<EmailSendResult>;
};
