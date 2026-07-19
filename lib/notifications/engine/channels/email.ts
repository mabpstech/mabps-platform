import { sendTransactionalEmail } from "@/lib/email-engine/engine/send";
import { ensureWorkspaceEmail } from "@/lib/email-engine/repository";
import type { NotificationChannelResult } from "@/lib/notifications/types";

export async function deliverEmail(input: {
  workspaceId: string;
  to?: string | null;
  title: string;
  body: string;
  href?: string | null;
}): Promise<NotificationChannelResult> {
  const to = input.to?.trim();
  if (!to) {
    return {
      ok: true,
      skipped: true,
      error: "Email address not available.",
    };
  }

  try {
    ensureWorkspaceEmail(input.workspaceId);
    const html = input.href
      ? `<p>${escapeHtml(input.body)}</p><p><a href="${escapeAttr(input.href)}">Open</a></p>`
      : `<p>${escapeHtml(input.body)}</p>`;

    const message = await sendTransactionalEmail(input.workspaceId, {
      to,
      subject: input.title,
      html,
      text: input.href ? `${input.body}\n\n${input.href}` : input.body,
      metadata: { source: "notifications" },
    });

    if (message.status === "failed") {
      return {
        ok: false,
        error: message.errorMessage || "Email send failed.",
        raw: { messageId: message.id, ...message.raw },
      };
    }

    return {
      ok: true,
      providerMessageId: message.providerMessageId || message.id,
      raw: { messageId: message.id, status: message.status },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Email send failed.",
    };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, "&quot;");
}
