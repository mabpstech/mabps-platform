import { randomUUID } from "node:crypto";
import {
  DEFAULT_PIPELINE_NAME,
  DEFAULT_PIPELINE_STAGES,
  contactDisplayName,
} from "@/lib/crm/defaults";
import { migrateCrmSchema } from "@/lib/crm/migrate";
import type {
  ActivityType,
  ContactStatus,
  CrmActivity,
  CrmCompany,
  CrmContact,
  CrmCustomer,
  CrmDeal,
  CrmLead,
  CrmListFilters,
  CrmNote,
  CrmOverviewStats,
  CrmPipeline,
  CrmPipelineBoard,
  CrmPipelineStage,
  CrmTag,
  CrmTask,
  CrmTimelineEvent,
  CustomerLifecycleStage,
  CustomerStatus,
  DealStatus,
  LeadSource,
  LeadStatus,
  TaskPriority,
  TaskStatus,
  TimelineEventType,
  CrmEntityType,
} from "@/lib/crm/types";
import { sqlite } from "@/lib/db";

function nowIso(): string {
  return new Date().toISOString();
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function asStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function likePattern(q: string): string {
  return `%${q.replace(/[%_]/g, "")}%`;
}

export function ensureCrmReady(): void {
  migrateCrmSchema();
}

function ensureDefaultPipeline(workspaceId: string): CrmPipeline {
  ensureCrmReady();
  const existing = sqlite
    .prepare(
      `SELECT * FROM "crm_pipeline" WHERE "workspaceId" = ? AND "isDefault" = 1 LIMIT 1`,
    )
    .get(workspaceId) as Record<string, unknown> | undefined;

  if (existing) {
    return rowToPipeline(existing);
  }

  const timestamp = nowIso();
  const pipelineId = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "crm_pipeline" (
        "id", "workspaceId", "name", "isDefault", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, 1, ?, ?)`,
    )
    .run(pipelineId, workspaceId, DEFAULT_PIPELINE_NAME, timestamp, timestamp);

  for (const [index, stage] of DEFAULT_PIPELINE_STAGES.entries()) {
    sqlite
      .prepare(
        `INSERT INTO "crm_pipeline_stage" (
          "id", "pipelineId", "workspaceId", "name", "sortOrder", "color",
          "probability", "isWon", "isLost", "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        randomUUID(),
        pipelineId,
        workspaceId,
        stage.name,
        index,
        stage.color,
        stage.probability,
        stage.isWon ? 1 : 0,
        stage.isLost ? 1 : 0,
        timestamp,
        timestamp,
      );
  }

  return getPipelineById(pipelineId)!;
}

export function ensureWorkspaceCrm(workspaceId: string): CrmPipeline {
  return ensureDefaultPipeline(workspaceId);
}

/* -------------------------------------------------------------------------- */
/* Row mappers                                                                */
/* -------------------------------------------------------------------------- */

function rowToCompany(row: Record<string, unknown>): CrmCompany {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    name: String(row.name),
    domain: asStringOrNull(row.domain),
    industry: asStringOrNull(row.industry),
    phone: asStringOrNull(row.phone),
    email: asStringOrNull(row.email),
    website: asStringOrNull(row.website),
    address: asStringOrNull(row.address),
    city: asStringOrNull(row.city),
    state: asStringOrNull(row.state),
    country: asStringOrNull(row.country),
    postalCode: asStringOrNull(row.postalCode),
    description: asStringOrNull(row.description),
    ownerUserId: asStringOrNull(row.ownerUserId),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToContact(row: Record<string, unknown>): CrmContact {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    companyId: asStringOrNull(row.companyId),
    firstName: String(row.firstName),
    lastName: String(row.lastName ?? ""),
    email: asStringOrNull(row.email),
    phone: asStringOrNull(row.phone),
    jobTitle: asStringOrNull(row.jobTitle),
    status: (row.status as ContactStatus) || "active",
    ownerUserId: asStringOrNull(row.ownerUserId),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToLead(row: Record<string, unknown>): CrmLead {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    companyId: asStringOrNull(row.companyId),
    contactId: asStringOrNull(row.contactId),
    firstName: String(row.firstName),
    lastName: String(row.lastName ?? ""),
    email: asStringOrNull(row.email),
    phone: asStringOrNull(row.phone),
    companyName: asStringOrNull(row.companyName),
    jobTitle: asStringOrNull(row.jobTitle),
    source: (row.source as LeadSource) || "manual",
    status: (row.status as LeadStatus) || "new",
    score: Number(row.score ?? 0),
    ownerUserId: asStringOrNull(row.ownerUserId),
    convertedAt: asStringOrNull(row.convertedAt),
    convertedCustomerId: asStringOrNull(row.convertedCustomerId),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToCustomer(row: Record<string, unknown>): CrmCustomer {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    contactId: asStringOrNull(row.contactId),
    companyId: asStringOrNull(row.companyId),
    displayName: String(row.displayName),
    email: asStringOrNull(row.email),
    phone: asStringOrNull(row.phone),
    status: (row.status as CustomerStatus) || "active",
    lifecycleStage: (row.lifecycleStage as CustomerLifecycleStage) || "customer",
    ownerUserId: asStringOrNull(row.ownerUserId),
    acquiredAt: asStringOrNull(row.acquiredAt),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToPipeline(row: Record<string, unknown>): CrmPipeline {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    name: String(row.name),
    isDefault: Boolean(row.isDefault),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToStage(row: Record<string, unknown>): CrmPipelineStage {
  return {
    id: String(row.id),
    pipelineId: String(row.pipelineId),
    workspaceId: String(row.workspaceId),
    name: String(row.name),
    sortOrder: Number(row.sortOrder ?? 0),
    color: String(row.color ?? "#71717a"),
    probability: Number(row.probability ?? 0),
    isWon: Boolean(row.isWon),
    isLost: Boolean(row.isLost),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToDeal(row: Record<string, unknown>): CrmDeal {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    pipelineId: String(row.pipelineId),
    stageId: String(row.stageId),
    title: String(row.title),
    amountCents: Number(row.amountCents ?? 0),
    currency: String(row.currency ?? "USD"),
    contactId: asStringOrNull(row.contactId),
    companyId: asStringOrNull(row.companyId),
    customerId: asStringOrNull(row.customerId),
    leadId: asStringOrNull(row.leadId),
    ownerUserId: asStringOrNull(row.ownerUserId),
    expectedCloseDate: asStringOrNull(row.expectedCloseDate),
    closedAt: asStringOrNull(row.closedAt),
    status: (row.status as DealStatus) || "open",
    probability: Number(row.probability ?? 0),
    description: asStringOrNull(row.description),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToNote(row: Record<string, unknown>): CrmNote {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    entityType: row.entityType as CrmEntityType,
    entityId: String(row.entityId),
    body: String(row.body),
    createdByUserId: asStringOrNull(row.createdByUserId),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToActivity(row: Record<string, unknown>): CrmActivity {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    entityType: row.entityType as CrmEntityType,
    entityId: String(row.entityId),
    type: row.type as ActivityType,
    subject: String(row.subject),
    body: asStringOrNull(row.body),
    occurredAt: String(row.occurredAt),
    createdByUserId: asStringOrNull(row.createdByUserId),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToTask(row: Record<string, unknown>): CrmTask {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    entityType: row.entityType ? (row.entityType as CrmEntityType) : null,
    entityId: asStringOrNull(row.entityId),
    title: String(row.title),
    description: asStringOrNull(row.description),
    status: (row.status as TaskStatus) || "open",
    priority: (row.priority as TaskPriority) || "medium",
    dueAt: asStringOrNull(row.dueAt),
    assigneeUserId: asStringOrNull(row.assigneeUserId),
    createdByUserId: asStringOrNull(row.createdByUserId),
    completedAt: asStringOrNull(row.completedAt),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToTag(row: Record<string, unknown>): CrmTag {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    name: String(row.name),
    color: String(row.color ?? "#3f3f46"),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToTimeline(row: Record<string, unknown>): CrmTimelineEvent {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    customerId: String(row.customerId),
    entityType: row.entityType as CrmEntityType,
    entityId: asStringOrNull(row.entityId),
    eventType: row.eventType as TimelineEventType,
    title: String(row.title),
    summary: asStringOrNull(row.summary),
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
    actorUserId: asStringOrNull(row.actorUserId),
    occurredAt: String(row.occurredAt),
    createdAt: String(row.createdAt),
  };
}

/* -------------------------------------------------------------------------- */
/* Timeline                                                                   */
/* -------------------------------------------------------------------------- */

function resolveCustomerIdsForEntity(
  workspaceId: string,
  entityType: CrmEntityType,
  entityId: string,
): string[] {
  if (entityType === "customer") {
    const customer = getCustomerById(entityId);
    return customer && customer.workspaceId === workspaceId ? [customer.id] : [];
  }

  if (entityType === "contact") {
    const rows = sqlite
      .prepare(
        `SELECT "id" FROM "crm_customer" WHERE "workspaceId" = ? AND "contactId" = ?`,
      )
      .all(workspaceId, entityId) as Array<{ id: string }>;
    return rows.map((row) => row.id);
  }

  if (entityType === "company") {
    const rows = sqlite
      .prepare(
        `SELECT "id" FROM "crm_customer" WHERE "workspaceId" = ? AND "companyId" = ?`,
      )
      .all(workspaceId, entityId) as Array<{ id: string }>;
    return rows.map((row) => row.id);
  }

  if (entityType === "deal") {
    const deal = getDealById(entityId);
    return deal?.customerId && deal.workspaceId === workspaceId
      ? [deal.customerId]
      : [];
  }

  if (entityType === "lead") {
    const lead = getLeadById(entityId);
    return lead?.convertedCustomerId && lead.workspaceId === workspaceId
      ? [lead.convertedCustomerId]
      : [];
  }

  return [];
}

export function addTimelineEvent(input: {
  workspaceId: string;
  customerId: string;
  entityType: CrmEntityType;
  entityId?: string | null;
  eventType: TimelineEventType;
  title: string;
  summary?: string | null;
  metadata?: Record<string, unknown>;
  actorUserId?: string | null;
  occurredAt?: string;
}): CrmTimelineEvent {
  ensureCrmReady();
  const timestamp = nowIso();
  const id = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "crm_timeline_event" (
        "id", "workspaceId", "customerId", "entityType", "entityId",
        "eventType", "title", "summary", "metadata", "actorUserId",
        "occurredAt", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      input.customerId,
      input.entityType,
      input.entityId ?? null,
      input.eventType,
      input.title,
      input.summary ?? null,
      JSON.stringify(input.metadata ?? {}),
      input.actorUserId ?? null,
      input.occurredAt ?? timestamp,
      timestamp,
    );
  return getTimelineEventById(id)!;
}

function fanOutTimeline(
  workspaceId: string,
  entityType: CrmEntityType,
  entityId: string,
  event: Omit<
    Parameters<typeof addTimelineEvent>[0],
    "workspaceId" | "customerId"
  >,
): void {
  const customerIds = resolveCustomerIdsForEntity(
    workspaceId,
    entityType,
    entityId,
  );
  for (const customerId of customerIds) {
    addTimelineEvent({
      workspaceId,
      customerId,
      ...event,
    });
  }
}

export function getTimelineEventById(id: string): CrmTimelineEvent | null {
  ensureCrmReady();
  const row = sqlite
    .prepare(`SELECT * FROM "crm_timeline_event" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToTimeline(row) : null;
}

export function listCustomerTimeline(
  workspaceId: string,
  customerId: string,
  filters: CrmListFilters = {},
): CrmTimelineEvent[] {
  ensureCrmReady();
  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  const rows = sqlite
    .prepare(
      `SELECT * FROM "crm_timeline_event"
       WHERE "workspaceId" = ? AND "customerId" = ?
       ORDER BY "occurredAt" DESC, "createdAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(workspaceId, customerId, limit, offset) as Record<string, unknown>[];
  return rows.map(rowToTimeline);
}

/* -------------------------------------------------------------------------- */
/* Companies                                                                  */
/* -------------------------------------------------------------------------- */

export function getCompanyById(id: string): CrmCompany | null {
  ensureCrmReady();
  const row = sqlite
    .prepare(`SELECT * FROM "crm_company" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToCompany(row) : null;
}

export function listCompanies(
  workspaceId: string,
  filters: CrmListFilters = {},
): CrmCompany[] {
  ensureCrmReady();
  ensureDefaultPipeline(workspaceId);
  const clauses = [`c."workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.q) {
    clauses.push(
      `(c."name" LIKE ? OR c."domain" LIKE ? OR c."email" LIKE ? OR c."industry" LIKE ?)`,
    );
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern, pattern, pattern);
  }
  if (filters.ownerUserId) {
    clauses.push(`c."ownerUserId" = ?`);
    params.push(filters.ownerUserId);
  }
  if (filters.tagId) {
    clauses.push(
      `EXISTS (
        SELECT 1 FROM "crm_tag_link" tl
        WHERE tl."entityType" = 'company' AND tl."entityId" = c."id" AND tl."tagId" = ?
      )`,
    );
    params.push(filters.tagId);
  }

  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const rows = sqlite
    .prepare(
      `SELECT c.* FROM "crm_company" c
       WHERE ${clauses.join(" AND ")}
       ORDER BY c."name" COLLATE NOCASE ASC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToCompany);
}

export function createCompany(input: {
  workspaceId: string;
  name: string;
  domain?: string | null;
  industry?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  description?: string | null;
  ownerUserId?: string | null;
}): CrmCompany {
  ensureCrmReady();
  ensureDefaultPipeline(input.workspaceId);
  const name = input.name.trim();
  if (!name) throw new Error("Company name is required.");

  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "crm_company" (
        "id", "workspaceId", "name", "domain", "industry", "phone", "email",
        "website", "address", "city", "state", "country", "postalCode",
        "description", "ownerUserId", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      name,
      asStringOrNull(input.domain),
      asStringOrNull(input.industry),
      asStringOrNull(input.phone),
      asStringOrNull(input.email),
      asStringOrNull(input.website),
      asStringOrNull(input.address),
      asStringOrNull(input.city),
      asStringOrNull(input.state),
      asStringOrNull(input.country),
      asStringOrNull(input.postalCode),
      asStringOrNull(input.description),
      asStringOrNull(input.ownerUserId),
      timestamp,
      timestamp,
    );
  return getCompanyById(id)!;
}

export function updateCompany(
  id: string,
  workspaceId: string,
  input: Partial<{
    name: string;
    domain: string | null;
    industry: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postalCode: string | null;
    description: string | null;
    ownerUserId: string | null;
  }>,
): CrmCompany {
  ensureCrmReady();
  const existing = getCompanyById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Company not found.");
  }

  const next = {
    name: input.name !== undefined ? input.name.trim() : existing.name,
    domain: input.domain !== undefined ? asStringOrNull(input.domain) : existing.domain,
    industry:
      input.industry !== undefined
        ? asStringOrNull(input.industry)
        : existing.industry,
    phone: input.phone !== undefined ? asStringOrNull(input.phone) : existing.phone,
    email: input.email !== undefined ? asStringOrNull(input.email) : existing.email,
    website:
      input.website !== undefined ? asStringOrNull(input.website) : existing.website,
    address:
      input.address !== undefined ? asStringOrNull(input.address) : existing.address,
    city: input.city !== undefined ? asStringOrNull(input.city) : existing.city,
    state: input.state !== undefined ? asStringOrNull(input.state) : existing.state,
    country:
      input.country !== undefined ? asStringOrNull(input.country) : existing.country,
    postalCode:
      input.postalCode !== undefined
        ? asStringOrNull(input.postalCode)
        : existing.postalCode,
    description:
      input.description !== undefined
        ? asStringOrNull(input.description)
        : existing.description,
    ownerUserId:
      input.ownerUserId !== undefined
        ? asStringOrNull(input.ownerUserId)
        : existing.ownerUserId,
  };

  if (!next.name) throw new Error("Company name is required.");

  sqlite
    .prepare(
      `UPDATE "crm_company" SET
        "name" = ?, "domain" = ?, "industry" = ?, "phone" = ?, "email" = ?,
        "website" = ?, "address" = ?, "city" = ?, "state" = ?, "country" = ?,
        "postalCode" = ?, "description" = ?, "ownerUserId" = ?, "updatedAt" = ?
       WHERE "id" = ?`,
    )
    .run(
      next.name,
      next.domain,
      next.industry,
      next.phone,
      next.email,
      next.website,
      next.address,
      next.city,
      next.state,
      next.country,
      next.postalCode,
      next.description,
      next.ownerUserId,
      nowIso(),
      id,
    );
  return getCompanyById(id)!;
}

export function deleteCompany(id: string, workspaceId: string): void {
  ensureCrmReady();
  const existing = getCompanyById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Company not found.");
  }
  sqlite.prepare(`DELETE FROM "crm_company" WHERE "id" = ?`).run(id);
  sqlite
    .prepare(
      `DELETE FROM "crm_tag_link" WHERE "workspaceId" = ? AND "entityType" = 'company' AND "entityId" = ?`,
    )
    .run(workspaceId, id);
}

/* -------------------------------------------------------------------------- */
/* Contacts                                                                   */
/* -------------------------------------------------------------------------- */

export function getContactById(id: string): CrmContact | null {
  ensureCrmReady();
  const row = sqlite
    .prepare(`SELECT * FROM "crm_contact" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToContact(row) : null;
}

export function listContacts(
  workspaceId: string,
  filters: CrmListFilters = {},
): CrmContact[] {
  ensureCrmReady();
  ensureDefaultPipeline(workspaceId);
  const clauses = [`c."workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.q) {
    clauses.push(
      `(c."firstName" LIKE ? OR c."lastName" LIKE ? OR c."email" LIKE ? OR c."phone" LIKE ? OR c."jobTitle" LIKE ?)`,
    );
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern, pattern, pattern, pattern);
  }
  if (filters.status) {
    clauses.push(`c."status" = ?`);
    params.push(filters.status);
  }
  if (filters.companyId) {
    clauses.push(`c."companyId" = ?`);
    params.push(filters.companyId);
  }
  if (filters.ownerUserId) {
    clauses.push(`c."ownerUserId" = ?`);
    params.push(filters.ownerUserId);
  }
  if (filters.tagId) {
    clauses.push(
      `EXISTS (
        SELECT 1 FROM "crm_tag_link" tl
        WHERE tl."entityType" = 'contact' AND tl."entityId" = c."id" AND tl."tagId" = ?
      )`,
    );
    params.push(filters.tagId);
  }

  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const rows = sqlite
    .prepare(
      `SELECT c.* FROM "crm_contact" c
       WHERE ${clauses.join(" AND ")}
       ORDER BY c."firstName" COLLATE NOCASE ASC, c."lastName" COLLATE NOCASE ASC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToContact);
}

export function createContact(input: {
  workspaceId: string;
  firstName: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  companyId?: string | null;
  status?: ContactStatus;
  ownerUserId?: string | null;
}): CrmContact {
  ensureCrmReady();
  ensureDefaultPipeline(input.workspaceId);
  const firstName = input.firstName.trim();
  if (!firstName) throw new Error("First name is required.");

  if (input.companyId) {
    const company = getCompanyById(input.companyId);
    if (!company || company.workspaceId !== input.workspaceId) {
      throw new Error("Company not found.");
    }
  }

  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "crm_contact" (
        "id", "workspaceId", "companyId", "firstName", "lastName", "email",
        "phone", "jobTitle", "status", "ownerUserId", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      asStringOrNull(input.companyId),
      firstName,
      (input.lastName ?? "").trim(),
      asStringOrNull(input.email),
      asStringOrNull(input.phone),
      asStringOrNull(input.jobTitle),
      input.status ?? "active",
      asStringOrNull(input.ownerUserId),
      timestamp,
      timestamp,
    );
  return getContactById(id)!;
}

export function updateContact(
  id: string,
  workspaceId: string,
  input: Partial<{
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    jobTitle: string | null;
    companyId: string | null;
    status: ContactStatus;
    ownerUserId: string | null;
  }>,
): CrmContact {
  ensureCrmReady();
  const existing = getContactById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Contact not found.");
  }

  if (input.companyId) {
    const company = getCompanyById(input.companyId);
    if (!company || company.workspaceId !== workspaceId) {
      throw new Error("Company not found.");
    }
  }

  const next = {
    firstName:
      input.firstName !== undefined ? input.firstName.trim() : existing.firstName,
    lastName:
      input.lastName !== undefined ? input.lastName.trim() : existing.lastName,
    email: input.email !== undefined ? asStringOrNull(input.email) : existing.email,
    phone: input.phone !== undefined ? asStringOrNull(input.phone) : existing.phone,
    jobTitle:
      input.jobTitle !== undefined
        ? asStringOrNull(input.jobTitle)
        : existing.jobTitle,
    companyId:
      input.companyId !== undefined
        ? asStringOrNull(input.companyId)
        : existing.companyId,
    status: input.status ?? existing.status,
    ownerUserId:
      input.ownerUserId !== undefined
        ? asStringOrNull(input.ownerUserId)
        : existing.ownerUserId,
  };

  if (!next.firstName) throw new Error("First name is required.");

  sqlite
    .prepare(
      `UPDATE "crm_contact" SET
        "firstName" = ?, "lastName" = ?, "email" = ?, "phone" = ?,
        "jobTitle" = ?, "companyId" = ?, "status" = ?, "ownerUserId" = ?,
        "updatedAt" = ?
       WHERE "id" = ?`,
    )
    .run(
      next.firstName,
      next.lastName,
      next.email,
      next.phone,
      next.jobTitle,
      next.companyId,
      next.status,
      next.ownerUserId,
      nowIso(),
      id,
    );
  return getContactById(id)!;
}

export function deleteContact(id: string, workspaceId: string): void {
  ensureCrmReady();
  const existing = getContactById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Contact not found.");
  }
  sqlite.prepare(`DELETE FROM "crm_contact" WHERE "id" = ?`).run(id);
  sqlite
    .prepare(
      `DELETE FROM "crm_tag_link" WHERE "workspaceId" = ? AND "entityType" = 'contact' AND "entityId" = ?`,
    )
    .run(workspaceId, id);
}

/* -------------------------------------------------------------------------- */
/* Leads                                                                      */
/* -------------------------------------------------------------------------- */

export function getLeadById(id: string): CrmLead | null {
  ensureCrmReady();
  const row = sqlite
    .prepare(`SELECT * FROM "crm_lead" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToLead(row) : null;
}

export function listLeads(
  workspaceId: string,
  filters: CrmListFilters = {},
): CrmLead[] {
  ensureCrmReady();
  ensureDefaultPipeline(workspaceId);
  const clauses = [`l."workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.q) {
    clauses.push(
      `(l."firstName" LIKE ? OR l."lastName" LIKE ? OR l."email" LIKE ? OR l."companyName" LIKE ? OR l."phone" LIKE ?)`,
    );
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern, pattern, pattern, pattern);
  }
  if (filters.status) {
    clauses.push(`l."status" = ?`);
    params.push(filters.status);
  }
  if (filters.source) {
    clauses.push(`l."source" = ?`);
    params.push(filters.source);
  }
  if (filters.companyId) {
    clauses.push(`l."companyId" = ?`);
    params.push(filters.companyId);
  }
  if (filters.ownerUserId) {
    clauses.push(`l."ownerUserId" = ?`);
    params.push(filters.ownerUserId);
  }
  if (filters.tagId) {
    clauses.push(
      `EXISTS (
        SELECT 1 FROM "crm_tag_link" tl
        WHERE tl."entityType" = 'lead' AND tl."entityId" = l."id" AND tl."tagId" = ?
      )`,
    );
    params.push(filters.tagId);
  }

  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const rows = sqlite
    .prepare(
      `SELECT l.* FROM "crm_lead" l
       WHERE ${clauses.join(" AND ")}
       ORDER BY l."updatedAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToLead);
}

export function createLead(input: {
  workspaceId: string;
  firstName: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  jobTitle?: string | null;
  companyId?: string | null;
  contactId?: string | null;
  source?: LeadSource;
  status?: LeadStatus;
  score?: number;
  ownerUserId?: string | null;
}): CrmLead {
  ensureCrmReady();
  ensureDefaultPipeline(input.workspaceId);
  const firstName = input.firstName.trim();
  if (!firstName) throw new Error("First name is required.");

  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "crm_lead" (
        "id", "workspaceId", "companyId", "contactId", "firstName", "lastName",
        "email", "phone", "companyName", "jobTitle", "source", "status",
        "score", "ownerUserId", "convertedAt", "convertedCustomerId",
        "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      asStringOrNull(input.companyId),
      asStringOrNull(input.contactId),
      firstName,
      (input.lastName ?? "").trim(),
      asStringOrNull(input.email),
      asStringOrNull(input.phone),
      asStringOrNull(input.companyName),
      asStringOrNull(input.jobTitle),
      input.source ?? "manual",
      input.status ?? "new",
      Math.max(0, Math.min(100, Number(input.score ?? 0))),
      asStringOrNull(input.ownerUserId),
      timestamp,
      timestamp,
    );
  return getLeadById(id)!;
}

export function updateLead(
  id: string,
  workspaceId: string,
  input: Partial<{
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    companyName: string | null;
    jobTitle: string | null;
    companyId: string | null;
    contactId: string | null;
    source: LeadSource;
    status: LeadStatus;
    score: number;
    ownerUserId: string | null;
  }>,
): CrmLead {
  ensureCrmReady();
  const existing = getLeadById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Lead not found.");
  }
  if (existing.status === "converted" && input.status && input.status !== "converted") {
    throw new Error("Converted leads cannot change status.");
  }

  const next = {
    firstName:
      input.firstName !== undefined ? input.firstName.trim() : existing.firstName,
    lastName:
      input.lastName !== undefined ? input.lastName.trim() : existing.lastName,
    email: input.email !== undefined ? asStringOrNull(input.email) : existing.email,
    phone: input.phone !== undefined ? asStringOrNull(input.phone) : existing.phone,
    companyName:
      input.companyName !== undefined
        ? asStringOrNull(input.companyName)
        : existing.companyName,
    jobTitle:
      input.jobTitle !== undefined
        ? asStringOrNull(input.jobTitle)
        : existing.jobTitle,
    companyId:
      input.companyId !== undefined
        ? asStringOrNull(input.companyId)
        : existing.companyId,
    contactId:
      input.contactId !== undefined
        ? asStringOrNull(input.contactId)
        : existing.contactId,
    source: input.source ?? existing.source,
    status: input.status ?? existing.status,
    score:
      input.score !== undefined
        ? Math.max(0, Math.min(100, Number(input.score)))
        : existing.score,
    ownerUserId:
      input.ownerUserId !== undefined
        ? asStringOrNull(input.ownerUserId)
        : existing.ownerUserId,
  };

  if (!next.firstName) throw new Error("First name is required.");

  sqlite
    .prepare(
      `UPDATE "crm_lead" SET
        "firstName" = ?, "lastName" = ?, "email" = ?, "phone" = ?,
        "companyName" = ?, "jobTitle" = ?, "companyId" = ?, "contactId" = ?,
        "source" = ?, "status" = ?, "score" = ?, "ownerUserId" = ?,
        "updatedAt" = ?
       WHERE "id" = ?`,
    )
    .run(
      next.firstName,
      next.lastName,
      next.email,
      next.phone,
      next.companyName,
      next.jobTitle,
      next.companyId,
      next.contactId,
      next.source,
      next.status,
      next.score,
      next.ownerUserId,
      nowIso(),
      id,
    );
  return getLeadById(id)!;
}

export function deleteLead(id: string, workspaceId: string): void {
  ensureCrmReady();
  const existing = getLeadById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Lead not found.");
  }
  sqlite.prepare(`DELETE FROM "crm_lead" WHERE "id" = ?`).run(id);
  sqlite
    .prepare(
      `DELETE FROM "crm_tag_link" WHERE "workspaceId" = ? AND "entityType" = 'lead' AND "entityId" = ?`,
    )
    .run(workspaceId, id);
}

export function convertLead(input: {
  leadId: string;
  workspaceId: string;
  actorUserId?: string | null;
  createDeal?: boolean;
  dealTitle?: string;
  dealAmountCents?: number;
}): {
  lead: CrmLead;
  contact: CrmContact;
  customer: CrmCustomer;
  company: CrmCompany | null;
  deal: CrmDeal | null;
} {
  ensureCrmReady();
  const lead = getLeadById(input.leadId);
  if (!lead || lead.workspaceId !== input.workspaceId) {
    throw new Error("Lead not found.");
  }
  if (lead.status === "converted") {
    throw new Error("Lead is already converted.");
  }

  let company: CrmCompany | null = lead.companyId
    ? getCompanyById(lead.companyId)
    : null;

  if (!company && lead.companyName) {
    company = createCompany({
      workspaceId: input.workspaceId,
      name: lead.companyName,
      ownerUserId: lead.ownerUserId,
    });
  }

  let contact = lead.contactId ? getContactById(lead.contactId) : null;
  if (!contact) {
    contact = createContact({
      workspaceId: input.workspaceId,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      jobTitle: lead.jobTitle,
      companyId: company?.id ?? null,
      ownerUserId: lead.ownerUserId,
    });
  }

  const customer = createCustomer({
    workspaceId: input.workspaceId,
    displayName: contactDisplayName(lead.firstName, lead.lastName),
    email: lead.email,
    phone: lead.phone,
    contactId: contact.id,
    companyId: company?.id ?? null,
    ownerUserId: lead.ownerUserId,
    actorUserId: input.actorUserId,
  });

  const timestamp = nowIso();
  sqlite
    .prepare(
      `UPDATE "crm_lead" SET
        "status" = 'converted',
        "contactId" = ?,
        "companyId" = ?,
        "convertedAt" = ?,
        "convertedCustomerId" = ?,
        "updatedAt" = ?
       WHERE "id" = ?`,
    )
    .run(
      contact.id,
      company?.id ?? null,
      timestamp,
      customer.id,
      timestamp,
      lead.id,
    );

  addTimelineEvent({
    workspaceId: input.workspaceId,
    customerId: customer.id,
    entityType: "lead",
    entityId: lead.id,
    eventType: "lead_converted",
    title: "Lead converted",
    summary: `${contactDisplayName(lead.firstName, lead.lastName)} became a customer`,
    actorUserId: input.actorUserId,
  });

  let deal: CrmDeal | null = null;
  if (input.createDeal) {
    const pipeline = ensureDefaultPipeline(input.workspaceId);
    const stages = listPipelineStages(pipeline.id);
    const openStage = stages.find((stage) => !stage.isWon && !stage.isLost);
    if (openStage) {
      deal = createDeal({
        workspaceId: input.workspaceId,
        pipelineId: pipeline.id,
        stageId: openStage.id,
        title:
          input.dealTitle?.trim() ||
          `Deal — ${contactDisplayName(lead.firstName, lead.lastName)}`,
        amountCents: input.dealAmountCents ?? 0,
        contactId: contact.id,
        companyId: company?.id ?? null,
        customerId: customer.id,
        leadId: lead.id,
        ownerUserId: lead.ownerUserId,
        actorUserId: input.actorUserId,
      });
    }
  }

  return {
    lead: getLeadById(lead.id)!,
    contact,
    customer,
    company,
    deal,
  };
}

/* -------------------------------------------------------------------------- */
/* Customers                                                                  */
/* -------------------------------------------------------------------------- */

export function getCustomerById(id: string): CrmCustomer | null {
  ensureCrmReady();
  const row = sqlite
    .prepare(`SELECT * FROM "crm_customer" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToCustomer(row) : null;
}

export function listCustomers(
  workspaceId: string,
  filters: CrmListFilters = {},
): CrmCustomer[] {
  ensureCrmReady();
  ensureDefaultPipeline(workspaceId);
  const clauses = [`c."workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.q) {
    clauses.push(
      `(c."displayName" LIKE ? OR c."email" LIKE ? OR c."phone" LIKE ?)`,
    );
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern, pattern);
  }
  if (filters.status) {
    clauses.push(`c."status" = ?`);
    params.push(filters.status);
  }
  if (filters.lifecycleStage) {
    clauses.push(`c."lifecycleStage" = ?`);
    params.push(filters.lifecycleStage);
  }
  if (filters.companyId) {
    clauses.push(`c."companyId" = ?`);
    params.push(filters.companyId);
  }
  if (filters.ownerUserId) {
    clauses.push(`c."ownerUserId" = ?`);
    params.push(filters.ownerUserId);
  }
  if (filters.tagId) {
    clauses.push(
      `EXISTS (
        SELECT 1 FROM "crm_tag_link" tl
        WHERE tl."entityType" = 'customer' AND tl."entityId" = c."id" AND tl."tagId" = ?
      )`,
    );
    params.push(filters.tagId);
  }

  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const rows = sqlite
    .prepare(
      `SELECT c.* FROM "crm_customer" c
       WHERE ${clauses.join(" AND ")}
       ORDER BY c."displayName" COLLATE NOCASE ASC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToCustomer);
}

export function createCustomer(input: {
  workspaceId: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  status?: CustomerStatus;
  lifecycleStage?: CustomerLifecycleStage;
  ownerUserId?: string | null;
  acquiredAt?: string | null;
  actorUserId?: string | null;
}): CrmCustomer {
  ensureCrmReady();
  ensureDefaultPipeline(input.workspaceId);
  const displayName = input.displayName.trim();
  if (!displayName) throw new Error("Customer name is required.");

  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "crm_customer" (
        "id", "workspaceId", "contactId", "companyId", "displayName", "email",
        "phone", "status", "lifecycleStage", "ownerUserId", "acquiredAt",
        "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      asStringOrNull(input.contactId),
      asStringOrNull(input.companyId),
      displayName,
      asStringOrNull(input.email),
      asStringOrNull(input.phone),
      input.status ?? "active",
      input.lifecycleStage ?? "customer",
      asStringOrNull(input.ownerUserId),
      asStringOrNull(input.acquiredAt) ?? timestamp,
      timestamp,
      timestamp,
    );

  addTimelineEvent({
    workspaceId: input.workspaceId,
    customerId: id,
    entityType: "customer",
    entityId: id,
    eventType: "customer_created",
    title: "Customer created",
    summary: displayName,
    actorUserId: input.actorUserId,
  });

  return getCustomerById(id)!;
}

export function updateCustomer(
  id: string,
  workspaceId: string,
  input: Partial<{
    displayName: string;
    email: string | null;
    phone: string | null;
    contactId: string | null;
    companyId: string | null;
    status: CustomerStatus;
    lifecycleStage: CustomerLifecycleStage;
    ownerUserId: string | null;
    acquiredAt: string | null;
  }>,
  actorUserId?: string | null,
): CrmCustomer {
  ensureCrmReady();
  const existing = getCustomerById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Customer not found.");
  }

  const next = {
    displayName:
      input.displayName !== undefined
        ? input.displayName.trim()
        : existing.displayName,
    email: input.email !== undefined ? asStringOrNull(input.email) : existing.email,
    phone: input.phone !== undefined ? asStringOrNull(input.phone) : existing.phone,
    contactId:
      input.contactId !== undefined
        ? asStringOrNull(input.contactId)
        : existing.contactId,
    companyId:
      input.companyId !== undefined
        ? asStringOrNull(input.companyId)
        : existing.companyId,
    status: input.status ?? existing.status,
    lifecycleStage: input.lifecycleStage ?? existing.lifecycleStage,
    ownerUserId:
      input.ownerUserId !== undefined
        ? asStringOrNull(input.ownerUserId)
        : existing.ownerUserId,
    acquiredAt:
      input.acquiredAt !== undefined
        ? asStringOrNull(input.acquiredAt)
        : existing.acquiredAt,
  };

  if (!next.displayName) throw new Error("Customer name is required.");

  sqlite
    .prepare(
      `UPDATE "crm_customer" SET
        "displayName" = ?, "email" = ?, "phone" = ?, "contactId" = ?,
        "companyId" = ?, "status" = ?, "lifecycleStage" = ?, "ownerUserId" = ?,
        "acquiredAt" = ?, "updatedAt" = ?
       WHERE "id" = ?`,
    )
    .run(
      next.displayName,
      next.email,
      next.phone,
      next.contactId,
      next.companyId,
      next.status,
      next.lifecycleStage,
      next.ownerUserId,
      next.acquiredAt,
      nowIso(),
      id,
    );

  if (
    (input.status && input.status !== existing.status) ||
    (input.lifecycleStage && input.lifecycleStage !== existing.lifecycleStage)
  ) {
    addTimelineEvent({
      workspaceId,
      customerId: id,
      entityType: "customer",
      entityId: id,
      eventType: "status_changed",
      title: "Customer status updated",
      summary: `${existing.status}/${existing.lifecycleStage} → ${next.status}/${next.lifecycleStage}`,
      actorUserId,
      metadata: {
        previousStatus: existing.status,
        status: next.status,
        previousLifecycleStage: existing.lifecycleStage,
        lifecycleStage: next.lifecycleStage,
      },
    });
  }

  return getCustomerById(id)!;
}

export function deleteCustomer(id: string, workspaceId: string): void {
  ensureCrmReady();
  const existing = getCustomerById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Customer not found.");
  }
  sqlite.prepare(`DELETE FROM "crm_customer" WHERE "id" = ?`).run(id);
  sqlite
    .prepare(
      `DELETE FROM "crm_tag_link" WHERE "workspaceId" = ? AND "entityType" = 'customer' AND "entityId" = ?`,
    )
    .run(workspaceId, id);
}

/* -------------------------------------------------------------------------- */
/* Pipeline & deals                                                           */
/* -------------------------------------------------------------------------- */

export function getPipelineById(id: string): CrmPipeline | null {
  ensureCrmReady();
  const row = sqlite
    .prepare(`SELECT * FROM "crm_pipeline" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToPipeline(row) : null;
}

export function listPipelines(workspaceId: string): CrmPipeline[] {
  ensureCrmReady();
  ensureDefaultPipeline(workspaceId);
  const rows = sqlite
    .prepare(
      `SELECT * FROM "crm_pipeline" WHERE "workspaceId" = ? ORDER BY "isDefault" DESC, "name" ASC`,
    )
    .all(workspaceId) as Record<string, unknown>[];
  return rows.map(rowToPipeline);
}

export function listPipelineStages(pipelineId: string): CrmPipelineStage[] {
  ensureCrmReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "crm_pipeline_stage" WHERE "pipelineId" = ? ORDER BY "sortOrder" ASC`,
    )
    .all(pipelineId) as Record<string, unknown>[];
  return rows.map(rowToStage);
}

export function getStageById(id: string): CrmPipelineStage | null {
  ensureCrmReady();
  const row = sqlite
    .prepare(`SELECT * FROM "crm_pipeline_stage" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToStage(row) : null;
}

export function getPipelineBoard(
  workspaceId: string,
  pipelineId?: string,
): CrmPipelineBoard {
  ensureCrmReady();
  const pipeline = pipelineId
    ? getPipelineById(pipelineId)
    : ensureDefaultPipeline(workspaceId);

  if (!pipeline || pipeline.workspaceId !== workspaceId) {
    throw new Error("Pipeline not found.");
  }

  const stages = listPipelineStages(pipeline.id);
  const deals = listDeals(workspaceId, { pipelineId: pipeline.id, limit: 500 });

  return {
    pipeline,
    stages: stages.map((stage) => {
      const stageDeals = deals.filter((deal) => deal.stageId === stage.id);
      return {
        ...stage,
        deals: stageDeals,
        totalCents: stageDeals.reduce((sum, deal) => sum + deal.amountCents, 0),
      };
    }),
  };
}

export function createPipelineStage(input: {
  workspaceId: string;
  pipelineId: string;
  name: string;
  color?: string;
  probability?: number;
  isWon?: boolean;
  isLost?: boolean;
}): CrmPipelineStage {
  ensureCrmReady();
  const pipeline = getPipelineById(input.pipelineId);
  if (!pipeline || pipeline.workspaceId !== input.workspaceId) {
    throw new Error("Pipeline not found.");
  }
  const name = input.name.trim();
  if (!name) throw new Error("Stage name is required.");

  const maxOrder = sqlite
    .prepare(
      `SELECT COALESCE(MAX("sortOrder"), -1) as maxOrder FROM "crm_pipeline_stage" WHERE "pipelineId" = ?`,
    )
    .get(input.pipelineId) as { maxOrder: number };

  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "crm_pipeline_stage" (
        "id", "pipelineId", "workspaceId", "name", "sortOrder", "color",
        "probability", "isWon", "isLost", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.pipelineId,
      input.workspaceId,
      name,
      Number(maxOrder.maxOrder) + 1,
      input.color?.trim() || "#71717a",
      Math.max(0, Math.min(100, Number(input.probability ?? 0))),
      input.isWon ? 1 : 0,
      input.isLost ? 1 : 0,
      timestamp,
      timestamp,
    );
  return getStageById(id)!;
}

export function updatePipelineStage(
  id: string,
  workspaceId: string,
  input: Partial<{
    name: string;
    color: string;
    probability: number;
    sortOrder: number;
    isWon: boolean;
    isLost: boolean;
  }>,
): CrmPipelineStage {
  ensureCrmReady();
  const existing = getStageById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Stage not found.");
  }

  const next = {
    name: input.name !== undefined ? input.name.trim() : existing.name,
    color: input.color !== undefined ? input.color.trim() : existing.color,
    probability:
      input.probability !== undefined
        ? Math.max(0, Math.min(100, Number(input.probability)))
        : existing.probability,
    sortOrder:
      input.sortOrder !== undefined
        ? Number(input.sortOrder)
        : existing.sortOrder,
    isWon: input.isWon ?? existing.isWon,
    isLost: input.isLost ?? existing.isLost,
  };

  if (!next.name) throw new Error("Stage name is required.");

  sqlite
    .prepare(
      `UPDATE "crm_pipeline_stage" SET
        "name" = ?, "color" = ?, "probability" = ?, "sortOrder" = ?,
        "isWon" = ?, "isLost" = ?, "updatedAt" = ?
       WHERE "id" = ?`,
    )
    .run(
      next.name,
      next.color,
      next.probability,
      next.sortOrder,
      next.isWon ? 1 : 0,
      next.isLost ? 1 : 0,
      nowIso(),
      id,
    );
  return getStageById(id)!;
}

export function getDealById(id: string): CrmDeal | null {
  ensureCrmReady();
  const row = sqlite
    .prepare(`SELECT * FROM "crm_deal" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToDeal(row) : null;
}

export function listDeals(
  workspaceId: string,
  filters: CrmListFilters = {},
): CrmDeal[] {
  ensureCrmReady();
  ensureDefaultPipeline(workspaceId);
  const clauses = [`d."workspaceId" = ?`];
  const params: unknown[] = [workspaceId];

  if (filters.q) {
    clauses.push(`(d."title" LIKE ? OR d."description" LIKE ?)`);
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern);
  }
  if (filters.status) {
    clauses.push(`d."status" = ?`);
    params.push(filters.status);
  }
  if (filters.stageId) {
    clauses.push(`d."stageId" = ?`);
    params.push(filters.stageId);
  }
  if (filters.pipelineId) {
    clauses.push(`d."pipelineId" = ?`);
    params.push(filters.pipelineId);
  }
  if (filters.companyId) {
    clauses.push(`d."companyId" = ?`);
    params.push(filters.companyId);
  }
  if (filters.ownerUserId) {
    clauses.push(`d."ownerUserId" = ?`);
    params.push(filters.ownerUserId);
  }
  if (filters.tagId) {
    clauses.push(
      `EXISTS (
        SELECT 1 FROM "crm_tag_link" tl
        WHERE tl."entityType" = 'deal' AND tl."entityId" = d."id" AND tl."tagId" = ?
      )`,
    );
    params.push(filters.tagId);
  }

  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const rows = sqlite
    .prepare(
      `SELECT d.* FROM "crm_deal" d
       WHERE ${clauses.join(" AND ")}
       ORDER BY d."updatedAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToDeal);
}

export function createDeal(input: {
  workspaceId: string;
  pipelineId?: string;
  stageId?: string;
  title: string;
  amountCents?: number;
  currency?: string;
  contactId?: string | null;
  companyId?: string | null;
  customerId?: string | null;
  leadId?: string | null;
  ownerUserId?: string | null;
  expectedCloseDate?: string | null;
  description?: string | null;
  actorUserId?: string | null;
}): CrmDeal {
  ensureCrmReady();
  const pipeline = input.pipelineId
    ? getPipelineById(input.pipelineId)
    : ensureDefaultPipeline(input.workspaceId);
  if (!pipeline || pipeline.workspaceId !== input.workspaceId) {
    throw new Error("Pipeline not found.");
  }

  const stages = listPipelineStages(pipeline.id);
  const stage = input.stageId
    ? stages.find((item) => item.id === input.stageId)
    : stages.find((item) => !item.isWon && !item.isLost);

  if (!stage) throw new Error("Pipeline stage not found.");

  const title = input.title.trim();
  if (!title) throw new Error("Deal title is required.");

  let status: DealStatus = "open";
  let closedAt: string | null = null;
  if (stage.isWon) {
    status = "won";
    closedAt = nowIso();
  } else if (stage.isLost) {
    status = "lost";
    closedAt = nowIso();
  }

  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "crm_deal" (
        "id", "workspaceId", "pipelineId", "stageId", "title", "amountCents",
        "currency", "contactId", "companyId", "customerId", "leadId",
        "ownerUserId", "expectedCloseDate", "closedAt", "status",
        "probability", "description", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      pipeline.id,
      stage.id,
      title,
      Math.max(0, Math.floor(Number(input.amountCents ?? 0))),
      (input.currency ?? "USD").trim().toUpperCase() || "USD",
      asStringOrNull(input.contactId),
      asStringOrNull(input.companyId),
      asStringOrNull(input.customerId),
      asStringOrNull(input.leadId),
      asStringOrNull(input.ownerUserId),
      asStringOrNull(input.expectedCloseDate),
      closedAt,
      status,
      stage.probability,
      asStringOrNull(input.description),
      timestamp,
      timestamp,
    );

  const deal = getDealById(id)!;
  if (deal.customerId) {
    addTimelineEvent({
      workspaceId: input.workspaceId,
      customerId: deal.customerId,
      entityType: "deal",
      entityId: deal.id,
      eventType: "deal_created",
      title: "Deal created",
      summary: `${deal.title} · ${formatMoney(deal.amountCents, deal.currency)}`,
      actorUserId: input.actorUserId,
    });
  }
  return deal;
}

export function updateDeal(
  id: string,
  workspaceId: string,
  input: Partial<{
    title: string;
    amountCents: number;
    currency: string;
    stageId: string;
    contactId: string | null;
    companyId: string | null;
    customerId: string | null;
    leadId: string | null;
    ownerUserId: string | null;
    expectedCloseDate: string | null;
    description: string | null;
    status: DealStatus;
  }>,
  actorUserId?: string | null,
): CrmDeal {
  ensureCrmReady();
  const existing = getDealById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Deal not found.");
  }

  let stage = getStageById(existing.stageId)!;
  let status = input.status ?? existing.status;
  let closedAt = existing.closedAt;
  let probability = existing.probability;

  if (input.stageId && input.stageId !== existing.stageId) {
    const nextStage = getStageById(input.stageId);
    if (!nextStage || nextStage.workspaceId !== workspaceId) {
      throw new Error("Stage not found.");
    }
    if (nextStage.pipelineId !== existing.pipelineId) {
      throw new Error("Stage does not belong to this pipeline.");
    }
    stage = nextStage;
    probability = nextStage.probability;
    if (nextStage.isWon) {
      status = "won";
      closedAt = nowIso();
    } else if (nextStage.isLost) {
      status = "lost";
      closedAt = nowIso();
    } else {
      status = "open";
      closedAt = null;
    }
  } else if (input.status) {
    if (input.status === "won" || input.status === "lost") {
      closedAt = existing.closedAt ?? nowIso();
    } else {
      closedAt = null;
    }
  }

  const next = {
    title: input.title !== undefined ? input.title.trim() : existing.title,
    amountCents:
      input.amountCents !== undefined
        ? Math.max(0, Math.floor(Number(input.amountCents)))
        : existing.amountCents,
    currency:
      input.currency !== undefined
        ? input.currency.trim().toUpperCase() || "USD"
        : existing.currency,
    stageId: stage.id,
    contactId:
      input.contactId !== undefined
        ? asStringOrNull(input.contactId)
        : existing.contactId,
    companyId:
      input.companyId !== undefined
        ? asStringOrNull(input.companyId)
        : existing.companyId,
    customerId:
      input.customerId !== undefined
        ? asStringOrNull(input.customerId)
        : existing.customerId,
    leadId:
      input.leadId !== undefined ? asStringOrNull(input.leadId) : existing.leadId,
    ownerUserId:
      input.ownerUserId !== undefined
        ? asStringOrNull(input.ownerUserId)
        : existing.ownerUserId,
    expectedCloseDate:
      input.expectedCloseDate !== undefined
        ? asStringOrNull(input.expectedCloseDate)
        : existing.expectedCloseDate,
    description:
      input.description !== undefined
        ? asStringOrNull(input.description)
        : existing.description,
    status,
    probability,
    closedAt,
  };

  if (!next.title) throw new Error("Deal title is required.");

  sqlite
    .prepare(
      `UPDATE "crm_deal" SET
        "title" = ?, "amountCents" = ?, "currency" = ?, "stageId" = ?,
        "contactId" = ?, "companyId" = ?, "customerId" = ?, "leadId" = ?,
        "ownerUserId" = ?, "expectedCloseDate" = ?, "closedAt" = ?,
        "status" = ?, "probability" = ?, "description" = ?, "updatedAt" = ?
       WHERE "id" = ?`,
    )
    .run(
      next.title,
      next.amountCents,
      next.currency,
      next.stageId,
      next.contactId,
      next.companyId,
      next.customerId,
      next.leadId,
      next.ownerUserId,
      next.expectedCloseDate,
      next.closedAt,
      next.status,
      next.probability,
      next.description,
      nowIso(),
      id,
    );

  const deal = getDealById(id)!;
  const customerId = deal.customerId;
  if (customerId && input.stageId && input.stageId !== existing.stageId) {
    const eventType: TimelineEventType =
      deal.status === "won"
        ? "deal_won"
        : deal.status === "lost"
          ? "deal_lost"
          : "deal_stage_changed";
    addTimelineEvent({
      workspaceId,
      customerId,
      entityType: "deal",
      entityId: deal.id,
      eventType,
      title:
        eventType === "deal_won"
          ? "Deal won"
          : eventType === "deal_lost"
            ? "Deal lost"
            : "Deal stage changed",
      summary: `${deal.title} → ${stage.name}`,
      actorUserId,
      metadata: {
        previousStageId: existing.stageId,
        stageId: deal.stageId,
        status: deal.status,
      },
    });
  }

  return deal;
}

export function deleteDeal(id: string, workspaceId: string): void {
  ensureCrmReady();
  const existing = getDealById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Deal not found.");
  }
  sqlite.prepare(`DELETE FROM "crm_deal" WHERE "id" = ?`).run(id);
  sqlite
    .prepare(
      `DELETE FROM "crm_tag_link" WHERE "workspaceId" = ? AND "entityType" = 'deal' AND "entityId" = ?`,
    )
    .run(workspaceId, id);
}

function formatMoney(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amountCents / 100);
}

/* -------------------------------------------------------------------------- */
/* Notes                                                                      */
/* -------------------------------------------------------------------------- */

export function getNoteById(id: string): CrmNote | null {
  ensureCrmReady();
  const row = sqlite
    .prepare(`SELECT * FROM "crm_note" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToNote(row) : null;
}

export function listNotes(
  workspaceId: string,
  filters: CrmListFilters & {
    entityType?: CrmEntityType;
    entityId?: string;
  } = {},
): CrmNote[] {
  ensureCrmReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];
  if (filters.entityType) {
    clauses.push(`"entityType" = ?`);
    params.push(filters.entityType);
  }
  if (filters.entityId) {
    clauses.push(`"entityId" = ?`);
    params.push(filters.entityId);
  }
  if (filters.q) {
    clauses.push(`"body" LIKE ?`);
    params.push(likePattern(filters.q));
  }
  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const rows = sqlite
    .prepare(
      `SELECT * FROM "crm_note"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "createdAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToNote);
}

export function createNote(input: {
  workspaceId: string;
  entityType: CrmEntityType;
  entityId: string;
  body: string;
  createdByUserId?: string | null;
}): CrmNote {
  ensureCrmReady();
  const body = input.body.trim();
  if (!body) throw new Error("Note body is required.");

  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "crm_note" (
        "id", "workspaceId", "entityType", "entityId", "body",
        "createdByUserId", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      input.entityType,
      input.entityId,
      body,
      asStringOrNull(input.createdByUserId),
      timestamp,
      timestamp,
    );

  fanOutTimeline(input.workspaceId, input.entityType, input.entityId, {
    entityType: "note",
    entityId: id,
    eventType: "note_added",
    title: "Note added",
    summary: body.slice(0, 160),
    actorUserId: input.createdByUserId,
  });

  return getNoteById(id)!;
}

export function updateNote(
  id: string,
  workspaceId: string,
  body: string,
): CrmNote {
  ensureCrmReady();
  const existing = getNoteById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Note not found.");
  }
  const nextBody = body.trim();
  if (!nextBody) throw new Error("Note body is required.");
  sqlite
    .prepare(
      `UPDATE "crm_note" SET "body" = ?, "updatedAt" = ? WHERE "id" = ?`,
    )
    .run(nextBody, nowIso(), id);
  return getNoteById(id)!;
}

export function deleteNote(id: string, workspaceId: string): void {
  ensureCrmReady();
  const existing = getNoteById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Note not found.");
  }
  sqlite.prepare(`DELETE FROM "crm_note" WHERE "id" = ?`).run(id);
}

/* -------------------------------------------------------------------------- */
/* Activities                                                                 */
/* -------------------------------------------------------------------------- */

export function getActivityById(id: string): CrmActivity | null {
  ensureCrmReady();
  const row = sqlite
    .prepare(`SELECT * FROM "crm_activity" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToActivity(row) : null;
}

export function listActivities(
  workspaceId: string,
  filters: CrmListFilters & {
    entityType?: CrmEntityType;
    entityId?: string;
  } = {},
): CrmActivity[] {
  ensureCrmReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];
  if (filters.entityType) {
    clauses.push(`"entityType" = ?`);
    params.push(filters.entityType);
  }
  if (filters.entityId) {
    clauses.push(`"entityId" = ?`);
    params.push(filters.entityId);
  }
  if (filters.type) {
    clauses.push(`"type" = ?`);
    params.push(filters.type);
  }
  if (filters.q) {
    clauses.push(`("subject" LIKE ? OR "body" LIKE ?)`);
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern);
  }
  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const rows = sqlite
    .prepare(
      `SELECT * FROM "crm_activity"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "occurredAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToActivity);
}

export function createActivity(input: {
  workspaceId: string;
  entityType: CrmEntityType;
  entityId: string;
  type: ActivityType;
  subject: string;
  body?: string | null;
  occurredAt?: string | null;
  createdByUserId?: string | null;
}): CrmActivity {
  ensureCrmReady();
  const subject = input.subject.trim();
  if (!subject) throw new Error("Activity subject is required.");

  const id = randomUUID();
  const timestamp = nowIso();
  const occurredAt = asStringOrNull(input.occurredAt) ?? timestamp;
  sqlite
    .prepare(
      `INSERT INTO "crm_activity" (
        "id", "workspaceId", "entityType", "entityId", "type", "subject",
        "body", "occurredAt", "createdByUserId", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      input.entityType,
      input.entityId,
      input.type,
      subject,
      asStringOrNull(input.body),
      occurredAt,
      asStringOrNull(input.createdByUserId),
      timestamp,
      timestamp,
    );

  fanOutTimeline(input.workspaceId, input.entityType, input.entityId, {
    entityType: "activity",
    entityId: id,
    eventType: "activity_logged",
    title: `${input.type} logged`,
    summary: subject,
    actorUserId: input.createdByUserId,
    occurredAt,
  });

  return getActivityById(id)!;
}

export function updateActivity(
  id: string,
  workspaceId: string,
  input: Partial<{
    type: ActivityType;
    subject: string;
    body: string | null;
    occurredAt: string;
  }>,
): CrmActivity {
  ensureCrmReady();
  const existing = getActivityById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Activity not found.");
  }

  const next = {
    type: input.type ?? existing.type,
    subject:
      input.subject !== undefined ? input.subject.trim() : existing.subject,
    body: input.body !== undefined ? asStringOrNull(input.body) : existing.body,
    occurredAt: input.occurredAt ?? existing.occurredAt,
  };
  if (!next.subject) throw new Error("Activity subject is required.");

  sqlite
    .prepare(
      `UPDATE "crm_activity" SET
        "type" = ?, "subject" = ?, "body" = ?, "occurredAt" = ?, "updatedAt" = ?
       WHERE "id" = ?`,
    )
    .run(
      next.type,
      next.subject,
      next.body,
      next.occurredAt,
      nowIso(),
      id,
    );
  return getActivityById(id)!;
}

export function deleteActivity(id: string, workspaceId: string): void {
  ensureCrmReady();
  const existing = getActivityById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Activity not found.");
  }
  sqlite.prepare(`DELETE FROM "crm_activity" WHERE "id" = ?`).run(id);
}

/* -------------------------------------------------------------------------- */
/* Tasks                                                                      */
/* -------------------------------------------------------------------------- */

export function getTaskById(id: string): CrmTask | null {
  ensureCrmReady();
  const row = sqlite
    .prepare(`SELECT * FROM "crm_task" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToTask(row) : null;
}

export function listTasks(
  workspaceId: string,
  filters: CrmListFilters & {
    entityType?: CrmEntityType;
    entityId?: string;
  } = {},
): CrmTask[] {
  ensureCrmReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];
  if (filters.status) {
    clauses.push(`"status" = ?`);
    params.push(filters.status);
  }
  if (filters.priority) {
    clauses.push(`"priority" = ?`);
    params.push(filters.priority);
  }
  if (filters.entityType) {
    clauses.push(`"entityType" = ?`);
    params.push(filters.entityType);
  }
  if (filters.entityId) {
    clauses.push(`"entityId" = ?`);
    params.push(filters.entityId);
  }
  if (filters.ownerUserId) {
    clauses.push(`"assigneeUserId" = ?`);
    params.push(filters.ownerUserId);
  }
  if (filters.q) {
    clauses.push(`("title" LIKE ? OR "description" LIKE ?)`);
    const pattern = likePattern(filters.q);
    params.push(pattern, pattern);
  }
  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);

  const rows = sqlite
    .prepare(
      `SELECT * FROM "crm_task"
       WHERE ${clauses.join(" AND ")}
       ORDER BY
         CASE "status" WHEN 'open' THEN 0 WHEN 'done' THEN 1 ELSE 2 END,
         CASE WHEN "dueAt" IS NULL THEN 1 ELSE 0 END,
         "dueAt" ASC,
         "createdAt" DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToTask);
}

export function createTask(input: {
  workspaceId: string;
  title: string;
  description?: string | null;
  entityType?: CrmEntityType | null;
  entityId?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueAt?: string | null;
  assigneeUserId?: string | null;
  createdByUserId?: string | null;
}): CrmTask {
  ensureCrmReady();
  const title = input.title.trim();
  if (!title) throw new Error("Task title is required.");

  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "crm_task" (
        "id", "workspaceId", "entityType", "entityId", "title", "description",
        "status", "priority", "dueAt", "assigneeUserId", "createdByUserId",
        "completedAt", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      asStringOrNull(input.entityType),
      asStringOrNull(input.entityId),
      title,
      asStringOrNull(input.description),
      input.status ?? "open",
      input.priority ?? "medium",
      asStringOrNull(input.dueAt),
      asStringOrNull(input.assigneeUserId),
      asStringOrNull(input.createdByUserId),
      timestamp,
      timestamp,
    );

  if (input.entityType && input.entityId) {
    fanOutTimeline(input.workspaceId, input.entityType, input.entityId, {
      entityType: "task",
      entityId: id,
      eventType: "task_created",
      title: "Task created",
      summary: title,
      actorUserId: input.createdByUserId,
    });
  }

  return getTaskById(id)!;
}

export function updateTask(
  id: string,
  workspaceId: string,
  input: Partial<{
    title: string;
    description: string | null;
    entityType: CrmEntityType | null;
    entityId: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueAt: string | null;
    assigneeUserId: string | null;
  }>,
  actorUserId?: string | null,
): CrmTask {
  ensureCrmReady();
  const existing = getTaskById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Task not found.");
  }

  const status = input.status ?? existing.status;
  let completedAt = existing.completedAt;
  if (status === "done" && existing.status !== "done") {
    completedAt = nowIso();
  } else if (status !== "done") {
    completedAt = null;
  }

  const next = {
    title: input.title !== undefined ? input.title.trim() : existing.title,
    description:
      input.description !== undefined
        ? asStringOrNull(input.description)
        : existing.description,
    entityType:
      input.entityType !== undefined ? input.entityType : existing.entityType,
    entityId:
      input.entityId !== undefined
        ? asStringOrNull(input.entityId)
        : existing.entityId,
    status,
    priority: input.priority ?? existing.priority,
    dueAt: input.dueAt !== undefined ? asStringOrNull(input.dueAt) : existing.dueAt,
    assigneeUserId:
      input.assigneeUserId !== undefined
        ? asStringOrNull(input.assigneeUserId)
        : existing.assigneeUserId,
    completedAt,
  };

  if (!next.title) throw new Error("Task title is required.");

  sqlite
    .prepare(
      `UPDATE "crm_task" SET
        "title" = ?, "description" = ?, "entityType" = ?, "entityId" = ?,
        "status" = ?, "priority" = ?, "dueAt" = ?, "assigneeUserId" = ?,
        "completedAt" = ?, "updatedAt" = ?
       WHERE "id" = ?`,
    )
    .run(
      next.title,
      next.description,
      next.entityType,
      next.entityId,
      next.status,
      next.priority,
      next.dueAt,
      next.assigneeUserId,
      next.completedAt,
      nowIso(),
      id,
    );

  if (status === "done" && existing.status !== "done" && next.entityType && next.entityId) {
    fanOutTimeline(workspaceId, next.entityType, next.entityId, {
      entityType: "task",
      entityId: id,
      eventType: "task_completed",
      title: "Task completed",
      summary: next.title,
      actorUserId,
    });
  }

  return getTaskById(id)!;
}

export function deleteTask(id: string, workspaceId: string): void {
  ensureCrmReady();
  const existing = getTaskById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Task not found.");
  }
  sqlite.prepare(`DELETE FROM "crm_task" WHERE "id" = ?`).run(id);
}

/* -------------------------------------------------------------------------- */
/* Tags                                                                       */
/* -------------------------------------------------------------------------- */

export function getTagById(id: string): CrmTag | null {
  ensureCrmReady();
  const row = sqlite
    .prepare(`SELECT * FROM "crm_tag" WHERE "id" = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToTag(row) : null;
}

export function listTags(workspaceId: string, filters: CrmListFilters = {}): CrmTag[] {
  ensureCrmReady();
  const clauses = [`"workspaceId" = ?`];
  const params: unknown[] = [workspaceId];
  if (filters.q) {
    clauses.push(`"name" LIKE ?`);
    params.push(likePattern(filters.q));
  }
  const rows = sqlite
    .prepare(
      `SELECT * FROM "crm_tag"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "name" COLLATE NOCASE ASC`,
    )
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToTag);
}

export function createTag(input: {
  workspaceId: string;
  name: string;
  color?: string;
}): CrmTag {
  ensureCrmReady();
  const name = input.name.trim();
  if (!name) throw new Error("Tag name is required.");

  const existing = sqlite
    .prepare(
      `SELECT * FROM "crm_tag" WHERE "workspaceId" = ? AND lower("name") = lower(?)`,
    )
    .get(input.workspaceId, name) as Record<string, unknown> | undefined;
  if (existing) {
    throw new Error("A tag with this name already exists.");
  }

  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "crm_tag" (
        "id", "workspaceId", "name", "color", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      name,
      input.color?.trim() || "#3f3f46",
      timestamp,
      timestamp,
    );
  return getTagById(id)!;
}

export function updateTag(
  id: string,
  workspaceId: string,
  input: Partial<{ name: string; color: string }>,
): CrmTag {
  ensureCrmReady();
  const existing = getTagById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Tag not found.");
  }

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  const color = input.color !== undefined ? input.color.trim() : existing.color;
  if (!name) throw new Error("Tag name is required.");

  sqlite
    .prepare(
      `UPDATE "crm_tag" SET "name" = ?, "color" = ?, "updatedAt" = ? WHERE "id" = ?`,
    )
    .run(name, color || "#3f3f46", nowIso(), id);
  return getTagById(id)!;
}

export function deleteTag(id: string, workspaceId: string): void {
  ensureCrmReady();
  const existing = getTagById(id);
  if (!existing || existing.workspaceId !== workspaceId) {
    throw new Error("Tag not found.");
  }
  sqlite.prepare(`DELETE FROM "crm_tag" WHERE "id" = ?`).run(id);
}

export function listTagsForEntity(
  workspaceId: string,
  entityType: CrmEntityType,
  entityId: string,
): CrmTag[] {
  ensureCrmReady();
  const rows = sqlite
    .prepare(
      `SELECT t.* FROM "crm_tag" t
       INNER JOIN "crm_tag_link" l ON l."tagId" = t."id"
       WHERE l."workspaceId" = ? AND l."entityType" = ? AND l."entityId" = ?
       ORDER BY t."name" COLLATE NOCASE ASC`,
    )
    .all(workspaceId, entityType, entityId) as Record<string, unknown>[];
  return rows.map(rowToTag);
}

export function assignTag(input: {
  workspaceId: string;
  tagId: string;
  entityType: CrmEntityType;
  entityId: string;
  actorUserId?: string | null;
}): void {
  ensureCrmReady();
  const tag = getTagById(input.tagId);
  if (!tag || tag.workspaceId !== input.workspaceId) {
    throw new Error("Tag not found.");
  }

  sqlite
    .prepare(
      `INSERT OR IGNORE INTO "crm_tag_link" (
        "tagId", "workspaceId", "entityType", "entityId", "createdAt"
      ) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      input.tagId,
      input.workspaceId,
      input.entityType,
      input.entityId,
      nowIso(),
    );

  fanOutTimeline(input.workspaceId, input.entityType, input.entityId, {
    entityType: input.entityType,
    entityId: input.entityId,
    eventType: "tag_added",
    title: "Tag added",
    summary: tag.name,
    actorUserId: input.actorUserId,
    metadata: { tagId: tag.id, tagName: tag.name },
  });
}

export function unassignTag(input: {
  workspaceId: string;
  tagId: string;
  entityType: CrmEntityType;
  entityId: string;
  actorUserId?: string | null;
}): void {
  ensureCrmReady();
  const tag = getTagById(input.tagId);
  if (!tag || tag.workspaceId !== input.workspaceId) {
    throw new Error("Tag not found.");
  }

  sqlite
    .prepare(
      `DELETE FROM "crm_tag_link"
       WHERE "tagId" = ? AND "workspaceId" = ? AND "entityType" = ? AND "entityId" = ?`,
    )
    .run(input.tagId, input.workspaceId, input.entityType, input.entityId);

  fanOutTimeline(input.workspaceId, input.entityType, input.entityId, {
    entityType: input.entityType,
    entityId: input.entityId,
    eventType: "tag_removed",
    title: "Tag removed",
    summary: tag.name,
    actorUserId: input.actorUserId,
    metadata: { tagId: tag.id, tagName: tag.name },
  });
}

/* -------------------------------------------------------------------------- */
/* Overview & search                                                          */
/* -------------------------------------------------------------------------- */

export function getCrmOverview(workspaceId: string): CrmOverviewStats {
  ensureCrmReady();
  ensureDefaultPipeline(workspaceId);

  const count = (table: string) => {
    const row = sqlite
      .prepare(`SELECT COUNT(*) as count FROM "${table}" WHERE "workspaceId" = ?`)
      .get(workspaceId) as { count: number };
    return Number(row.count ?? 0);
  };

  const openDeals = sqlite
    .prepare(
      `SELECT COUNT(*) as count, COALESCE(SUM("amountCents"), 0) as total
       FROM "crm_deal" WHERE "workspaceId" = ? AND "status" = 'open'`,
    )
    .get(workspaceId) as { count: number; total: number };

  const openTasks = sqlite
    .prepare(
      `SELECT COUNT(*) as count FROM "crm_task"
       WHERE "workspaceId" = ? AND "status" = 'open'`,
    )
    .get(workspaceId) as { count: number };

  const now = nowIso();
  const overdueTasks = sqlite
    .prepare(
      `SELECT COUNT(*) as count FROM "crm_task"
       WHERE "workspaceId" = ? AND "status" = 'open'
         AND "dueAt" IS NOT NULL AND "dueAt" < ?`,
    )
    .get(workspaceId, now) as { count: number };

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const activitiesThisWeek = sqlite
    .prepare(
      `SELECT COUNT(*) as count FROM "crm_activity"
       WHERE "workspaceId" = ? AND "occurredAt" >= ?`,
    )
    .get(workspaceId, weekAgo) as { count: number };

  return {
    companies: count("crm_company"),
    contacts: count("crm_contact"),
    leads: count("crm_lead"),
    customers: count("crm_customer"),
    openDeals: Number(openDeals.count ?? 0),
    openDealValueCents: Number(openDeals.total ?? 0),
    openTasks: Number(openTasks.count ?? 0),
    overdueTasks: Number(overdueTasks.count ?? 0),
    activitiesThisWeek: Number(activitiesThisWeek.count ?? 0),
  };
}

export function searchCrm(workspaceId: string, q: string, limit = 8) {
  ensureCrmReady();
  const query = q.trim();
  if (!query) {
    return {
      companies: [] as CrmCompany[],
      contacts: [] as CrmContact[],
      leads: [] as CrmLead[],
      customers: [] as CrmCustomer[],
      deals: [] as CrmDeal[],
    };
  }

  return {
    companies: listCompanies(workspaceId, { q: query, limit }),
    contacts: listContacts(workspaceId, { q: query, limit }),
    leads: listLeads(workspaceId, { q: query, limit }),
    customers: listCustomers(workspaceId, { q: query, limit }),
    deals: listDeals(workspaceId, { q: query, limit }),
  };
}
