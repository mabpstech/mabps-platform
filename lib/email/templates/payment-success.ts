import {
  escapeHtml,
  greetingFor,
  renderButton,
  renderEmailLayout,
  renderLinkFallback,
  renderParagraph,
} from "@/lib/email/templates/layout";
import type {
  PaymentSuccessEmailInput,
  RenderedEmail,
} from "@/lib/email/types";

export function renderPaymentSuccessEmail(
  input: PaymentSuccessEmailInput,
): RenderedEmail {
  const greeting = greetingFor(input.name);
  const workspace = input.workspaceName?.trim();
  const subject = workspace
    ? `Payment received for ${workspace}`
    : "Payment received";

  const summary = workspace
    ? `We received your payment of ${input.amountFormatted} for ${input.planName} on ${workspace}.`
    : `We received your payment of ${input.amountFormatted} for ${input.planName}.`;

  const ctaUrl = input.invoiceUrl || input.billingUrl || null;
  const ctaLabel = input.invoiceUrl ? "View invoice" : "View billing";

  return {
    subject,
    text: [
      greeting,
      "",
      summary,
      ctaUrl ? `\n${ctaLabel}:\n${ctaUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    html: renderEmailLayout({
      title: subject,
      preheader: `Payment of ${input.amountFormatted} received.`,
      bodyHtml: [
        renderParagraph(greeting),
        `<p style="margin:0 0 16px;">We received your payment of <strong>${escapeHtml(input.amountFormatted)}</strong> for <strong>${escapeHtml(input.planName)}</strong>${workspace ? ` on <strong>${escapeHtml(workspace)}</strong>` : ""}.</p>`,
        ctaUrl
          ? `${renderButton(ctaUrl, ctaLabel)}${renderLinkFallback(ctaUrl)}`
          : "",
      ].join(""),
    }),
  };
}
