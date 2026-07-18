export const CRM_ENTITY_TYPES = [
  "company",
  "contact",
  "lead",
  "customer",
  "deal",
  "task",
  "activity",
  "note",
] as const;
export type CrmEntityType = (typeof CRM_ENTITY_TYPES)[number];

export const CONTACT_STATUSES = ["active", "inactive"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "unqualified",
  "converted",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = [
  "manual",
  "website",
  "referral",
  "ads",
  "import",
  "other",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const CUSTOMER_STATUSES = ["active", "inactive", "churned"] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const CUSTOMER_LIFECYCLE_STAGES = [
  "onboarding",
  "customer",
  "renewal",
  "at_risk",
  "churned",
] as const;
export type CustomerLifecycleStage = (typeof CUSTOMER_LIFECYCLE_STAGES)[number];

export const DEAL_STATUSES = ["open", "won", "lost"] as const;
export type DealStatus = (typeof DEAL_STATUSES)[number];

export const ACTIVITY_TYPES = [
  "call",
  "email",
  "meeting",
  "message",
  "other",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const TASK_STATUSES = ["open", "done", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TIMELINE_EVENT_TYPES = [
  "customer_created",
  "note_added",
  "activity_logged",
  "task_created",
  "task_completed",
  "deal_created",
  "deal_stage_changed",
  "deal_won",
  "deal_lost",
  "lead_converted",
  "tag_added",
  "tag_removed",
  "status_changed",
  "imported",
] as const;
export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

export type CrmCompany = {
  id: string;
  workspaceId: string;
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
  createdAt: string;
  updatedAt: string;
};

export type CrmContact = {
  id: string;
  workspaceId: string;
  companyId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  status: ContactStatus;
  ownerUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CrmLead = {
  id: string;
  workspaceId: string;
  companyId: string | null;
  contactId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  jobTitle: string | null;
  source: LeadSource;
  status: LeadStatus;
  score: number;
  ownerUserId: string | null;
  convertedAt: string | null;
  convertedCustomerId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CrmCustomer = {
  id: string;
  workspaceId: string;
  contactId: string | null;
  companyId: string | null;
  displayName: string;
  email: string | null;
  phone: string | null;
  status: CustomerStatus;
  lifecycleStage: CustomerLifecycleStage;
  ownerUserId: string | null;
  acquiredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CrmPipeline = {
  id: string;
  workspaceId: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CrmPipelineStage = {
  id: string;
  pipelineId: string;
  workspaceId: string;
  name: string;
  sortOrder: number;
  color: string;
  probability: number;
  isWon: boolean;
  isLost: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CrmDeal = {
  id: string;
  workspaceId: string;
  pipelineId: string;
  stageId: string;
  title: string;
  amountCents: number;
  currency: string;
  contactId: string | null;
  companyId: string | null;
  customerId: string | null;
  leadId: string | null;
  ownerUserId: string | null;
  expectedCloseDate: string | null;
  closedAt: string | null;
  status: DealStatus;
  probability: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CrmNote = {
  id: string;
  workspaceId: string;
  entityType: CrmEntityType;
  entityId: string;
  body: string;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CrmActivity = {
  id: string;
  workspaceId: string;
  entityType: CrmEntityType;
  entityId: string;
  type: ActivityType;
  subject: string;
  body: string | null;
  occurredAt: string;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CrmTask = {
  id: string;
  workspaceId: string;
  entityType: CrmEntityType | null;
  entityId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  assigneeUserId: string | null;
  createdByUserId: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CrmTag = {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};

export type CrmTagLink = {
  tagId: string;
  workspaceId: string;
  entityType: CrmEntityType;
  entityId: string;
  createdAt: string;
};

export type CrmTimelineEvent = {
  id: string;
  workspaceId: string;
  customerId: string;
  entityType: CrmEntityType;
  entityId: string | null;
  eventType: TimelineEventType;
  title: string;
  summary: string | null;
  metadata: Record<string, unknown>;
  actorUserId: string | null;
  occurredAt: string;
  createdAt: string;
};

export type CrmListFilters = {
  q?: string;
  status?: string;
  ownerUserId?: string;
  companyId?: string;
  tagId?: string;
  stageId?: string;
  pipelineId?: string;
  priority?: string;
  type?: string;
  source?: string;
  lifecycleStage?: string;
  limit?: number;
  offset?: number;
};

export type CrmOverviewStats = {
  companies: number;
  contacts: number;
  leads: number;
  customers: number;
  openDeals: number;
  openDealValueCents: number;
  openTasks: number;
  overdueTasks: number;
  activitiesThisWeek: number;
};

export type CrmPipelineBoard = {
  pipeline: CrmPipeline;
  stages: Array<
    CrmPipelineStage & {
      deals: CrmDeal[];
      totalCents: number;
    }
  >;
};

export type CrmExportEntity =
  | "companies"
  | "contacts"
  | "leads"
  | "customers"
  | "deals";
