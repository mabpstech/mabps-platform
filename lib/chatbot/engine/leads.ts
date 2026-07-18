import { createLead, listLeads } from "@/lib/crm/repository";
import {
  createMessage,
  getConversationById,
  updateConversation,
  upsertMemory,
} from "@/lib/chatbot/repository";
import type { ChatbotBot, ChatbotConversation } from "@/lib/chatbot/types";

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/;

export function extractLeadHints(text: string): {
  email: string | null;
  phone: string | null;
  name: string | null;
} {
  const email = text.match(EMAIL_RE)?.[0]?.toLowerCase() ?? null;
  const phone = text.match(PHONE_RE)?.[0]?.replace(/\s+/g, " ").trim() ?? null;

  let name: string | null = null;
  const nameMatch = text.match(
    /(?:my name is|i am|i'm|this is)\s+([A-Za-z][A-Za-z\s'-]{1,60})/i,
  );
  if (nameMatch?.[1]) {
    name = nameMatch[1].replace(/[^A-Za-z\s'-]/g, "").trim();
  }

  return { email, phone, name };
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "Visitor", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export function ensureCrmLeadForConversation(input: {
  bot: ChatbotBot;
  conversation: ChatbotConversation;
  hints?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
}): ChatbotConversation {
  if (!input.bot.leadCaptureEnabled) return input.conversation;

  const visitorName =
    asStringOrNull(input.hints?.name) || input.conversation.visitorName;
  const visitorEmail =
    asStringOrNull(input.hints?.email) || input.conversation.visitorEmail;
  const visitorPhone =
    asStringOrNull(input.hints?.phone) || input.conversation.visitorPhone;

  let conversation = updateConversation(
    input.conversation.id,
    input.conversation.workspaceId,
    {
      visitorName,
      visitorEmail,
      visitorPhone,
    },
  );

  if (conversation.crmLeadId) return conversation;
  if (!visitorEmail && !visitorPhone && !visitorName) return conversation;

  const existing = visitorEmail
    ? listLeads(conversation.workspaceId, { q: visitorEmail, limit: 20 }).find(
        (lead) => lead.email?.toLowerCase() === visitorEmail.toLowerCase(),
      )
    : null;

  if (existing) {
    conversation = updateConversation(conversation.id, conversation.workspaceId, {
      crmLeadId: existing.id,
      visitorEmail: existing.email,
      visitorName:
        visitorName ||
        [existing.firstName, existing.lastName].filter(Boolean).join(" "),
      visitorPhone: visitorPhone || existing.phone,
    });
    return conversation;
  }

  const { firstName, lastName } = splitName(
    visitorName || (visitorEmail ? visitorEmail.split("@")[0] : "Chat visitor"),
  );

  const lead = createLead({
    workspaceId: conversation.workspaceId,
    firstName,
    lastName,
    email: visitorEmail,
    phone: visitorPhone,
    source: "website",
    status: "new",
    companyName: null,
    jobTitle: null,
  });

  conversation = updateConversation(conversation.id, conversation.workspaceId, {
    crmLeadId: lead.id,
  });

  if (conversation.visitorId) {
    upsertMemory({
      botId: input.bot.id,
      workspaceId: conversation.workspaceId,
      visitorKey: conversation.visitorId,
      key: "crm_lead_id",
      value: lead.id,
      source: "lead_capture",
    });
  }

  createMessage({
    conversationId: conversation.id,
    botId: input.bot.id,
    workspaceId: conversation.workspaceId,
    role: "system",
    content: `Lead saved to CRM (${lead.id}).`,
    channel: conversation.channel,
    metadata: { crmLeadId: lead.id },
  });

  return getConversationById(conversation.id)!;
}

function asStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
