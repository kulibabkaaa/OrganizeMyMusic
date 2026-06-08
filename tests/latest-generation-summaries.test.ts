import { describe, expect, it, vi } from "vitest";

import {
  countLatestReviewQueue,
  listLatestPlaylistGenerationSummaries
} from "@/modules/playlists/latest-generation-summaries";
import type { PersistentPlaylist } from "@/types/domain";

const basePlaylist: PersistentPlaylist = {
  id: "playlist_1",
  userId: "user_1",
  sourceProvider: "apple_music",
  name: "Ukrainian Rap",
  description: null,
  status: "active",
  applePlaylistId: null,
  createdFromSortRunId: null,
  latestLibrarySyncId: null,
  lastProcessedNewMusicSyncId: null,
  lastGeneratedAt: null,
  lastExportedAt: null,
  createdAt: "2026-06-08T10:00:00.000Z",
  updatedAt: "2026-06-08T10:00:00.000Z",
  archivedAt: null
};

describe("latest playlist generation summaries", () => {
  it("summarizes only latest generations and counts review queues from that state", async () => {
    const store = {
      listGenerationHistory: vi.fn(async ({ playlistId }: { playlistId: string }) =>
        playlistId === "playlist_1"
          ? [
              {
                generation: {
                  id: "generation_1",
                  userId: "user_1",
                  playlistId,
                  recipeId: null,
                  sortRunId: null,
                  librarySyncId: "sync_1",
                  status: "ready_for_review" as const,
                  recipeSnapshot: {},
                  errorSummary: null,
                  generatedAt: "2026-06-08T10:00:00.000Z",
                  createdAt: "2026-06-08T10:00:00.000Z",
                  updatedAt: "2026-06-08T10:00:00.000Z"
                },
                trackCount: 7
              }
            ]
          : [
              {
                generation: {
                  id: "generation_2",
                  userId: "user_1",
                  playlistId,
                  recipeId: null,
                  sortRunId: null,
                  librarySyncId: "sync_1",
                  status: "exported" as const,
                  recipeSnapshot: {},
                  errorSummary: null,
                  generatedAt: "2026-06-08T11:00:00.000Z",
                  createdAt: "2026-06-08T11:00:00.000Z",
                  updatedAt: "2026-06-08T11:00:00.000Z"
                },
                trackCount: 12
              }
            ]
      )
    };

    const summaries = await listLatestPlaylistGenerationSummaries({
      store,
      userId: "user_1",
      playlists: [
        basePlaylist,
        {
          ...basePlaylist,
          id: "playlist_2",
          name: "Already Exported"
        }
      ]
    });

    expect(summaries).toMatchObject({
      playlist_1: {
        status: "ready_for_review",
        trackCount: 7
      },
      playlist_2: {
        status: "exported",
        trackCount: 12
      }
    });
    expect(countLatestReviewQueue(summaries)).toBe(1);
    expect(store.listGenerationHistory).toHaveBeenCalledWith({
      userId: "user_1",
      playlistId: "playlist_1",
      limit: 1
    });
  });
});
