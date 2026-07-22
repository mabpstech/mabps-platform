import { redirect } from "next/navigation";
import { MarketingHomePage } from "@/components/marketing/home-page";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { getSession } from "@/lib/auth/session";
import { ensureActiveWorkspace } from "@/lib/auth/workspace";
import { createPageMetadata } from "@/lib/marketing/seo";
import { BRAND } from "@/lib/marketing/brand";

export const metadata = createPageMetadata({
  title: BRAND.name,
  description: BRAND.description,
  path: "/",
});

export default async function HomePage() {
  const session = await getSession();

  if (session) {
    const workspace = await ensureActiveWorkspace(session);
    redirect(workspace ? "/dashboard" : "/onboarding");
  }

  return (
    <MarketingShell>
      <MarketingHomePage />
    </MarketingShell>
  );
}
