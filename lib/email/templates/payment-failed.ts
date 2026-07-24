import {
  escapeHtml,
  greetingFor,
  renderButton,
  renderEmailLayout,
  renderLinkFallback,
  renderParagraph,
} from "@/lib/email/templates/layout";
import type {
  PaymentFailedEmailInput,
  RenderedEmail,
} from "@/lib/email/types";

export function renderPaymentFailedEmail(
  input: PaymentFailedEmailInput,
): RenderedEmail {
  const greeting = greetingFor(input.name);
  const workspace = input.workspaceName?.trim();
  const subject = workspace
    ? `Payment failed for ${workspace}`
    : "Payment failed";

  const summary = workspace
    ? `We could not process your payment for ${input.planName} on ${workspace}. Your subscription is past due.`
    : `We could not process your payment for ${input.planName}. Your subscription is past due.`;

  const graceLine = input.graceEndsAt
    ? `Access continues through your grace period until ${input.graceEndsAt}.`
    : "Access continues during your grace period while you update payment details.";

  return {
    subject,
    text: [
      greeting,
      "",
      summary,
      graceLine,
      input.billingUrl ? `\nUpdate payment:\n${input.billingUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    html: renderEmailLayout({
      title: subject,
      preheader: "Payment failed — update your billing details.",
      bodyHtml: [
        renderParagraph(greeting),
        `<p style="margin:0 0 16px;">We could not process your payment for <strong>${escapeHtml(input.planName)}</strong>${workspace ? ` on <strong>${escapeHtml(workspace)}</strong>` : ""}. Your subscription is <strong>past due</strong>.</p>`,
        renderParagraph(graceLine),
        input.billingUrl
          ? `${renderButton(input.billingUrl, "Update payment")}${renderLinkFallback(input.billingUrl)}`
          : "",
      ].join(""),
    }),
  };
}
