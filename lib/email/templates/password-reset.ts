import {
  greetingFor,
  renderButton,
  renderEmailLayout,
  renderLinkFallback,
  renderParagraph,
} from "@/lib/email/templates/layout";
import type { PasswordResetEmailInput, RenderedEmail } from "@/lib/email/types";

export function renderPasswordResetEmail(
  input: PasswordResetEmailInput,
): RenderedEmail {
  const greeting = greetingFor(input.name);
  const subject = "Reset your MABPS password";

  return {
    subject,
    text: `${greeting}\n\nReset your password using this link:\n${input.url}\n\nIf you did not request this, you can ignore this email.`,
    html: renderEmailLayout({
      title: subject,
      preheader: "Reset your MABPS password.",
      bodyHtml: [
        renderParagraph(greeting),
        renderParagraph("Reset your password using the button below."),
        renderButton(input.url, "Reset password"),
        renderLinkFallback(input.url),
        renderParagraph("If you did not request this, you can ignore this email."),
      ].join(""),
    }),
  };
}
