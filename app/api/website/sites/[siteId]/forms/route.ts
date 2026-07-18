import { NextResponse } from "next/server";
import {
  requireSiteForWorkspace,
  requireWebsiteManagerApi,
  requireWebsiteMemberApi,
} from "@/lib/website/access";
import { websiteErrorResponse } from "@/lib/website/http";
import {
  createForm,
  getFormWithFields,
  listForms,
} from "@/lib/website/repository";

type RouteContext = {
  params: Promise<{ siteId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteMemberApi();
    const { siteId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const forms = listForms(siteId).map((form) => getFormWithFields(form.id)!);
    return NextResponse.json({ forms });
  } catch (error) {
    return websiteErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireWebsiteManagerApi();
    const { siteId } = await context.params;
    await requireSiteForWorkspace(siteId, workspace.id);
    const body = (await request.json()) as Record<string, unknown>;

    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "Form name is required." },
        { status: 400 },
      );
    }

    const form = createForm({
      siteId,
      name: body.name,
      slug: typeof body.slug === "string" ? body.slug : undefined,
      description:
        typeof body.description === "string" ? body.description : null,
      successMessage:
        typeof body.successMessage === "string"
          ? body.successMessage
          : undefined,
      notifyEmail:
        typeof body.notifyEmail === "string" ? body.notifyEmail : null,
    });

    return NextResponse.json(
      { form: getFormWithFields(form.id) },
      { status: 201 },
    );
  } catch (error) {
    return websiteErrorResponse(error);
  }
}
