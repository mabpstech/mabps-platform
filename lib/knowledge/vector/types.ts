export type VectorRecord = {
  id: string;
  chunkId: string;
  sourceId: string;
  versionId: string;
  workspaceId: string;
  provider: string;
  model: string;
  dimensions: number;
  vector: number[];
  createdAt: string;
};

export type VectorSearchHit = {
  record: VectorRecord;
  score: number;
};

export type VectorUpsertInput = {
  id: string;
  chunkId: string;
  sourceId: string;
  versionId: string;
  workspaceId: string;
  provider: string;
  model: string;
  dimensions: number;
  vector: number[];
  createdAt: string;
};

export interface VectorStore {
  id: string;
  upsert(records: VectorUpsertInput[]): Promise<void>;
  deleteBySource(sourceId: string, workspaceId: string): Promise<void>;
  deleteByVersion(versionId: string, workspaceId: string): Promise<void>;
  search(input: {
    workspaceId: string;
    versionIds: string[];
    vector: number[];
    provider: string;
    model: string;
    limit: number;
  }): Promise<VectorSearchHit[]>;
}
