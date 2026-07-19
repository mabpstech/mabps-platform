import { notFound } from "next/navigation";
import { ListingDetail } from "@/components/marketplace/listing-detail";
import { requireMarketplaceWorkspace } from "@/lib/marketplace/access";
import {
  getInstallByWorkspaceListing,
  getListingById,
  listListingVersions,
} from "@/lib/marketplace/repository";

export default async function MarketplaceListingPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const { workspace } = await requireMarketplaceWorkspace("/marketplace/catalog");
  const { listingId } = await params;
  const listing = getListingById(listingId);
  if (!listing) notFound();
  if (
    listing.visibility === "workspace" &&
    listing.publisherWorkspaceId !== workspace.id
  ) {
    notFound();
  }

  return (
    <ListingDetail
      listing={listing}
      versions={listListingVersions(listing.id)}
      install={getInstallByWorkspaceListing(workspace.id, listing.id)}
    />
  );
}
