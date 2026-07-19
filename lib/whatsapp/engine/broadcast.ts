import { sendWhatsAppTemplate } from "@/lib/whatsapp/engine/outbound";
import {
  createWhatsAppLog,
  getBroadcastById,
  listBroadcastRecipients,
  updateBroadcast,
  updateBroadcastRecipient,
} from "@/lib/whatsapp/repository";
import type { WhatsAppBroadcast } from "@/lib/whatsapp/types";

/**
 * Send a draft/scheduled broadcast to all pending recipients using a template.
 */
export async function runWhatsAppBroadcast(input: {
  workspaceId: string;
  broadcastId: string;
}): Promise<WhatsAppBroadcast> {
  const broadcast = getBroadcastById(input.broadcastId);
  if (!broadcast || broadcast.workspaceId !== input.workspaceId) {
    throw new Error("Broadcast not found.");
  }
  if (broadcast.status === "sending") {
    throw new Error("Broadcast is already sending.");
  }
  if (broadcast.status === "completed") {
    throw new Error("Broadcast already completed.");
  }

  const startedAt = new Date().toISOString();
  updateBroadcast(broadcast.id, input.workspaceId, {
    status: "sending",
    startedAt,
  });

  const recipients = listBroadcastRecipients(broadcast.id, input.workspaceId);
  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of recipients) {
    if (recipient.status === "sent") {
      sentCount += 1;
      continue;
    }
    try {
      const message = await sendWhatsAppTemplate({
        workspaceId: input.workspaceId,
        to: recipient.phone,
        templateName: broadcast.templateName,
        language: broadcast.templateLanguage,
        bodyParams: broadcast.templateParams,
      });
      updateBroadcastRecipient(recipient.id, input.workspaceId, {
        status: message.status === "failed" ? "failed" : "sent",
        providerMessageId: message.providerMessageId,
        errorMessage: message.errorMessage,
        sentAt: new Date().toISOString(),
      });
      if (message.status === "failed") failedCount += 1;
      else sentCount += 1;
    } catch (error) {
      failedCount += 1;
      updateBroadcastRecipient(recipient.id, input.workspaceId, {
        status: "failed",
        errorMessage:
          error instanceof Error ? error.message : "Broadcast send failed.",
        sentAt: new Date().toISOString(),
      });
    }
  }

  const completed = updateBroadcast(broadcast.id, input.workspaceId, {
    status: failedCount > 0 && sentCount === 0 ? "failed" : "completed",
    sentCount,
    failedCount,
    completedAt: new Date().toISOString(),
  });

  createWhatsAppLog({
    workspaceId: input.workspaceId,
    operation: "broadcast_send",
    status: completed.status === "failed" ? "error" : "success",
    requestSummary: `${broadcast.name}: ${sentCount} sent, ${failedCount} failed`,
    metadata: { broadcastId: broadcast.id },
  });

  return completed;
}
