import {
  escapeHtml,
  greetingFor,
  renderButton,
  renderEmailLayout,
  renderLinkFallback,
  renderParagraph,
} from "@/lib/email/templates/layout";
import type { RenderedEmail, TrialEndingEmailInput } from "@/lib/email/types";

export function renderTrialEndingEmail(
  input: TrialEndingEmailInput,
): RenderedEmail {
  const greeting = greetingFor(input.name);
  const workspace = input.workspaceName?.trim();
  const subject = workspace
    ? `Your ${workspace} trial ends soon`
    : "Your MABPS trial ends soon";

  const summary = workspace
    ? `Your trial of ${input.planName} for ${workspace} ends on ${input.trialEndsAt}.`
    : `Your trial of ${input.planName} ends on ${input.trialEndsAt}.`;

  return {
    subject,
    text: [
      greeting,
      "",
      summary,
      "",
      "Upgrade now to keep access without interruption.",
      input.upgradeUrl ? `\nUpgrade:\n${input.upgradeUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    html: renderEmailLayout({
      title: subject,
      preheader: `Trial ends on ${input.trialEndsAt}.`,
      bodyHtml: [
        renderParagraph(greeting),
        `<p style="margin:0 0 16px;">Your trial of <strong>${escapeHtml(input.planName)}</strong>${workspace ? ` for <strong>${escapeHtml(workspace)}</strong>` : ""} ends on <strong>${escapeHtml(input.trialEndsAt)}</strong>.</p>`,
        renderParagraph("Upgrade now to keep access without interruption."),
        input.upgradeUrl
          ? `${renderButton(input.upgradeUrl, "Upgrade plan")}${renderLinkFallback(input.upgradeUrl)}`
          : "",
      ].join(""),
    }),
  };
}
