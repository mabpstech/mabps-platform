import { createHash, randomUUID } from "node:crypto";
import { sqlite } from "@/lib/db";
import { SEED_LISTINGS, defaultDeveloperName } from "@/lib/marketplace/defaults";
import {
  installListing as installListingEngine,
  setInstallEnabled as setInstallEnabledEngine,
  uninstallListing as uninstallListingEngine,
  updateInstallVersion as updateInstallVersionEngine,
  type InstallDeps,
} from "@/lib/marketplace/engine/install";
import { normalizePermissions } from "@/lib/marketplace/engine/permissions";
import { executeInSandbox } from "@/lib/marketplace/engine/sandbox";
import {
  buildUpdateAvailability,
  type UpdateAvailability,
} from "@/lib/marketplace/engine/updates";
import { migrateMarketplaceSchema } from "@/lib/marketplace/migrate";
import {
  generateApiKeyPlaintext,
  hashApiKey,
  normalizeSdkScopes,
  type SdkScope,
} from "@/lib/marketplace/sdk";
import type {
  CatalogFilters,
  ListingKind,
  ListingStatus,
  MarketplaceApiKey,
  MarketplaceDeveloper,
  MarketplaceInstall,
  MarketplaceInstallWithListing,
  MarketplaceListing,
  MarketplaceListingVersion,
  MarketplaceOverview,
  MarketplacePurchase,
  MarketplaceSandboxRun,
  PluginManifest,
  PluginPermission,
  PricingModel,
  PurchaseStatus,
  SandboxRunStatus,
} from "@/lib/marketplace/types";
import {
  LISTING_KINDS,
  LISTING_STATUSES,
  LISTING_VISIBILITIES,
  PRICING_MODELS,
} from "@/lib/marketplace/types";

let seeded = false;

export function ensureMarketplaceReady(): void {
  migrateMarketplaceSchema();
  seedCatalogIfEmpty();
}

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

function boolFromInt(value: unknown): boolean {
  return Number(value) === 1;
}

function isListingKind(value: string): value is ListingKind {
  return (LISTING_KINDS as readonly string[]).includes(value);
}

function isListingStatus(value: string): value is ListingStatus {
  return (LISTING_STATUSES as readonly string[]).includes(value);
}

function isPricingModel(value: string): value is PricingModel {
  return (PRICING_MODELS as readonly string[]).includes(value);
}

function defaultManifest(permissions: PluginPermission[] = []): PluginManifest {
  return {
    entry: "index.js",
    hooks: ["on_install", "on_uninstall"],
    permissions,
    sandbox: { timeoutMs: 2_000, allowNetwork: false, maxOutputBytes: 64_000 },
  };
}

function rowToListing(row: Record<string, unknown>): MarketplaceListing {
  return {
    id: String(row.id),
    publisherWorkspaceId: row.publisherWorkspaceId
      ? String(row.publisherWorkspaceId)
      : null,
    kind: isListingKind(String(row.kind)) ? (row.kind as ListingKind) : "plugin",
    slug: String(row.slug),
    name: String(row.name),
    summary: String(row.summary ?? ""),
    description: String(row.description ?? ""),
    status: isListingStatus(String(row.status))
      ? (row.status as ListingStatus)
      : "draft",
    visibility: (LISTING_VISIBILITIES as readonly string[]).includes(
      String(row.visibility),
    )
      ? (row.visibility as MarketplaceListing["visibility"])
      : "public",
    pricingModel: isPricingModel(String(row.pricingModel))
      ? (row.pricingModel as PricingModel)
      : "free",
    priceCents: Number(row.priceCents ?? 0),
    currency: String(row.currency ?? "usd"),
    minPlanId: String(row.minPlanId ?? "free"),
    iconUrl: row.iconUrl ? String(row.iconUrl) : null,
    coverUrl: row.coverUrl ? String(row.coverUrl) : null,
    categories: parseJson<string[]>(row.categoriesJson, []),
    tags: parseJson<string[]>(row.tagsJson, []),
    permissions: normalizePermissions(parseJson(row.permissionsJson, [])),
    manifest: {
      ...defaultManifest(),
      ...parseJson<Partial<PluginManifest>>(row.manifestJson, {}),
    },
    latestVersion: String(row.latestVersion ?? "1.0.0"),
    downloads: Number(row.downloads ?? 0),
    ratingAverage: Number(row.ratingAverage ?? 0),
    ratingCount: Number(row.ratingCount ?? 0),
    metadata: parseJson<Record<string, unknown>>(row.metadataJson, {}),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
    publishedAt: row.publishedAt ? String(row.publishedAt) : null,
  };
}

function rowToVersion(row: Record<string, unknown>): MarketplaceListingVersion {
  return {
    id: String(row.id),
    listingId: String(row.listingId),
    version: String(row.version),
    changelog: row.changelog ? String(row.changelog) : null,
    packageUrl: row.packageUrl ? String(row.packageUrl) : null,
    checksum: row.checksum ? String(row.checksum) : null,
    manifest: {
      ...defaultManifest(),
      ...parseJson<Partial<PluginManifest>>(row.manifestJson, {}),
    },
    isLatest: boolFromInt(row.isLatest),
    createdAt: String(row.createdAt),
  };
}

function rowToInstall(row: Record<string, unknown>): MarketplaceInstall {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    listingId: String(row.listingId),
    versionId: String(row.versionId),
    version: String(row.version),
    status: String(row.status) as MarketplaceInstall["status"],
    enabled: boolFromInt(row.enabled),
    config: parseJson<Record<string, unknown>>(row.configJson, {}),
    grantedPermissions: normalizePermissions(
      parseJson(row.grantedPermissionsJson, []),
    ),
    installedByUserId: row.installedByUserId
      ? String(row.installedByUserId)
      : null,
    lastError: row.lastError ? String(row.lastError) : null,
    installedAt: String(row.installedAt),
    updatedAt: String(row.updatedAt),
    disabledAt: row.disabledAt ? String(row.disabledAt) : null,
  };
}

function rowToDeveloper(row: Record<string, unknown>): MarketplaceDeveloper {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    displayName: String(row.displayName),
    websiteUrl: row.websiteUrl ? String(row.websiteUrl) : null,
    supportEmail: row.supportEmail ? String(row.supportEmail) : null,
    bio: row.bio ? String(row.bio) : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToApiKey(row: Record<string, unknown>): MarketplaceApiKey {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    developerId: String(row.developerId),
    name: String(row.name),
    keyPrefix: String(row.keyPrefix),
    scopes: parseJson<string[]>(row.scopesJson, []),
    lastUsedAt: row.lastUsedAt ? String(row.lastUsedAt) : null,
    revokedAt: row.revokedAt ? String(row.revokedAt) : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToSandboxRun(row: Record<string, unknown>): MarketplaceSandboxRun {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    installId: row.installId ? String(row.installId) : null,
    listingId: row.listingId ? String(row.listingId) : null,
    hook: String(row.hook),
    status: String(row.status) as SandboxRunStatus,
    input: parseJson<Record<string, unknown>>(row.inputJson, {}),
    output: parseJson<Record<string, unknown>>(row.outputJson, {}),
    logs: parseJson<string[]>(row.logsJson, []),
    permissionsUsed: normalizePermissions(
      parseJson(row.permissionsUsedJson, []),
    ),
    errorMessage: row.errorMessage ? String(row.errorMessage) : null,
    durationMs:
      row.durationMs === null || row.durationMs === undefined
        ? null
        : Number(row.durationMs),
    createdAt: String(row.createdAt),
    finishedAt: row.finishedAt ? String(row.finishedAt) : null,
  };
}

function rowToPurchase(row: Record<string, unknown>): MarketplacePurchase {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    listingId: String(row.listingId),
    status: String(row.status) as PurchaseStatus,
    pricingModel: isPricingModel(String(row.pricingModel))
      ? (row.pricingModel as PricingModel)
      : "free",
    amountCents: Number(row.amountCents ?? 0),
    currency: String(row.currency ?? "usd"),
    stripePaymentIntentId: row.stripePaymentIntentId
      ? String(row.stripePaymentIntentId)
      : null,
    metadata: parseJson<Record<string, unknown>>(row.metadataJson, {}),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
    completedAt: row.completedAt ? String(row.completedAt) : null,
  };
}

function seedCatalogIfEmpty(): void {
  if (seeded) return;
  const count = sqlite
    .prepare(`SELECT COUNT(*) as c FROM "marketplace_listing"`)
    .get() as { c: number };
  if (Number(count.c) > 0) {
    seeded = true;
    return;
  }

  const now = nowIso();
  const insertListing = sqlite.prepare(`
    INSERT INTO "marketplace_listing" (
      "id", "publisherWorkspaceId", "kind", "slug", "name", "summary", "description",
      "status", "visibility", "pricingModel", "priceCents", "currency", "minPlanId",
      "iconUrl", "coverUrl", "categoriesJson", "tagsJson", "permissionsJson",
      "manifestJson", "latestVersion", "downloads", "ratingAverage", "ratingCount",
      "metadataJson", "createdAt", "updatedAt", "publishedAt"
    ) VALUES (
      @id, NULL, @kind, @slug, @name, @summary, @description,
      'published', 'public', @pricingModel, @priceCents, 'usd', @minPlanId,
      NULL, NULL, @categoriesJson, @tagsJson, @permissionsJson,
      @manifestJson, @latestVersion, 0, @ratingAverage, @ratingCount,
      '{}', @createdAt, @updatedAt, @publishedAt
    )
  `);

  const insertVersion = sqlite.prepare(`
    INSERT INTO "marketplace_listing_version" (
      "id", "listingId", "version", "changelog", "packageUrl", "checksum",
      "manifestJson", "isLatest", "createdAt"
    ) VALUES (
      @id, @listingId, @version, @changelog, NULL, @checksum,
      @manifestJson, @isLatest, @createdAt
    )
  `);

  const tx = sqlite.transaction(() => {
    for (const seed of SEED_LISTINGS) {
      const listingId = randomUUID();
      const latest = seed.versions[seed.versions.length - 1]!;
      insertListing.run({
        id: listingId,
        kind: seed.kind,
        slug: seed.slug,
        name: seed.name,
        summary: seed.summary,
        description: seed.description,
        pricingModel: seed.pricingModel,
        priceCents: seed.priceCents,
        minPlanId: seed.minPlanId,
        categoriesJson: JSON.stringify(seed.categories),
        tagsJson: JSON.stringify(seed.tags),
        permissionsJson: JSON.stringify(seed.permissions),
        manifestJson: JSON.stringify(seed.manifest),
        latestVersion: latest.version,
        ratingAverage: seed.ratingAverage,
        ratingCount: seed.ratingCount,
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
      });

      seed.versions.forEach((version, index) => {
        const isLatest = index === seed.versions.length - 1;
        insertVersion.run({
          id: randomUUID(),
          listingId,
          version: version.version,
          changelog: version.changelog,
          checksum: createHash("sha256")
            .update(`${seed.slug}@${version.version}`)
            .digest("hex"),
          manifestJson: JSON.stringify(seed.manifest),
          isLatest: isLatest ? 1 : 0,
          createdAt: now,
        });
      });
    }
  });

  tx();
  seeded = true;
}

export function getMarketplaceOverview(
  workspaceId: string,
): MarketplaceOverview {
  ensureMarketplaceReady();

  const catalog = sqlite
    .prepare(
      `SELECT "kind", COUNT(*) as c FROM "marketplace_listing"
       WHERE "status" = 'published'
         AND ("visibility" = 'public' OR "publisherWorkspaceId" = ?)
       GROUP BY "kind"`,
    )
    .all(workspaceId) as Array<{ kind: string; c: number }>;

  const byKind = Object.fromEntries(
    LISTING_KINDS.map((kind) => [kind, 0]),
  ) as Record<ListingKind, number>;
  let publishedListings = 0;
  for (const row of catalog) {
    if (isListingKind(row.kind)) {
      byKind[row.kind] = Number(row.c);
      publishedListings += Number(row.c);
    }
  }

  const installStats = sqlite
    .prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN "enabled" = 1 THEN 1 ELSE 0 END) as enabled,
         SUM(CASE WHEN "enabled" = 0 THEN 1 ELSE 0 END) as disabled
       FROM "marketplace_install" WHERE "workspaceId" = ?`,
    )
    .get(workspaceId) as {
    total: number;
    enabled: number | null;
    disabled: number | null;
  };

  const sandboxRuns = sqlite
    .prepare(
      `SELECT COUNT(*) as c FROM "marketplace_sandbox_run" WHERE "workspaceId" = ?`,
    )
    .get(workspaceId) as { c: number };

  const purchases = sqlite
    .prepare(
      `SELECT COUNT(*) as c FROM "marketplace_purchase"
       WHERE "workspaceId" = ? AND "status" = 'completed'`,
    )
    .get(workspaceId) as { c: number };

  const updatesAvailable = listUpdatesAvailable(workspaceId).length;

  return {
    catalogTotal: publishedListings,
    publishedListings,
    installs: Number(installStats.total ?? 0),
    enabledInstalls: Number(installStats.enabled ?? 0),
    disabledInstalls: Number(installStats.disabled ?? 0),
    updatesAvailable,
    sandboxRuns: Number(sandboxRuns.c ?? 0),
    purchases: Number(purchases.c ?? 0),
    byKind,
  };
}

export function listCatalog(
  workspaceId: string,
  filters: CatalogFilters = {},
): MarketplaceListing[] {
  ensureMarketplaceReady();

  const clauses = [
    `("visibility" = 'public' OR "publisherWorkspaceId" = @workspaceId)`,
  ];
  const params: Record<string, unknown> = { workspaceId };

  if (filters.kind && isListingKind(filters.kind)) {
    clauses.push(`"kind" = @kind`);
    params.kind = filters.kind;
  }

  if (filters.status && isListingStatus(filters.status)) {
    clauses.push(`"status" = @status`);
    params.status = filters.status;
  } else {
    clauses.push(`"status" = 'published'`);
  }

  if (filters.pricingModel && isPricingModel(filters.pricingModel)) {
    clauses.push(`"pricingModel" = @pricingModel`);
    params.pricingModel = filters.pricingModel;
  }

  if (filters.q) {
    clauses.push(
      `("name" LIKE @q OR "summary" LIKE @q OR "slug" LIKE @q OR "tagsJson" LIKE @q)`,
    );
    params.q = `%${filters.q}%`;
  }

  if (filters.tag) {
    clauses.push(`"tagsJson" LIKE @tag`);
    params.tag = `%${filters.tag}%`;
  }

  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;

  const rows = sqlite
    .prepare(
      `SELECT * FROM "marketplace_listing"
       WHERE ${clauses.join(" AND ")}
       ORDER BY "downloads" DESC, "name" ASC
       LIMIT ${limit} OFFSET ${offset}`,
    )
    .all(params) as Array<Record<string, unknown>>;

  return rows.map(rowToListing);
}

export function getListingById(listingId: string): MarketplaceListing | null {
  ensureMarketplaceReady();
  const row = sqlite
    .prepare(`SELECT * FROM "marketplace_listing" WHERE "id" = ?`)
    .get(listingId) as Record<string, unknown> | undefined;
  return row ? rowToListing(row) : null;
}

export function getListingBySlug(slug: string): MarketplaceListing | null {
  ensureMarketplaceReady();
  const row = sqlite
    .prepare(`SELECT * FROM "marketplace_listing" WHERE "slug" = ?`)
    .get(slug) as Record<string, unknown> | undefined;
  return row ? rowToListing(row) : null;
}

export function listListingVersions(
  listingId: string,
): MarketplaceListingVersion[] {
  ensureMarketplaceReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "marketplace_listing_version"
       WHERE "listingId" = ?
       ORDER BY "createdAt" DESC`,
    )
    .all(listingId) as Array<Record<string, unknown>>;
  return rows.map(rowToVersion);
}

export function getLatestVersion(
  listingId: string,
): MarketplaceListingVersion | null {
  ensureMarketplaceReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "marketplace_listing_version"
       WHERE "listingId" = ? AND "isLatest" = 1
       LIMIT 1`,
    )
    .get(listingId) as Record<string, unknown> | undefined;
  return row ? rowToVersion(row) : null;
}

export function getVersionById(
  versionId: string,
): MarketplaceListingVersion | null {
  ensureMarketplaceReady();
  const row = sqlite
    .prepare(`SELECT * FROM "marketplace_listing_version" WHERE "id" = ?`)
    .get(versionId) as Record<string, unknown> | undefined;
  return row ? rowToVersion(row) : null;
}

export function listInstalls(
  workspaceId: string,
): MarketplaceInstall[] {
  ensureMarketplaceReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "marketplace_install"
       WHERE "workspaceId" = ?
       ORDER BY "installedAt" DESC`,
    )
    .all(workspaceId) as Array<Record<string, unknown>>;
  return rows.map(rowToInstall);
}

export function listInstallsWithListings(
  workspaceId: string,
): MarketplaceInstallWithListing[] {
  ensureMarketplaceReady();
  const rows = sqlite
    .prepare(
      `SELECT i.*,
         l."id" as l_id, l."publisherWorkspaceId" as l_publisherWorkspaceId,
         l."kind" as l_kind, l."slug" as l_slug, l."name" as l_name,
         l."summary" as l_summary, l."description" as l_description,
         l."status" as l_status, l."visibility" as l_visibility,
         l."pricingModel" as l_pricingModel, l."priceCents" as l_priceCents,
         l."currency" as l_currency, l."minPlanId" as l_minPlanId,
         l."iconUrl" as l_iconUrl, l."coverUrl" as l_coverUrl,
         l."categoriesJson" as l_categoriesJson, l."tagsJson" as l_tagsJson,
         l."permissionsJson" as l_permissionsJson, l."manifestJson" as l_manifestJson,
         l."latestVersion" as l_latestVersion, l."downloads" as l_downloads,
         l."ratingAverage" as l_ratingAverage, l."ratingCount" as l_ratingCount,
         l."metadataJson" as l_metadataJson, l."createdAt" as l_createdAt,
         l."updatedAt" as l_updatedAt, l."publishedAt" as l_publishedAt
       FROM "marketplace_install" i
       JOIN "marketplace_listing" l ON l."id" = i."listingId"
       WHERE i."workspaceId" = ?
       ORDER BY i."installedAt" DESC`,
    )
    .all(workspaceId) as Array<Record<string, unknown>>;

  return rows.map((row) => {
    const install = rowToInstall(row);
    const listing = rowToListing({
      id: row.l_id,
      publisherWorkspaceId: row.l_publisherWorkspaceId,
      kind: row.l_kind,
      slug: row.l_slug,
      name: row.l_name,
      summary: row.l_summary,
      description: row.l_description,
      status: row.l_status,
      visibility: row.l_visibility,
      pricingModel: row.l_pricingModel,
      priceCents: row.l_priceCents,
      currency: row.l_currency,
      minPlanId: row.l_minPlanId,
      iconUrl: row.l_iconUrl,
      coverUrl: row.l_coverUrl,
      categoriesJson: row.l_categoriesJson,
      tagsJson: row.l_tagsJson,
      permissionsJson: row.l_permissionsJson,
      manifestJson: row.l_manifestJson,
      latestVersion: row.l_latestVersion,
      downloads: row.l_downloads,
      ratingAverage: row.l_ratingAverage,
      ratingCount: row.l_ratingCount,
      metadataJson: row.l_metadataJson,
      createdAt: row.l_createdAt,
      updatedAt: row.l_updatedAt,
      publishedAt: row.l_publishedAt,
    });
    return { ...install, listing };
  });
}

export function getInstallById(
  workspaceId: string,
  installId: string,
): MarketplaceInstall | null {
  ensureMarketplaceReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "marketplace_install"
       WHERE "workspaceId" = ? AND "id" = ?`,
    )
    .get(workspaceId, installId) as Record<string, unknown> | undefined;
  return row ? rowToInstall(row) : null;
}

export function getInstallByWorkspaceListing(
  workspaceId: string,
  listingId: string,
): MarketplaceInstall | null {
  ensureMarketplaceReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "marketplace_install"
       WHERE "workspaceId" = ? AND "listingId" = ?`,
    )
    .get(workspaceId, listingId) as Record<string, unknown> | undefined;
  return row ? rowToInstall(row) : null;
}

export function getInstallWithListingBySlug(
  workspaceId: string,
  slug: string,
): MarketplaceInstallWithListing | null {
  return (
    listInstallsWithListings(workspaceId).find(
      (row) => row.listing.slug === slug,
    ) ?? null
  );
}

export function countEnabledInstalls(workspaceId: string): number {
  ensureMarketplaceReady();
  const row = sqlite
    .prepare(
      `SELECT COUNT(*) as c FROM "marketplace_install"
       WHERE "workspaceId" = ? AND "enabled" = 1`,
    )
    .get(workspaceId) as { c: number };
  return Number(row.c ?? 0);
}

function insertInstall(input: {
  workspaceId: string;
  listingId: string;
  versionId: string;
  version: string;
  grantedPermissions: PluginPermission[];
  config: Record<string, unknown>;
  installedByUserId: string | null;
}): MarketplaceInstall {
  const now = nowIso();
  const id = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "marketplace_install" (
         "id", "workspaceId", "listingId", "versionId", "version", "status",
         "enabled", "configJson", "grantedPermissionsJson", "installedByUserId",
         "lastError", "installedAt", "updatedAt", "disabledAt"
       ) VALUES (
         @id, @workspaceId, @listingId, @versionId, @version, 'installed',
         1, @configJson, @grantedPermissionsJson, @installedByUserId,
         NULL, @installedAt, @updatedAt, NULL
       )`,
    )
    .run({
      id,
      workspaceId: input.workspaceId,
      listingId: input.listingId,
      versionId: input.versionId,
      version: input.version,
      configJson: JSON.stringify(input.config),
      grantedPermissionsJson: JSON.stringify(input.grantedPermissions),
      installedByUserId: input.installedByUserId,
      installedAt: now,
      updatedAt: now,
    });
  return getInstallById(input.workspaceId, id)!;
}

function updateInstallRecord(
  workspaceId: string,
  installId: string,
  patch: Partial<{
    status: MarketplaceInstall["status"];
    enabled: boolean;
    versionId: string;
    version: string;
    config: Record<string, unknown>;
    grantedPermissions: PluginPermission[];
    lastError: string | null;
    disabledAt: string | null;
  }>,
): MarketplaceInstall {
  const current = getInstallById(workspaceId, installId);
  if (!current) throw new Error("Install not found.");

  const next = {
    status: patch.status ?? current.status,
    enabled:
      typeof patch.enabled === "boolean" ? (patch.enabled ? 1 : 0) : current.enabled ? 1 : 0,
    versionId: patch.versionId ?? current.versionId,
    version: patch.version ?? current.version,
    configJson: JSON.stringify(patch.config ?? current.config),
    grantedPermissionsJson: JSON.stringify(
      patch.grantedPermissions ?? current.grantedPermissions,
    ),
    lastError:
      patch.lastError === undefined ? current.lastError : patch.lastError,
    disabledAt:
      patch.disabledAt === undefined ? current.disabledAt : patch.disabledAt,
    updatedAt: nowIso(),
  };

  sqlite
    .prepare(
      `UPDATE "marketplace_install" SET
         "status" = @status,
         "enabled" = @enabled,
         "versionId" = @versionId,
         "version" = @version,
         "configJson" = @configJson,
         "grantedPermissionsJson" = @grantedPermissionsJson,
         "lastError" = @lastError,
         "disabledAt" = @disabledAt,
         "updatedAt" = @updatedAt
       WHERE "workspaceId" = @workspaceId AND "id" = @id`,
    )
    .run({
      ...next,
      workspaceId,
      id: installId,
    });

  return getInstallById(workspaceId, installId)!;
}

function deleteInstallRecord(workspaceId: string, installId: string): void {
  const result = sqlite
    .prepare(
      `DELETE FROM "marketplace_install"
       WHERE "workspaceId" = ? AND "id" = ?`,
    )
    .run(workspaceId, installId);
  if (result.changes === 0) {
    throw new Error("Install not found.");
  }
}

function incrementDownloads(listingId: string): void {
  sqlite
    .prepare(
      `UPDATE "marketplace_listing"
       SET "downloads" = "downloads" + 1, "updatedAt" = ?
       WHERE "id" = ?`,
    )
    .run(nowIso(), listingId);
}

export function hasCompletedPurchase(
  workspaceId: string,
  listingId: string,
): boolean {
  ensureMarketplaceReady();
  const row = sqlite
    .prepare(
      `SELECT "id" FROM "marketplace_purchase"
       WHERE "workspaceId" = ? AND "listingId" = ? AND "status" = 'completed'
       LIMIT 1`,
    )
    .get(workspaceId, listingId) as { id: string } | undefined;
  return Boolean(row);
}

export function createCompletedPurchase(input: {
  workspaceId: string;
  listingId: string;
  pricingModel: PricingModel;
  amountCents: number;
  currency: string;
  metadata?: Record<string, unknown>;
}): MarketplacePurchase {
  ensureMarketplaceReady();
  if (hasCompletedPurchase(input.workspaceId, input.listingId)) {
    const existing = sqlite
      .prepare(
        `SELECT * FROM "marketplace_purchase"
         WHERE "workspaceId" = ? AND "listingId" = ? AND "status" = 'completed'
         LIMIT 1`,
      )
      .get(input.workspaceId, input.listingId) as Record<string, unknown>;
    return rowToPurchase(existing);
  }

  const now = nowIso();
  const id = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "marketplace_purchase" (
         "id", "workspaceId", "listingId", "status", "pricingModel",
         "amountCents", "currency", "stripePaymentIntentId", "metadataJson",
         "createdAt", "updatedAt", "completedAt"
       ) VALUES (
         @id, @workspaceId, @listingId, 'completed', @pricingModel,
         @amountCents, @currency, NULL, @metadataJson,
         @createdAt, @updatedAt, @completedAt
       )`,
    )
    .run({
      id,
      workspaceId: input.workspaceId,
      listingId: input.listingId,
      pricingModel: input.pricingModel,
      amountCents: input.amountCents,
      currency: input.currency,
      metadataJson: JSON.stringify(input.metadata ?? {}),
      createdAt: now,
      updatedAt: now,
      completedAt: now,
    });

  return rowToPurchase(
    sqlite
      .prepare(`SELECT * FROM "marketplace_purchase" WHERE "id" = ?`)
      .get(id) as Record<string, unknown>,
  );
}

export function listPurchases(workspaceId: string): MarketplacePurchase[] {
  ensureMarketplaceReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "marketplace_purchase"
       WHERE "workspaceId" = ?
       ORDER BY "createdAt" DESC`,
    )
    .all(workspaceId) as Array<Record<string, unknown>>;
  return rows.map(rowToPurchase);
}

export function recordSandboxRun(input: {
  workspaceId: string;
  installId: string | null;
  listingId: string | null;
  hook: string;
  result: ReturnType<typeof executeInSandbox>;
  inputPayload?: Record<string, unknown>;
}): MarketplaceSandboxRun {
  ensureMarketplaceReady();
  const now = nowIso();
  const id = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "marketplace_sandbox_run" (
         "id", "workspaceId", "installId", "listingId", "hook", "status",
         "inputJson", "outputJson", "logsJson", "permissionsUsedJson",
         "errorMessage", "durationMs", "createdAt", "finishedAt"
       ) VALUES (
         @id, @workspaceId, @installId, @listingId, @hook, @status,
         @inputJson, @outputJson, @logsJson, @permissionsUsedJson,
         @errorMessage, @durationMs, @createdAt, @finishedAt
       )`,
    )
    .run({
      id,
      workspaceId: input.workspaceId,
      installId: input.installId,
      listingId: input.listingId,
      hook: input.hook,
      status: input.result.status,
      inputJson: JSON.stringify(input.inputPayload ?? {}),
      outputJson: JSON.stringify(input.result.output),
      logsJson: JSON.stringify(input.result.logs),
      permissionsUsedJson: JSON.stringify(input.result.permissionsUsed),
      errorMessage: input.result.errorMessage,
      durationMs: input.result.durationMs,
      createdAt: now,
      finishedAt: now,
    });

  return rowToSandboxRun(
    sqlite
      .prepare(`SELECT * FROM "marketplace_sandbox_run" WHERE "id" = ?`)
      .get(id) as Record<string, unknown>,
  );
}

export function listSandboxRuns(
  workspaceId: string,
  options: { limit?: number } = {},
): MarketplaceSandboxRun[] {
  ensureMarketplaceReady();
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const rows = sqlite
    .prepare(
      `SELECT * FROM "marketplace_sandbox_run"
       WHERE "workspaceId" = ?
       ORDER BY "createdAt" DESC
       LIMIT ?`,
    )
    .all(workspaceId, limit) as Array<Record<string, unknown>>;
  return rows.map(rowToSandboxRun);
}

function installDeps(): InstallDeps {
  return {
    getListingById,
    getLatestVersion,
    getVersionById,
    getInstallByWorkspaceListing,
    insertInstall,
    updateInstallRecord,
    deleteInstallRecord,
    incrementDownloads,
    hasCompletedPurchase,
    createCompletedPurchase,
    recordSandboxRun: (input) => {
      recordSandboxRun(input);
    },
    countEnabledInstalls,
    listInstallsWithListings,
  };
}

export function installMarketplaceListing(input: {
  workspaceId: string;
  listingId: string;
  userId?: string | null;
  config?: Record<string, unknown>;
  permissions?: PluginPermission[];
}): MarketplaceInstall {
  ensureMarketplaceReady();
  return installListingEngine(installDeps(), input);
}

export function uninstallMarketplaceListing(input: {
  workspaceId: string;
  installId: string;
}): void {
  ensureMarketplaceReady();
  uninstallListingEngine(installDeps(), input);
}

export function enableMarketplaceInstall(input: {
  workspaceId: string;
  installId: string;
}): MarketplaceInstall {
  ensureMarketplaceReady();
  return setInstallEnabledEngine(installDeps(), {
    ...input,
    enabled: true,
  });
}

export function disableMarketplaceInstall(input: {
  workspaceId: string;
  installId: string;
}): MarketplaceInstall {
  ensureMarketplaceReady();
  return setInstallEnabledEngine(installDeps(), {
    ...input,
    enabled: false,
  });
}

export function updateMarketplaceInstall(input: {
  workspaceId: string;
  installId: string;
  versionId?: string;
}): MarketplaceInstall {
  ensureMarketplaceReady();
  return updateInstallVersionEngine(installDeps(), input);
}

export function updateInstallConfig(input: {
  workspaceId: string;
  installId: string;
  config: Record<string, unknown>;
  permissions?: PluginPermission[];
}): MarketplaceInstall {
  ensureMarketplaceReady();
  const current = getInstallById(input.workspaceId, input.installId);
  if (!current) throw new Error("Install not found.");
  const listing = getListingById(current.listingId);
  if (!listing) throw new Error("Listing not found.");

  return updateInstallRecord(input.workspaceId, input.installId, {
    config: input.config,
    grantedPermissions: input.permissions
      ? normalizePermissions(input.permissions).filter((permission) =>
          listing.permissions.includes(permission),
        )
      : undefined,
  });
}

export function listUpdatesAvailable(
  workspaceId: string,
): UpdateAvailability[] {
  ensureMarketplaceReady();
  return listInstallsWithListings(workspaceId)
    .map((install) =>
      buildUpdateAvailability(
        install,
        install.listing,
        getLatestVersion(install.listingId),
      ),
    )
    .filter((row) => row.available);
}

export function runSandboxForInstall(input: {
  workspaceId: string;
  installId: string;
  hook: string;
  payload?: Record<string, unknown>;
}): MarketplaceSandboxRun {
  ensureMarketplaceReady();
  const install = listInstallsWithListings(input.workspaceId).find(
    (row) => row.id === input.installId,
  );
  if (!install) throw new Error("Install not found.");

  const result = executeInSandbox({
    workspaceId: input.workspaceId,
    install,
    listing: install.listing,
    hook: input.hook,
    input: input.payload ?? {},
  });

  return recordSandboxRun({
    workspaceId: input.workspaceId,
    installId: install.id,
    listingId: install.listingId,
    hook: input.hook,
    result,
    inputPayload: input.payload ?? {},
  });
}

export function upsertDeveloper(input: {
  workspaceId: string;
  displayName: string;
  websiteUrl?: string | null;
  supportEmail?: string | null;
  bio?: string | null;
}): MarketplaceDeveloper {
  ensureMarketplaceReady();
  const existing = getDeveloper(input.workspaceId);
  const now = nowIso();

  if (existing) {
    sqlite
      .prepare(
        `UPDATE "marketplace_developer" SET
           "displayName" = @displayName,
           "websiteUrl" = @websiteUrl,
           "supportEmail" = @supportEmail,
           "bio" = @bio,
           "updatedAt" = @updatedAt
         WHERE "workspaceId" = @workspaceId`,
      )
      .run({
        workspaceId: input.workspaceId,
        displayName: input.displayName.trim(),
        websiteUrl: input.websiteUrl ?? null,
        supportEmail: input.supportEmail ?? null,
        bio: input.bio ?? null,
        updatedAt: now,
      });
    return getDeveloper(input.workspaceId)!;
  }

  sqlite
    .prepare(
      `INSERT INTO "marketplace_developer" (
         "id", "workspaceId", "displayName", "websiteUrl", "supportEmail",
         "bio", "createdAt", "updatedAt"
       ) VALUES (
         @id, @workspaceId, @displayName, @websiteUrl, @supportEmail,
         @bio, @createdAt, @updatedAt
       )`,
    )
    .run({
      id: randomUUID(),
      workspaceId: input.workspaceId,
      displayName: input.displayName.trim() || defaultDeveloperName("Workspace"),
      websiteUrl: input.websiteUrl ?? null,
      supportEmail: input.supportEmail ?? null,
      bio: input.bio ?? null,
      createdAt: now,
      updatedAt: now,
    });

  return getDeveloper(input.workspaceId)!;
}

export function getDeveloper(
  workspaceId: string,
): MarketplaceDeveloper | null {
  ensureMarketplaceReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "marketplace_developer" WHERE "workspaceId" = ?`,
    )
    .get(workspaceId) as Record<string, unknown> | undefined;
  return row ? rowToDeveloper(row) : null;
}

export function ensureDeveloper(
  workspaceId: string,
  workspaceName: string,
): MarketplaceDeveloper {
  return (
    getDeveloper(workspaceId) ??
    upsertDeveloper({
      workspaceId,
      displayName: defaultDeveloperName(workspaceName),
    })
  );
}

export function createApiKey(input: {
  workspaceId: string;
  name: string;
  scopes?: SdkScope[];
}): MarketplaceApiKey {
  ensureMarketplaceReady();
  const developer = getDeveloper(input.workspaceId);
  if (!developer) {
    throw new Error("Developer profile not found. Create one first.");
  }

  const generated = generateApiKeyPlaintext();
  const now = nowIso();
  const id = randomUUID();
  const scopes = normalizeSdkScopes(input.scopes);

  sqlite
    .prepare(
      `INSERT INTO "marketplace_api_key" (
         "id", "workspaceId", "developerId", "name", "keyPrefix", "keyHash",
         "scopesJson", "lastUsedAt", "revokedAt", "createdAt", "updatedAt"
       ) VALUES (
         @id, @workspaceId, @developerId, @name, @keyPrefix, @keyHash,
         @scopesJson, NULL, NULL, @createdAt, @updatedAt
       )`,
    )
    .run({
      id,
      workspaceId: input.workspaceId,
      developerId: developer.id,
      name: input.name.trim() || "SDK key",
      keyPrefix: generated.prefix,
      keyHash: generated.hash,
      scopesJson: JSON.stringify(scopes),
      createdAt: now,
      updatedAt: now,
    });

  return {
    ...rowToApiKey(
      sqlite
        .prepare(`SELECT * FROM "marketplace_api_key" WHERE "id" = ?`)
        .get(id) as Record<string, unknown>,
    ),
    keyPlaintext: generated.plaintext,
  };
}

export function listApiKeys(workspaceId: string): MarketplaceApiKey[] {
  ensureMarketplaceReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "marketplace_api_key"
       WHERE "workspaceId" = ?
       ORDER BY "createdAt" DESC`,
    )
    .all(workspaceId) as Array<Record<string, unknown>>;
  return rows.map(rowToApiKey);
}

export function revokeApiKey(
  workspaceId: string,
  keyId: string,
): MarketplaceApiKey {
  ensureMarketplaceReady();
  const now = nowIso();
  const result = sqlite
    .prepare(
      `UPDATE "marketplace_api_key"
       SET "revokedAt" = @revokedAt, "updatedAt" = @updatedAt
       WHERE "workspaceId" = @workspaceId AND "id" = @id AND "revokedAt" IS NULL`,
    )
    .run({
      workspaceId,
      id: keyId,
      revokedAt: now,
      updatedAt: now,
    });
  if (result.changes === 0) {
    throw new Error("API key not found.");
  }
  const row = sqlite
    .prepare(
      `SELECT * FROM "marketplace_api_key" WHERE "workspaceId" = ? AND "id" = ?`,
    )
    .get(workspaceId, keyId) as Record<string, unknown>;
  return rowToApiKey(row);
}

export function resolveApiKey(
  plaintext: string,
): MarketplaceApiKey | null {
  ensureMarketplaceReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "marketplace_api_key" WHERE "keyHash" = ? LIMIT 1`,
    )
    .get(hashApiKey(plaintext)) as Record<string, unknown> | undefined;
  if (!row) return null;
  const key = rowToApiKey(row);
  if (key.revokedAt) return null;

  sqlite
    .prepare(
      `UPDATE "marketplace_api_key"
       SET "lastUsedAt" = ?, "updatedAt" = ?
       WHERE "id" = ?`,
    )
    .run(nowIso(), nowIso(), key.id);

  return key;
}

export function publishWorkspaceListing(input: {
  workspaceId: string;
  kind: ListingKind;
  slug: string;
  name: string;
  summary?: string;
  description?: string;
  pricingModel?: PricingModel;
  priceCents?: number;
  minPlanId?: string;
  permissions?: PluginPermission[];
  manifest?: PluginManifest;
  tags?: string[];
  categories?: string[];
  version?: string;
  changelog?: string;
}): MarketplaceListing {
  ensureMarketplaceReady();
  ensureDeveloper(input.workspaceId, "Workspace");

  const slug = input.slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) throw new Error("Slug is required.");

  const existing = getListingBySlug(slug);
  if (existing && existing.publisherWorkspaceId !== input.workspaceId) {
    throw new Error("Slug is already taken.");
  }

  const now = nowIso();
  const permissions = normalizePermissions(
    input.permissions ?? input.manifest?.permissions ?? [],
  );
  const manifest = input.manifest ?? defaultManifest(permissions);
  manifest.permissions = permissions;
  const version = input.version?.trim() || "1.0.0";

  if (existing) {
    sqlite
      .prepare(
        `UPDATE "marketplace_listing" SET
           "kind" = @kind,
           "name" = @name,
           "summary" = @summary,
           "description" = @description,
           "status" = 'published',
           "visibility" = 'public',
           "pricingModel" = @pricingModel,
           "priceCents" = @priceCents,
           "minPlanId" = @minPlanId,
           "categoriesJson" = @categoriesJson,
           "tagsJson" = @tagsJson,
           "permissionsJson" = @permissionsJson,
           "manifestJson" = @manifestJson,
           "latestVersion" = @latestVersion,
           "updatedAt" = @updatedAt,
           "publishedAt" = COALESCE("publishedAt", @publishedAt)
         WHERE "id" = @id AND "publisherWorkspaceId" = @workspaceId`,
      )
      .run({
        id: existing.id,
        workspaceId: input.workspaceId,
        kind: input.kind,
        name: input.name.trim(),
        summary: input.summary?.trim() || existing.summary,
        description: input.description?.trim() || existing.description,
        pricingModel: input.pricingModel ?? existing.pricingModel,
        priceCents: input.priceCents ?? existing.priceCents,
        minPlanId: input.minPlanId ?? existing.minPlanId,
        categoriesJson: JSON.stringify(input.categories ?? existing.categories),
        tagsJson: JSON.stringify(input.tags ?? existing.tags),
        permissionsJson: JSON.stringify(permissions),
        manifestJson: JSON.stringify(manifest),
        latestVersion: version,
        updatedAt: now,
        publishedAt: now,
      });

    publishListingVersion({
      listingId: existing.id,
      version,
      changelog: input.changelog ?? "Updated listing.",
      manifest,
    });

    return getListingById(existing.id)!;
  }

  const listingId = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "marketplace_listing" (
         "id", "publisherWorkspaceId", "kind", "slug", "name", "summary",
         "description", "status", "visibility", "pricingModel", "priceCents",
         "currency", "minPlanId", "iconUrl", "coverUrl", "categoriesJson",
         "tagsJson", "permissionsJson", "manifestJson", "latestVersion",
         "downloads", "ratingAverage", "ratingCount", "metadataJson",
         "createdAt", "updatedAt", "publishedAt"
       ) VALUES (
         @id, @publisherWorkspaceId, @kind, @slug, @name, @summary,
         @description, 'published', 'public', @pricingModel, @priceCents,
         'usd', @minPlanId, NULL, NULL, @categoriesJson,
         @tagsJson, @permissionsJson, @manifestJson, @latestVersion,
         0, 0, 0, '{}',
         @createdAt, @updatedAt, @publishedAt
       )`,
    )
    .run({
      id: listingId,
      publisherWorkspaceId: input.workspaceId,
      kind: input.kind,
      slug,
      name: input.name.trim(),
      summary: input.summary?.trim() || "",
      description: input.description?.trim() || "",
      pricingModel: input.pricingModel ?? "free",
      priceCents: input.priceCents ?? 0,
      minPlanId: input.minPlanId ?? "free",
      categoriesJson: JSON.stringify(input.categories ?? []),
      tagsJson: JSON.stringify(input.tags ?? []),
      permissionsJson: JSON.stringify(permissions),
      manifestJson: JSON.stringify(manifest),
      latestVersion: version,
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
    });

  publishListingVersion({
    listingId,
    version,
    changelog: input.changelog ?? "Initial release.",
    manifest,
  });

  return getListingById(listingId)!;
}

export function publishListingVersion(input: {
  listingId: string;
  version: string;
  changelog?: string;
  manifest: PluginManifest;
  packageUrl?: string | null;
}): MarketplaceListingVersion {
  ensureMarketplaceReady();
  const listing = getListingById(input.listingId);
  if (!listing) throw new Error("Listing not found.");

  const existing = sqlite
    .prepare(
      `SELECT "id" FROM "marketplace_listing_version"
       WHERE "listingId" = ? AND "version" = ?`,
    )
    .get(input.listingId, input.version) as { id: string } | undefined;
  if (existing) {
    throw new Error("Version already exists for this listing.");
  }

  const now = nowIso();
  const id = randomUUID();

  const tx = sqlite.transaction(() => {
    sqlite
      .prepare(
        `UPDATE "marketplace_listing_version"
         SET "isLatest" = 0
         WHERE "listingId" = ?`,
      )
      .run(input.listingId);

    sqlite
      .prepare(
        `INSERT INTO "marketplace_listing_version" (
           "id", "listingId", "version", "changelog", "packageUrl", "checksum",
           "manifestJson", "isLatest", "createdAt"
         ) VALUES (
           @id, @listingId, @version, @changelog, @packageUrl, @checksum,
           @manifestJson, 1, @createdAt
         )`,
      )
      .run({
        id,
        listingId: input.listingId,
        version: input.version,
        changelog: input.changelog ?? null,
        packageUrl: input.packageUrl ?? null,
        checksum: createHash("sha256")
          .update(`${listing.slug}@${input.version}`)
          .digest("hex"),
        manifestJson: JSON.stringify(input.manifest),
        createdAt: now,
      });

    sqlite
      .prepare(
        `UPDATE "marketplace_listing" SET
           "latestVersion" = @latestVersion,
           "manifestJson" = @manifestJson,
           "permissionsJson" = @permissionsJson,
           "updatedAt" = @updatedAt
         WHERE "id" = @id`,
      )
      .run({
        id: input.listingId,
        latestVersion: input.version,
        manifestJson: JSON.stringify(input.manifest),
        permissionsJson: JSON.stringify(input.manifest.permissions ?? []),
        updatedAt: now,
      });
  });

  tx();
  return getVersionById(id)!;
}

export function listWorkspaceListings(
  workspaceId: string,
): MarketplaceListing[] {
  ensureMarketplaceReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "marketplace_listing"
       WHERE "publisherWorkspaceId" = ?
       ORDER BY "updatedAt" DESC`,
    )
    .all(workspaceId) as Array<Record<string, unknown>>;
  return rows.map(rowToListing);
}
