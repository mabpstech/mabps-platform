import {
  createContact,
  createLead,
  listContacts as listCrmContacts,
  listLeads,
  updateContact,
} from "@/lib/crm/repository";
import { normalizeEmail } from "@/lib/email-engine/defaults";
import {
  ensureWorkspaceEmail,
  listContacts as listEmailContacts,
  upsertContact,
} from "@/lib/email-engine/repository";
import type { EmailContact } from "@/lib/email-engine/types";

function splitName(fullName: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "Email", lastName: "Contact" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

/**
 * Upsert an email contact and sync identity into CRM contact + lead.
 */
export function syncEmailContactToCrm(input: {
  workspaceId: string;
  email: string;
  name?: string | null;
}): EmailContact {
  const settings = ensureWorkspaceEmail(input.workspaceId);
  const email = normalizeEmail(input.email);
  let contact = upsertContact({
    workspaceId: input.workspaceId,
    email,
    name: input.name,
  });

  if (!settings.crmSyncEnabled) return contact;

  const { firstName, lastName } = splitName(input.name);

  let crmContact = listCrmContacts(input.workspaceId, {
    q: email,
    limit: 50,
  }).find((row) => normalizeEmail(row.email || "") === email);

  if (!crmContact) {
    crmContact = createContact({
      workspaceId: input.workspaceId,
      firstName,
      lastName,
      email,
    });
  } else if (input.name && !crmContact.firstName) {
    crmContact = updateContact(crmContact.id, input.workspaceId, {
      firstName,
      lastName,
      email,
    });
  } else if (!crmContact.email) {
    crmContact = updateContact(crmContact.id, input.workspaceId, {
      email,
    });
  }

  let crmLead = listLeads(input.workspaceId, { q: email, limit: 50 }).find(
    (lead) => normalizeEmail(lead.email || "") === email,
  );

  if (!crmLead) {
    crmLead = createLead({
      workspaceId: input.workspaceId,
      firstName,
      lastName,
      email,
      contactId: crmContact.id,
      source: "other",
      status: "new",
    });
  }

  contact = upsertContact({
    workspaceId: input.workspaceId,
    email,
    name: input.name ?? contact.name,
    crmContactId: crmContact.id,
    crmLeadId: crmLead.id,
  });

  return contact;
}

export function syncAllEmailContactsToCrm(workspaceId: string): {
  synced: number;
  contacts: EmailContact[];
} {
  const settings = ensureWorkspaceEmail(workspaceId);
  if (!settings.crmSyncEnabled) {
    return { synced: 0, contacts: [] };
  }

  const existing = listEmailContacts(workspaceId, { limit: 500 });
  const synced: EmailContact[] = [];
  for (const contact of existing) {
    synced.push(
      syncEmailContactToCrm({
        workspaceId,
        email: contact.email,
        name: contact.name,
      }),
    );
  }
  return { synced: synced.length, contacts: synced };
}
