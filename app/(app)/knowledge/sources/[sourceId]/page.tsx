import { notFound } from "next/navigation";
import { SourceDetail } from "@/components/knowledge/source-detail";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireKnowledgeWorkspace } from "@/lib/knowledge/access";
import {
  getSourceForWorkspace,
  listChunksForSource,
  listSourceVersions,
} from "@/lib/knowledge/repository";

type PageProps = {
  params: Promise<{ sourceId: string }>;
};

export default async function KnowledgeSourceDetailPage({ params }: PageProps) {
  const { sourceId } = await params;
  const { workspace, role } = await requireKnowledgeWorkspace(
    `/knowledge/sources/${sourceId}`,
  );
  const source = getSourceForWorkspace(sourceId, workspace.id);
  if (!source) notFound();

  return (
    <SourceDetail
      source={source}
      versions={listSourceVersions(source.id)}
      chunks={listChunksForSource(source.id)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
