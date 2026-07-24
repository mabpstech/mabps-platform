import {
  greetingFor,
  renderButton,
  renderEmailLayout,
  renderLinkFallback,
  renderParagraph,
} from "@/lib/email/templates/layout";
import type { RenderedEmail, WelcomeEmailInput } from "@/lib/email/types";

export function renderWelcomeEmail(input: WelcomeEmailInput): RenderedEmail {
  const greeting = greetingFor(input.name);
  const workspace = input.workspaceName?.trim();
  const subject = workspace
    ? `Welcome to ${workspace} on MABPS`
    : "Welcome to MABPS";

  const lines = [
    greeting,
    "",
    workspace
      ? `Welcome to ${workspace} on MABPS. Your workspace is ready.`
      : "Welcome to MABPS. Your account is ready.",
  ];

  if (input.dashboardUrl) {
    lines.push("", `Open your dashboard:`, input.dashboardUrl);
  }

  const bodyHtml = [
    renderParagraph(greeting),
    renderParagraph(
      workspace
        ? `Welcome to ${workspace} on MABPS. Your workspace is ready.`
        : "Welcome to MABPS. Your account is ready.",
    ),
    input.dashboardUrl
      ? `${renderButton(input.dashboardUrl, "Open dashboard")}${renderLinkFallback(input.dashboardUrl)}`
      : "",
  ].join("");

  return {
    subject,
    text: lines.join("\n"),
    html: renderEmailLayout({
      title: subject,
      preheader: "Your MABPS account is ready.",
      bodyHtml,
    }),
  };
}
