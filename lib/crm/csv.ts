import {
  createCompany,
  createContact,
  createCustomer,
  createDeal,
  createLead,
  ensureWorkspaceCrm,
  listCompanies,
  listContacts,
  listCustomers,
  listDeals,
  listLeads,
} from "@/lib/crm/repository";
import type {
  CrmExportEntity,
  CustomerLifecycleStage,
  CustomerStatus,
  LeadSource,
  LeadStatus,
} from "@/lib/crm/types";

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function rowsToCsv(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  return `${lines.join("\n")}\n`;
}

export function parseCsv(text: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    if (char === '"') {
      if (inQuotes && normalized[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "\n" && !inQuotes) {
      lines.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current.length) lines.push(current);

  const nonEmpty = lines.filter((line) => line.trim().length > 0);
  if (!nonEmpty.length) {
    return { headers: [], rows: [] };
  }

  const headers = splitCsvLine(nonEmpty[0]).map((header) => header.trim());
  const rows = nonEmpty.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = (cells[index] ?? "").trim();
    });
    return record;
  });

  return { headers, rows };
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}

function getField(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const match = Object.keys(row).find(
      (candidate) => candidate.toLowerCase() === key.toLowerCase(),
    );
    if (match && row[match]) return row[match];
  }
  return "";
}

export function exportCrmCsv(
  workspaceId: string,
  entity: CrmExportEntity,
): { filename: string; csv: string } {
  ensureWorkspaceCrm(workspaceId);

  switch (entity) {
    case "companies": {
      const companies = listCompanies(workspaceId, { limit: 5000 });
      return {
        filename: "crm-companies.csv",
        csv: rowsToCsv(
          [
            "name",
            "domain",
            "industry",
            "email",
            "phone",
            "website",
            "city",
            "country",
            "description",
          ],
          companies.map((company) => [
            company.name,
            company.domain,
            company.industry,
            company.email,
            company.phone,
            company.website,
            company.city,
            company.country,
            company.description,
          ]),
        ),
      };
    }
    case "contacts": {
      const contacts = listContacts(workspaceId, { limit: 5000 });
      return {
        filename: "crm-contacts.csv",
        csv: rowsToCsv(
          [
            "firstName",
            "lastName",
            "email",
            "phone",
            "jobTitle",
            "status",
            "companyId",
          ],
          contacts.map((contact) => [
            contact.firstName,
            contact.lastName,
            contact.email,
            contact.phone,
            contact.jobTitle,
            contact.status,
            contact.companyId,
          ]),
        ),
      };
    }
    case "leads": {
      const leads = listLeads(workspaceId, { limit: 5000 });
      return {
        filename: "crm-leads.csv",
        csv: rowsToCsv(
          [
            "firstName",
            "lastName",
            "email",
            "phone",
            "companyName",
            "jobTitle",
            "source",
            "status",
            "score",
          ],
          leads.map((lead) => [
            lead.firstName,
            lead.lastName,
            lead.email,
            lead.phone,
            lead.companyName,
            lead.jobTitle,
            lead.source,
            lead.status,
            lead.score,
          ]),
        ),
      };
    }
    case "customers": {
      const customers = listCustomers(workspaceId, { limit: 5000 });
      return {
        filename: "crm-customers.csv",
        csv: rowsToCsv(
          [
            "displayName",
            "email",
            "phone",
            "status",
            "lifecycleStage",
            "companyId",
            "contactId",
            "acquiredAt",
          ],
          customers.map((customer) => [
            customer.displayName,
            customer.email,
            customer.phone,
            customer.status,
            customer.lifecycleStage,
            customer.companyId,
            customer.contactId,
            customer.acquiredAt,
          ]),
        ),
      };
    }
    case "deals": {
      const deals = listDeals(workspaceId, { limit: 5000 });
      return {
        filename: "crm-deals.csv",
        csv: rowsToCsv(
          [
            "title",
            "amountCents",
            "currency",
            "status",
            "stageId",
            "customerId",
            "companyId",
            "contactId",
            "expectedCloseDate",
            "description",
          ],
          deals.map((deal) => [
            deal.title,
            deal.amountCents,
            deal.currency,
            deal.status,
            deal.stageId,
            deal.customerId,
            deal.companyId,
            deal.contactId,
            deal.expectedCloseDate,
            deal.description,
          ]),
        ),
      };
    }
    default:
      throw new Error("Unsupported export entity.");
  }
}

export function importCrmCsv(input: {
  workspaceId: string;
  entity: CrmExportEntity;
  csvText: string;
  actorUserId?: string | null;
}): { imported: number; errors: string[] } {
  ensureWorkspaceCrm(input.workspaceId);
  const { rows } = parseCsv(input.csvText);
  if (!rows.length) {
    throw new Error("CSV has no data rows.");
  }

  const errors: string[] = [];
  let imported = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    try {
      switch (input.entity) {
        case "companies": {
          const name = getField(row, "name", "company", "companyName");
          if (!name) throw new Error("name is required");
          createCompany({
            workspaceId: input.workspaceId,
            name,
            domain: getField(row, "domain") || null,
            industry: getField(row, "industry") || null,
            email: getField(row, "email") || null,
            phone: getField(row, "phone") || null,
            website: getField(row, "website") || null,
            city: getField(row, "city") || null,
            country: getField(row, "country") || null,
            description: getField(row, "description") || null,
            ownerUserId: input.actorUserId,
          });
          break;
        }
        case "contacts": {
          const firstName = getField(row, "firstName", "first_name", "name");
          if (!firstName) throw new Error("firstName is required");
          createContact({
            workspaceId: input.workspaceId,
            firstName,
            lastName: getField(row, "lastName", "last_name"),
            email: getField(row, "email") || null,
            phone: getField(row, "phone") || null,
            jobTitle: getField(row, "jobTitle", "title") || null,
            companyId: getField(row, "companyId") || null,
            status: (getField(row, "status") as "active" | "inactive") || "active",
            ownerUserId: input.actorUserId,
          });
          break;
        }
        case "leads": {
          const firstName = getField(row, "firstName", "first_name", "name");
          if (!firstName) throw new Error("firstName is required");
          createLead({
            workspaceId: input.workspaceId,
            firstName,
            lastName: getField(row, "lastName", "last_name"),
            email: getField(row, "email") || null,
            phone: getField(row, "phone") || null,
            companyName: getField(row, "companyName", "company") || null,
            jobTitle: getField(row, "jobTitle", "title") || null,
            source: (getField(row, "source") as LeadSource) || "import",
            status: (getField(row, "status") as LeadStatus) || "new",
            score: Number(getField(row, "score") || 0),
            ownerUserId: input.actorUserId,
          });
          break;
        }
        case "customers": {
          const displayName = getField(row, "displayName", "name");
          if (!displayName) throw new Error("displayName is required");
          createCustomer({
            workspaceId: input.workspaceId,
            displayName,
            email: getField(row, "email") || null,
            phone: getField(row, "phone") || null,
            status: (getField(row, "status") as CustomerStatus) || "active",
            lifecycleStage:
              (getField(row, "lifecycleStage") as CustomerLifecycleStage) ||
              "customer",
            companyId: getField(row, "companyId") || null,
            contactId: getField(row, "contactId") || null,
            acquiredAt: getField(row, "acquiredAt") || null,
            ownerUserId: input.actorUserId,
            actorUserId: input.actorUserId,
          });
          break;
        }
        case "deals": {
          const title = getField(row, "title", "name");
          if (!title) throw new Error("title is required");
          createDeal({
            workspaceId: input.workspaceId,
            title,
            amountCents: Number(getField(row, "amountCents", "amount") || 0),
            currency: getField(row, "currency") || "USD",
            stageId: getField(row, "stageId") || undefined,
            customerId: getField(row, "customerId") || null,
            companyId: getField(row, "companyId") || null,
            contactId: getField(row, "contactId") || null,
            expectedCloseDate: getField(row, "expectedCloseDate") || null,
            description: getField(row, "description") || null,
            ownerUserId: input.actorUserId,
            actorUserId: input.actorUserId,
          });
          break;
        }
        default:
          throw new Error("Unsupported import entity.");
      }
      imported += 1;
    } catch (error) {
      errors.push(
        `Row ${rowNumber}: ${error instanceof Error ? error.message : "Invalid row"}`,
      );
    }
  });

  return { imported, errors };
}
