export const LISTING_KINDS = [
  "plugin",
  "theme",
  "website_template",
  "ai_prompt",
  "automation_template",
  "crm_template",
  "chatbot_template",
] as const;
export type ListingKind = (typeof LISTING_KINDS)[number];

export const LISTING_STATUSES = [
  "draft",
  "published",
  "deprecated",
  "suspended",
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const LISTING_VISIBILITIES = ["public", "workspace"] as const;
export type ListingVisibility = (typeof LISTING_VISIBILITIES)[number];

export const INSTALL_STATUSES = [
  "installed",
  "disabled",
  "pending",
  "failed",
] as const;
export type InstallStatus = (typeof INSTALL_STATUSES)[number];

export const PRICING_MODELS = ["free", "one_time", "subscription"] as const;
export type PricingModel = (typeof PRICING_MODELS)[number];

export const PLUGIN_PERMISSIONS = [
  "crm.read",
  "crm.write",
  "website.read",
  "website.write",
  "automation.read",
  "automation.write",
  "ai.read",
  "ai.write",
  "chatbot.read",
  "chatbot.write",
  "billing.read",
  "storage.read",
  "storage.write",
  "http.outbound",
  "workspace.read",
] as const;
export type PluginPermission = (typeof PLUGIN_PERMISSIONS)[number];

export const SANDBOX_RUN_STATUSES = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "denied",
  "timed_out",
] as const;
export type SandboxRunStatus = (typeof SANDBOX_RUN_STATUSES)[number];

export const PURCHASE_STATUSES = [
  "pending",
  "completed",
  "refunded",
  "failed",
] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

export type PluginManifest = {
  entry: string;
  hooks: string[];
  permissions: PluginPermission[];
  configSchema?: Record<string, unknown>;
  sandbox?: {
    timeoutMs?: number;
    allowNetwork?: boolean;
    maxOutputBytes?: number;
  };
};

export type MarketplaceListing = {
  id: string;
  /** Null for platform-curated catalog items. */
  publisherWorkspaceId: string | null;
  kind: ListingKind;
  slug: string;
  name: string;
  summary: string;
  description: string;
  status: ListingStatus;
  visibility: ListingVisibility;
  pricingModel: PricingModel;
  priceCents: number;
  currency: string;
  /** Minimum plan required to install (`free` | `starter` | `pro` | `enterprise`). */
  minPlanId: string;
  iconUrl: string | null;
  coverUrl: string | null;
  categories: string[];
  tags: string[];
  permissions: PluginPermission[];
  manifest: PluginManifest;
  latestVersion: string;
  downloads: number;
  ratingAverage: number;
  ratingCount: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type MarketplaceListingVersion = {
  id: string;
  listingId: string;
  version: string;
  changelog: string | null;
  packageUrl: string | null;
  checksum: string | null;
  manifest: PluginManifest;
  isLatest: boolean;
  createdAt: string;
};

export type MarketplaceInstall = {
  id: string;
  workspaceId: string;
  listingId: string;
  versionId: string;
  version: string;
  status: InstallStatus;
  enabled: boolean;
  config: Record<string, unknown>;
  grantedPermissions: PluginPermission[];
  installedByUserId: string | null;
  lastError: string | null;
  installedAt: string;
  updatedAt: string;
  disabledAt: string | null;
};

export type MarketplaceInstallWithListing = MarketplaceInstall & {
  listing: MarketplaceListing;
};

export type MarketplaceDeveloper = {
  id: string;
  workspaceId: string;
  displayName: string;
  websiteUrl: string | null;
  supportEmail: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketplaceApiKey = {
  id: string;
  workspaceId: string;
  developerId: string;
  name: string;
  keyPrefix: string;
  /** Present only immediately after creation. */
  keyPlaintext?: string;
  scopes: string[];
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketplaceSandboxRun = {
  id: string;
  workspaceId: string;
  installId: string | null;
  listingId: string | null;
  hook: string;
  status: SandboxRunStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  logs: string[];
  permissionsUsed: PluginPermission[];
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
  finishedAt: string | null;
};

export type MarketplacePurchase = {
  id: string;
  workspaceId: string;
  listingId: string;
  status: PurchaseStatus;
  pricingModel: PricingModel;
  amountCents: number;
  currency: string;
  stripePaymentIntentId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type MarketplaceOverview = {
  catalogTotal: number;
  publishedListings: number;
  installs: number;
  enabledInstalls: number;
  disabledInstalls: number;
  updatesAvailable: number;
  sandboxRuns: number;
  purchases: number;
  byKind: Record<ListingKind, number>;
};

export type CatalogFilters = {
  q?: string;
  kind?: string;
  status?: string;
  tag?: string;
  pricingModel?: string;
  limit?: number;
  offset?: number;
};

export type PluginApiContext = {
  workspaceId: string;
  installId: string;
  listingId: string;
  permissions: PluginPermission[];
  config: Record<string, unknown>;
};

export type PluginApiResult = {
  ok: boolean;
  data?: Record<string, unknown>;
  error?: string;
};
