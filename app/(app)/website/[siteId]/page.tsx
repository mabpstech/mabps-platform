import Link from "next/link";
import { notFound } from "next/navigation";
import {
  authButtonClassName,
  authSecondaryButtonClassName,
} from "@/lib/auth/styles";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { StatusBadge } from "@/components/website/ui/empty-state";
import { formatRelativeTime } from "@/components/website/ui/labels";
import { requireWebsiteWorkspace } from "@/lib/website/access";
import { getSiteBundle } from "@/lib/website/repository";

type PageProps = {
  params: Promise<{ siteId: string }>;
};

export default async function SiteOverviewPage({ params }: PageProps) {
  const { workspace, role } = await requireWebsiteWorkspace("/website");
  const { siteId } = await params;
  const bundle = getSiteBundle(siteId);
  if (!bundle || bundle.site.workspaceId !== workspace.id) {
    notFound();
  }

  const { site, pages, navigation, theme } = bundle;
  const canManage = isWorkspaceManager(role);
  const isLive = site.status === "published";
  const homePage =
    pages.find((page) => page.slug === "home" || page.slug === "") ??
    pages[0] ??
    null;
  const editHref = homePage
    ? `/website/${site.id}/pages/${homePage.id}`
    : `/website/${site.id}/pages`;
  const publishedPages = pages.filter((page) => page.status === "published");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Overview
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              {site.name}
            </h1>
            <StatusBadge status={site.status} />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            {site.customDomain ? (
              <>
                Custom domain{" "}
                <span className="font-medium text-zinc-700">
                  {site.customDomain}
                </span>
                {site.domainVerified ? " · verified" : " · pending verification"}
              </>
            ) : (
              <>
                Public address{" "}
                <span className="font-medium text-zinc-700">
                  /p/{site.slug}
                </span>
              </>
            )}
            <span className="text-zinc-300"> · </span>
            Updated {formatRelativeTime(site.updatedAt)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={editHref}
            className={`${authButtonClassName} !w-auto px-5`}
          >
            {homePage ? "Continue editing" : "Open pages"}
          </Link>
          <Link
            href={`/p/${site.slug}`}
            target="_blank"
            rel="noreferrer"
            className={`${authSecondaryButtonClassName} !w-auto px-4`}
          >
            Preview site
          </Link>
          {canManage ? (
            <Link
              href={`/website/${site.id}/publish`}
              className={`${authSecondaryButtonClassName} !w-auto px-4`}
            >
              {isLive ? "Publish settings" : "Publish"}
            </Link>
          ) : null}
        </div>
      </div>

      {!isLive ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          This website is still a draft. Edit your pages, then publish when you
          are ready to go live.
        </div>
      ) : (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
          role="status"
        >
          <div className="min-w-0">
            <p className="font-medium">Your website is live</p>
            <p className="mt-0.5 truncate font-mono text-xs text-emerald-800">
              {site.customDomain && site.domainVerified
                ? `https://${site.customDomain}`
                : `/p/${site.slug}`}
            </p>
            <p className="mt-1 text-xs text-emerald-800/80">
              Edits to published pages go live when you save.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={
                site.customDomain && site.domainVerified
                  ? `https://${site.customDomain}`
                  : `/p/${site.slug}`
              }
              target="_blank"
              rel="noreferrer"
              className={`${authButtonClassName} !w-auto px-3 py-1.5 text-xs no-underline`}
            >
              Open live site
            </a>
            {canManage ? (
              <Link
                href={`/website/${site.id}/publish`}
                className={`${authSecondaryButtonClassName} !w-auto px-3 py-1.5 text-xs`}
              >
                Live settings
              </Link>
            ) : null}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <OverviewStat
          label="Pages"
          value={String(pages.length)}
          detail={
            publishedPages.length === pages.length && pages.length > 0
              ? "All pages ready"
              : `${publishedPages.length} published`
          }
          href={`/website/${site.id}/pages`}
        />
        <OverviewStat
          label="Menu items"
          value={String(navigation.length)}
          detail={
            navigation.length > 0
              ? "Shown in your site header"
              : "Add links in Menu"
          }
          href={`/website/${site.id}/navigation`}
        />
        <OverviewStat
          label="Status"
          value={isLive ? "Live" : "Draft"}
          detail={
            isLive
              ? site.publishedAt
                ? `Published ${formatRelativeTime(site.publishedAt)}`
                : "Visible to visitors"
              : "Not visible to visitors yet"
          }
          href={`/website/${site.id}/publish`}
        />
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-zinc-900">
              Next steps
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Keep momentum with the highest-impact edits first.
            </p>
          </div>
          <p className="text-xs text-zinc-400">
            Theme accent{" "}
            <span
              className="ml-1 inline-block h-2.5 w-2.5 rounded-full align-middle ring-1 ring-zinc-200"
              style={{ background: theme.primaryColor }}
              aria-hidden
            />
          </p>
        </div>

        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          <NextStep
            title="Edit pages"
            description="Update headlines, images, and calls to action."
            href={editHref}
          />
          <NextStep
            title="Theme Studio"
            description="Adjust colors, fonts, and brand feel."
            href={`/website/${site.id}/theme`}
          />
          <NextStep
            title="Header & menu"
            description="Set your logo, navigation, and top CTA."
            href={`/website/${site.id}/header`}
          />
          <NextStep
            title={isLive ? "Manage live site" : "Publish when ready"}
            description={
              isLive
                ? "Share your live URL, connect a domain, or unpublish."
                : "Make your site visible at its public address."
            }
            href={`/website/${site.id}/publish`}
          />
        </ul>
      </section>
    </div>
  );
}

function OverviewStat({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: string;
  detail: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:ring-offset-2"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
        {value}
      </p>
      <p className="mt-1 text-sm text-zinc-500 group-hover:text-zinc-700">
        {detail}
      </p>
    </Link>
  );
}

function NextStep({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 px-4 py-3.5 transition hover:border-zinc-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:ring-offset-2"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
            {description}
          </p>
        </div>
        <span
          className="mt-0.5 shrink-0 text-zinc-400"
          aria-hidden
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </Link>
    </li>
  );
}
