import {
  escapeHtml,
  greetingFor,
  renderButton,
  renderEmailLayout,
  renderLinkFallback,
  renderParagraph,
} from "@/lib/email/templates/layout";
import type {
  RenderedEmail,
  SubscriptionCancelledEmailInput,
} from "@/lib/email/types";

export function renderSubscriptionCancelledEmail(
  input: SubscriptionCancelledEmailInput,
): RenderedEmail {
  const greeting = greetingFor(input.name);
  const workspace = input.workspaceName?.trim();
  const subject = workspace
    ? `${workspace} subscription cancelled`
    : "Subscription cancelled";

  const summary = workspace
    ? `Your ${input.planName} subscription for ${workspace} has been cancelled.`
    : `Your ${input.planName} subscription has been cancelled.`;

  const accessLine = input.endsAt
    ? `Access continues until ${input.endsAt}.`
    : null;

  return {
    subject,
    text: [
      greeting,
      "",
      summary,
      accessLine ?? "",
      input.billingUrl ? `\nManage billing:\n${input.billingUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    html: renderEmailLayout({
      title: subject,
      preheader: "Your subscription has been cancelled.",
      bodyHtml: [
        renderParagraph(greeting),
        `<p style="margin:0 0 16px;">Your <strong>${escapeHtml(input.planName)}</strong> subscription${workspace ? ` for <strong>${escapeHtml(workspace)}</strong>` : ""} has been cancelled.</p>`,
        accessLine ? renderParagraph(accessLine) : "",
        input.billingUrl
          ? `${renderButton(input.billingUrl, "Manage billing")}${renderLinkFallback(input.billingUrl)}`
          : "",
      ].join(""),
    }),
  };
}
