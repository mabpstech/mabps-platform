import { CatalogBrowser } from "@/components/marketplace/catalog-browser";
import { requireMarketplaceWorkspace } from "@/lib/marketplace/access";
import { listCatalog } from "@/lib/marketplace/repository";

export default async function MarketplaceCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { workspace } = await requireMarketplaceWorkspace("/marketplace/catalog");
  const params = await searchParams;
  const listings = listCatalog(workspace.id, {
    kind: params.kind,
  });
  return (
    <CatalogBrowser listings={listings} initialKind={params.kind} />
  );
}
