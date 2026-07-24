import {
  greetingFor,
  renderButton,
  renderEmailLayout,
  renderLinkFallback,
  renderParagraph,
} from "@/lib/email/templates/layout";
import type { RenderedEmail, VerifyEmailInput } from "@/lib/email/types";

export function renderVerifyEmail(input: VerifyEmailInput): RenderedEmail {
  const greeting = greetingFor(input.name);
  const subject = "Verify your MABPS email";

  return {
    subject,
    text: `${greeting}\n\nVerify your email using this link:\n${input.url}`,
    html: renderEmailLayout({
      title: subject,
      preheader: "Confirm your email address to continue.",
      bodyHtml: [
        renderParagraph(greeting),
        renderParagraph("Verify your email address to continue with MABPS."),
        renderButton(input.url, "Verify email"),
        renderLinkFallback(input.url),
      ].join(""),
    }),
  };
}
