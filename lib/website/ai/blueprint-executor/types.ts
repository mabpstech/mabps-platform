/**
 * Blueprint Executor contracts (Sprint B1).
 * AiWebsiteBlueprint → persisted Website Builder project.
 * No LLM, UI, or API — pure execution over existing repositories/services.
 */

import type { AiWebsiteBlueprint } from "@/lib/website/ai/types";
import type {
  WebsiteNavItem,
  WebsitePage,
  WebsiteSection,
  WebsiteSite,
} from "@/lib/website/types";

export type AiBlueprintExecuteInput = {
  workspaceId: string;
  blueprint: AiWebsiteBlueprint;
};

export type AiBlueprintExecuteResult = {
  siteId: string;
  site: WebsiteSite;
  /** Page id keyed by blueprint slug after persist. */
  pageIdsBySlug: Record<string, string>;
  pages: WebsitePage[];
  sectionsByPageId: Record<string, WebsiteSection[]>;
  navigation: WebsiteNavItem[];
};
