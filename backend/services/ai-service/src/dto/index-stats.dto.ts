export interface IndexStatsDto {
  workspaceId: string;

  provider?: string;

  model?: string;
}

export interface CollectionStat {
  name: string;
  count: number;
}

export interface IndexStatsResponseDto {
  workspaceId: string;
  collections: CollectionStat[];
}
