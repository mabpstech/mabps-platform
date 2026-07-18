import { NextResponse } from "next/server";
import {
  requireSiteForWorkspace,
  requireWebsiteMemberApi,
} from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import {
  getFormById,
  listFormSubmissions,
} from "@/lib/website/repository";

type RouteContext = {
  params: Promise<{ siteId: string; formId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteMemberApi();
    const { siteId, formId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const form = getFormById(formId);
    if (!form || form.siteId !== siteId) {
      return NextResponse.json({ error: "Form not found." }, { status: 404 });
    }
    return NextResponse.json({
      submissions: listFormSubmissions(formId),
    });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
