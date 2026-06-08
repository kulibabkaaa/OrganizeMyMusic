import type { PlaylistGenerationHistoryItem } from "@/modules/playlists/generation-store";
import type { PersistentPlaylist, PlaylistGenerationStatus } from "@/types/domain";

export interface PlaylistLatestGenerationStore {
  listGenerationHistory(input: {
    userId: string;
    playlistId: string;
    limit?: number;
  }): Promise<PlaylistGenerationHistoryItem[]>;
}

export interface PlaylistCardGenerationSummary {
  status: PlaylistGenerationStatus;
  trackCount: number | null;
  generatedAt: string | null;
}

export async function listLatestPlaylistGenerationSummaries(input: {
  store: PlaylistLatestGenerationStore;
  userId: string;
  playlists: PersistentPlaylist[];
}) {
  const summaries = await Promise.all(
    input.playlists.map(async (playlist) => {
      const [latest] = await input.store.listGenerationHistory({
        userId: input.userId,
        playlistId: playlist.id,
        limit: 1
      });

      return [
        playlist.id,
        latest
          ? {
              status: latest.generation.status,
              trackCount: latest.trackCount,
              generatedAt: latest.generation.generatedAt
            }
          : undefined
      ] as const;
    })
  );

  return Object.fromEntries(summaries) as Record<
    string,
    PlaylistCardGenerationSummary | undefined
  >;
}

export function countLatestReviewQueue(
  summariesByPlaylistId: Record<string, PlaylistCardGenerationSummary | undefined>
) {
  return Object.values(summariesByPlaylistId).filter(
    (summary) => summary?.status === "ready_for_review"
  ).length;
}
