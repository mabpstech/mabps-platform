import Link from "next/link";
import { notFound } from "next/navigation";
import {
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWebsiteWorkspace } from "@/lib/website/access";
import { getSiteBundle } from "@/lib/website/repository";

type PageProps = {
  params: Promise<{ siteId: string }>;
};

export default async function SiteOverviewPage({ params }: PageProps) {
  const { workspace, role } = await requireWebsiteWorkspace("/sites");
  const { siteId } = await params;
  const bundle = getSiteBundle(siteId);
  if (!bundle || bundle.site.workspaceId !== workspace.id) {
    notFound();
  }

  const { site, pages, navigation } = bundle;
  const canManage = isWorkspaceManager(role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">{site.name}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          /{site.slug} · {site.status}
          {site.customDomain ? ` · ${site.customDomain}` : ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Pages</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {pages.length}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Nav items
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {navigation.length}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Publish
          </p>
          <p className="mt-2 text-2xl font-semibold capitalize text-zinc-900">
            {site.status}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/sites/${site.id}/pages`}
          className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5`}
        >
          Page builder
        </Link>
        <Link
          href={`/p/${site.slug}`}
          target="_blank"
          className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5`}
        >
          Open preview
        </Link>
        {canManage ? (
          <Link
            href={`/sites/${site.id}/publish`}
            className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5`}
          >
            Publish & domain
          </Link>
        ) : null}
      </div>
    </div>
  );
}
