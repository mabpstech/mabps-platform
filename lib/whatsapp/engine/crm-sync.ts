import {
  createContact,
  createLead,
  listContacts as listCrmContacts,
  listLeads,
  updateContact,
} from "@/lib/crm/repository";
import { normalizePhone } from "@/lib/whatsapp/defaults";
import {
  ensureWorkspaceWhatsApp,
  listContacts as listWhatsAppContacts,
  upsertContact,
} from "@/lib/whatsapp/repository";
import type { WhatsAppContact } from "@/lib/whatsapp/types";

function splitName(fullName: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "WhatsApp", lastName: "Contact" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

/**
 * Upsert a WhatsApp contact and sync phone identity into CRM contact + lead.
 */
export function syncWhatsAppContactToCrm(input: {
  workspaceId: string;
  waId: string;
  phone?: string;
  profileName?: string | null;
}): WhatsAppContact {
  const settings = ensureWorkspaceWhatsApp(input.workspaceId);
  const phone = normalizePhone(input.phone || input.waId);
  let contact = upsertContact({
    workspaceId: input.workspaceId,
    waId: input.waId,
    phone,
    profileName: input.profileName,
  });

  if (!settings.crmSyncEnabled) return contact;

  const displayPhone = phone.startsWith("+") ? phone : `+${phone}`;
  const { firstName, lastName } = splitName(input.profileName);

  let crmContact = listCrmContacts(input.workspaceId, {
    q: phone,
    limit: 50,
  }).find((row) => normalizePhone(row.phone || "") === phone);

  if (!crmContact) {
    crmContact = createContact({
      workspaceId: input.workspaceId,
      firstName,
      lastName,
      phone: displayPhone,
    });
  } else if (input.profileName && !crmContact.firstName) {
    crmContact = updateContact(crmContact.id, input.workspaceId, {
      firstName,
      lastName,
      phone: displayPhone,
    });
  } else if (!crmContact.phone) {
    crmContact = updateContact(crmContact.id, input.workspaceId, {
      phone: displayPhone,
    });
  }

  let crmLead = listLeads(input.workspaceId, { q: phone, limit: 50 }).find(
    (lead) => normalizePhone(lead.phone || "") === phone,
  );

  if (!crmLead) {
    crmLead = createLead({
      workspaceId: input.workspaceId,
      firstName,
      lastName,
      phone: displayPhone,
      contactId: crmContact.id,
      source: "other",
      status: "new",
    });
  }

  contact = upsertContact({
    workspaceId: input.workspaceId,
    waId: input.waId,
    phone,
    profileName: input.profileName ?? contact.profileName,
    crmContactId: crmContact.id,
    crmLeadId: crmLead.id,
  });

  return contact;
}

export function syncAllWhatsAppContactsToCrm(workspaceId: string): {
  synced: number;
  contacts: WhatsAppContact[];
} {
  const settings = ensureWorkspaceWhatsApp(workspaceId);
  if (!settings.crmSyncEnabled) {
    return { synced: 0, contacts: [] };
  }

  const existing = listWhatsAppContacts(workspaceId, { limit: 500 });
  const synced: WhatsAppContact[] = [];
  for (const contact of existing) {
    synced.push(
      syncWhatsAppContactToCrm({
        workspaceId,
        waId: contact.waId,
        phone: contact.phone,
        profileName: contact.profileName,
      }),
    );
  }
  return { synced: synced.length, contacts: synced };
}
