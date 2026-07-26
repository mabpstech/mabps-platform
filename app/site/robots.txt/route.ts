import { headers } from "next/headers";
import {
  buildPublicRobotsTxt,
  publicSeoBundle,
  publicSiteOrigin,
  resolvePublicSiteForSeo,
} from "@/lib/website/seo-public";

export async function GET() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "";
  const site = resolvePublicSiteForSeo({ host });
  if (!site) {
    return new Response("Not found", { status: 404 });
  }

  const bundle = publicSeoBundle(site.id);
  if (!bundle) {
    return new Response("Not found", { status: 404 });
  }

  const proto = requestHeaders.get("x-forwarded-proto") || "https";
  const requestOrigin = host ? `${proto}://${host.split(":")[0]}` : null;
  const origin = publicSiteOrigin({
    site,
    requestOrigin,
    canonicalBaseUrl: bundle.seo.canonicalBaseUrl,
  });

  const body = buildPublicRobotsTxt({
    site,
    origin,
    basePath: "",
    robots: bundle.seo.robots,
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
