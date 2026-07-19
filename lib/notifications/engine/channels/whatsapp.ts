import { sendWhatsAppText } from "@/lib/whatsapp/engine/outbound";
import { ensureWorkspaceWhatsApp } from "@/lib/whatsapp/repository";
import type { NotificationChannelResult } from "@/lib/notifications/types";

export async function deliverWhatsApp(input: {
  workspaceId: string;
  phone?: string | null;
  title: string;
  body: string;
}): Promise<NotificationChannelResult> {
  const phone = input.phone?.trim();
  if (!phone) {
    return {
      ok: true,
      skipped: true,
      error: "Phone number not available.",
    };
  }

  try {
    ensureWorkspaceWhatsApp(input.workspaceId);
    const text = `*${input.title}*\n${input.body}`;
    const message = await sendWhatsAppText({
      workspaceId: input.workspaceId,
      to: phone,
      text,
    });

    if (message.status === "failed") {
      return {
        ok: false,
        error: message.errorMessage || "WhatsApp send failed.",
        raw: message.raw,
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
      error: error instanceof Error ? error.message : "WhatsApp send failed.",
    };
  }
}
