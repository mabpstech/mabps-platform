/**
 * Platform transactional email (auth + billing lifecycle).
 * Distinct from product `lib/email-engine` (campaigns / workspace mail).
 */

export type {
  EmailKind,
  EmailProviderId,
  EmailSendResult,
  EmailService,
  PasswordResetEmailInput,
  PaymentFailedEmailInput,
  PaymentSuccessEmailInput,
  RenderedEmail,
  SendEmailInput,
  SubscriptionCancelledEmailInput,
  TrialEndingEmailInput,
  VerifyEmailInput,
  WelcomeEmailInput,
} from "@/lib/email/types";

export {
  createEmailService,
  getEmailService,
  type EmailServiceContext,
} from "@/lib/email/service";

export {
  ConsoleEmailProvider,
  ResendEmailProvider,
  resolveEmailProvider,
  type EmailProvider,
  type EmailProviderSendInput,
} from "@/lib/email/providers";

export {
  renderWelcomeEmail,
  renderVerifyEmail,
  renderPasswordResetEmail,
  renderPaymentSuccessEmail,
  renderPaymentFailedEmail,
  renderTrialEndingEmail,
  renderSubscriptionCancelledEmail,
  renderEmailLayout,
} from "@/lib/email/templates";

import { getEmailService } from "@/lib/email/service";
import type { SendEmailInput } from "@/lib/email/types";

/**
 * Low-level send used by auth helpers and invitation mail.
 * Throws on provider failure (matches prior lib/email.ts behavior).
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  await getEmailService().send(input);
}

export async function sendPasswordResetEmail(params: {
  email: string;
  url: string;
  name?: string | null;
}): Promise<void> {
  await getEmailService().sendPasswordReset({
    to: params.email,
    name: params.name,
    url: params.url,
  });
}

export async function sendVerificationEmail(params: {
  email: string;
  url: string;
  name?: string | null;
}): Promise<void> {
  await getEmailService().sendVerifyEmail({
    to: params.email,
    name: params.name,
    url: params.url,
  });
}

export async function sendWelcomeEmail(params: {
  email: string;
  name?: string | null;
  workspaceName?: string | null;
  dashboardUrl?: string | null;
}): Promise<void> {
  await getEmailService().sendWelcome({
    to: params.email,
    name: params.name,
    workspaceName: params.workspaceName,
    dashboardUrl: params.dashboardUrl,
  });
}

export async function sendPaymentSuccessEmail(params: {
  email: string;
  name?: string | null;
  workspaceName?: string | null;
  planName: string;
  amountFormatted: string;
  invoiceUrl?: string | null;
  billingUrl?: string | null;
}): Promise<void> {
  await getEmailService().sendPaymentSuccess({
    to: params.email,
    name: params.name,
    workspaceName: params.workspaceName,
    planName: params.planName,
    amountFormatted: params.amountFormatted,
    invoiceUrl: params.invoiceUrl,
    billingUrl: params.billingUrl,
  });
}

export async function sendPaymentFailedEmail(params: {
  email: string;
  name?: string | null;
  workspaceName?: string | null;
  planName: string;
  graceEndsAt?: string | null;
  billingUrl?: string | null;
}): Promise<void> {
  await getEmailService().sendPaymentFailed({
    to: params.email,
    name: params.name,
    workspaceName: params.workspaceName,
    planName: params.planName,
    graceEndsAt: params.graceEndsAt,
    billingUrl: params.billingUrl,
  });
}

export async function sendTrialEndingEmail(params: {
  email: string;
  name?: string | null;
  workspaceName?: string | null;
  planName: string;
  trialEndsAt: string;
  upgradeUrl?: string | null;
}): Promise<void> {
  await getEmailService().sendTrialEnding({
    to: params.email,
    name: params.name,
    workspaceName: params.workspaceName,
    planName: params.planName,
    trialEndsAt: params.trialEndsAt,
    upgradeUrl: params.upgradeUrl,
  });
}

export async function sendSubscriptionCancelledEmail(params: {
  email: string;
  name?: string | null;
  workspaceName?: string | null;
  planName: string;
  endsAt?: string | null;
  billingUrl?: string | null;
}): Promise<void> {
  await getEmailService().sendSubscriptionCancelled({
    to: params.email,
    name: params.name,
    workspaceName: params.workspaceName,
    planName: params.planName,
    endsAt: params.endsAt,
    billingUrl: params.billingUrl,
  });
}

export async function sendOrganizationInvitationEmail(params: {
  email: string;
  invitedByUsername: string;
  invitedByEmail: string;
  workspaceName: string;
  inviteLink: string;
}): Promise<void> {
  await sendEmail({
    to: params.email,
    subject: `Join ${params.workspaceName} on MABPS`,
    text: `${params.invitedByUsername} (${params.invitedByEmail}) invited you to the workspace "${params.workspaceName}".\n\nAccept the invitation:\n${params.inviteLink}`,
    html: `<p><strong>${params.invitedByUsername}</strong> (${params.invitedByEmail}) invited you to the workspace <strong>${params.workspaceName}</strong>.</p><p><a href="${params.inviteLink}">Accept invitation</a></p>`,
  });
}
