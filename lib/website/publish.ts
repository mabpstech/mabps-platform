import { sqlite } from "@/lib/db";
import {
  listPages,
  listPublishEvents,
  recordPublishEvent,
  updateSite,
  getSiteById,
} from "@/lib/website/repository";
import type {
  WebsitePublishEvent,
  WebsiteSite,
} from "@/lib/website/types";

export type PublishActor = {
  userId?: string | null;
  name?: string | null;
};

export type PublishResult = {
  site: WebsiteSite;
  publicPath: string;
  customDomain: string | null;
  domainVerified: boolean;
  domainVerificationToken: string | null;
  event: WebsitePublishEvent;
  draftPageCount: number;
};

export function publishSite(
  siteId: string,
  actor: PublishActor = {},
): PublishResult {
  const site = getSiteById(siteId);
  if (!site) throw new Error("Site not found.");

  const pages = listPages(siteId);
  const home = pages.find((page) => page.pageType === "home");
  if (!home) {
    throw new Error("A home page is required before publishing.");
  }
  if (home.status !== "published") {
    throw new Error(
      "Publish your home page before making the website live.",
    );
  }

  const publishedAt = new Date().toISOString();
  const draftPageCount = pages.filter(
    (page) => page.status !== "published",
  ).length;

  const run = sqlite.transaction(() => {
    const published = updateSite(siteId, {
      status: "published",
      publishedAt: site.publishedAt ?? publishedAt,
    });

    const event = recordPublishEvent({
      siteId,
      action: "publish",
      status: "published",
      actorUserId: actor.userId,
      actorName: actor.name,
      note:
        draftPageCount > 0
          ? `${draftPageCount} draft page${draftPageCount === 1 ? "" : "s"} remain private.`
          : null,
    });

    return { published, event };
  });

  const { published, event } = run();

  return {
    site: published,
    publicPath: `/p/${published.slug}`,
    customDomain: published.customDomain,
    domainVerified: published.domainVerified,
    domainVerificationToken: published.domainVerificationToken,
    event,
    draftPageCount,
  };
}

export function unpublishSite(
  siteId: string,
  actor: PublishActor = {},
): { site: WebsiteSite; event: WebsitePublishEvent } {
  const site = getSiteById(siteId);
  if (!site) throw new Error("Site not found.");
  const run = sqlite.transaction(() => {
    const unpublished = updateSite(siteId, { status: "unpublished" });
    const event = recordPublishEvent({
      siteId,
      action: "unpublish",
      status: "unpublished",
      actorUserId: actor.userId,
      actorName: actor.name,
    });
    return { site: unpublished, event };
  });
  return run();
}

export function getPublishHistory(
  siteId: string,
  limit = 20,
): WebsitePublishEvent[] {
  return listPublishEvents(siteId, limit);
}

export {
  setCustomDomain,
  verifyCustomDomain,
  resolvePublishedSiteByHost,
  buildDomainInstructions,
  appHostnameForDomains,
} from "@/lib/website/domain";
