import { describe, expect, it, vi } from "vitest";

import {
  FULL_SORT_JOB_NAME,
  createSupabaseFullSortStore,
  handleFullSortJob,
  queueFullSortAfterPayment
} from "@/modules/sorts/full-sort-job";
import type { FullSortStore } from "@/modules/sorts/full-sort-job";
import type { PlaylistRecipe, TrackClassification } from "@/types/domain";

const recipe: PlaylistRecipe = {
  id: "recipe_1",
  userId: "user_1",
  sortRunId: "sort_1",
  position: 0,
  name: "Ukrainian rap",
  playlistNote: null,
  targetTrackMin: null,
  targetTrackMax: null,
  duplicatePolicy: "avoid_duplicates",
  allowExplicit: true,
  includeLibraryOnly: true,
  tags: [
    { id: "tag_1", category: "language", value: "ukrainian" },
    { id: "tag_2", category: "genre", value: "rap" }
  ],
  createdAt: "2026-05-26T10:00:00.000Z",
  updatedAt: "2026-05-26T10:00:00.000Z"
};

const classification: TrackClassification = {
  fingerprint: "fp_1",
  language: "ukrainian",
  genre: "Hip-Hop/Rap",
  subgenres: ["rap"],
  moods: ["Hype"],
  energy: 0.8,
  confidence: 1,
  source: "heuristic",
  version: 1,
  metadataHash: "hash_1"
};

function createStore(overrides: Partial<FullSortStore> = {}): FullSortStore {
  return {
    getPaidSortRunForFullSort: vi.fn().mockResolvedValue({
      id: "sort_1",
      userId: "user_1",
      librarySyncId: "sync_1",
      state: "paid",
      paymentStatus: "paid",
      generatedPlaylistCount: 0
    }),
    listRecipesForSort: vi.fn().mockResolvedValue([recipe]),
    listTracksForFullSort: vi.fn().mockResolvedValue([
      {
        id: "track_1",
        appleSongId: "apple_1",
        name: "Track One",
        artistName: "Artist One",
        normalizedName: "track one",
        normalizedArtist: "artist one",
        fingerprint: "fp_1",
        genreNames: ["Hip-Hop/Rap"]
      }
    ]),
    listClassificationsForFullSort: vi.fn().mockResolvedValue([
      {
        ...classification,
        normalizedTrackId: "track_1"
      }
    ]),
    saveFullSortResult: vi.fn().mockResolvedValue(undefined),
    createJobEvent: vi.fn().mockResolvedValue(undefined),
    markSortRunFailed: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

describe("full sort job", () => {
  it("queues full organization only after payment is confirmed", async () => {
    const store = createStore();
    const queue = {
      createQueue: vi.fn().mockResolvedValue(undefined),
      send: vi.fn().mockResolvedValue("job_1")
    };

    await expect(
      queueFullSortAfterPayment({
        store,
        queue,
        sortRunId: "sort_1",
        userId: "user_1"
      })
    ).resolves.toEqual({
      status: "queued",
      sortRunId: "sort_1",
      jobId: "job_1"
    });

    expect(queue.createQueue).toHaveBeenCalledWith(FULL_SORT_JOB_NAME);
    expect(queue.send).toHaveBeenCalledWith(
      FULL_SORT_JOB_NAME,
      { sortRunId: "sort_1", userId: "user_1" },
      expect.objectContaining({
        singletonKey: "sort_1"
      })
    );
    expect(store.createJobEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        sortRunId: "sort_1",
        stage: "full_sort",
        level: "info"
      })
    );
  });

  it("does not queue when the Sort is not paid", async () => {
    const store = createStore({
      getPaidSortRunForFullSort: vi.fn().mockResolvedValue(null)
    });
    const queue = {
      createQueue: vi.fn().mockResolvedValue(undefined),
      send: vi.fn().mockResolvedValue("job_1")
    };

    await expect(
      queueFullSortAfterPayment({
        store,
        queue,
        sortRunId: "sort_1",
        userId: "user_1"
      })
    ).resolves.toEqual({
      status: "not_ready",
      message: "Organization is not ready to start."
    });

    expect(queue.send).not.toHaveBeenCalled();
  });

  it("generates full editable playlists without Apple Music write-back", async () => {
    const store = createStore();

    await expect(
      handleFullSortJob({
        store,
        data: { sortRunId: "sort_1", userId: "user_1" },
        now: () => "2026-05-26T12:00:00.000Z"
      })
    ).resolves.toEqual({
      status: "completed",
      sortRunId: "sort_1",
      playlistCount: 1,
      trackCount: 1
    });

    expect(store.saveFullSortResult).toHaveBeenCalledWith({
      sortRun: expect.objectContaining({ id: "sort_1", paymentStatus: "paid" }),
      snapshot: expect.objectContaining({
        sortRunId: "sort_1",
        librarySyncId: "sync_1",
        generatedAt: "2026-05-26T12:00:00.000Z",
        playlists: [
          expect.objectContaining({
            title: "Ukrainian rap",
            confidenceLabel: "medium",
            tracks: [
              expect.objectContaining({
                normalizedTrackId: "track_1",
                reason: expect.stringContaining("Language matches ukrainian")
              })
            ]
          })
        ]
      })
    });
    expect(store.createJobEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "preparing_review",
        message: "Full organization generated 1 playlists with 1 tracks."
      })
    );
  });

  it("links Sort-created recipes to persistent playlists for later playlist editing", async () => {
    const tableCalls: Array<{ table: string; operation: string; payload?: unknown }> = [];
    const playlistRows = [{ id: "playlist_1" }];
    const sortPlaylistRows = [{ id: "sort_playlist_1" }];
    const generationRows = [{ id: "generation_1" }];
    const recipeUpdateFilters: Array<[string, string]> = [];

    const createQuery = (table: string) => {
      const query = {
        delete: vi.fn(() => {
          tableCalls.push({ table, operation: "delete" });
          return {
            eq: vi.fn(async () => ({ error: null }))
          };
        }),
        insert: vi.fn((payload: unknown) => {
          tableCalls.push({ table, operation: "insert", payload });

          if (table === "sort_playlist_tracks" || table === "playlist_generation_tracks") {
            return Promise.resolve({ error: null });
          }

          return {
            select: vi.fn(async () => ({
              data:
                table === "playlists"
                  ? playlistRows
                  : table === "sort_playlists"
                    ? sortPlaylistRows
                    : generationRows,
              error: null
            }))
          };
        }),
        update: vi.fn((payload: unknown) => {
          tableCalls.push({ table, operation: "update", payload });
          const updateQuery = {
            eq: vi.fn((column: string, value: string) => {
              recipeUpdateFilters.push([column, value]);
              return updateQuery;
            }),
            then: (resolve: (value: { error: null }) => void) => resolve({ error: null })
          };

          return updateQuery;
        })
      };

      return query;
    };
    const supabase = {
      from: vi.fn((table: string) => createQuery(table))
    };
    const store = createSupabaseFullSortStore(supabase as never);

    await expect(
      store.saveFullSortResult({
        sortRun: {
          id: "sort_1",
          userId: "user_1",
          librarySyncId: "sync_1",
          state: "paid",
          paymentStatus: "paid",
          generatedPlaylistCount: 0
        },
        snapshot: {
          sortRunId: "sort_1",
          librarySyncId: "sync_1",
          generatedAt: "2026-05-26T12:00:00.000Z",
          playlists: [
            {
              id: recipe.id,
              dimension: "request",
              title: "Ukrainian rap",
              description: "Keep it hard and energetic.",
              confidenceLabel: "medium",
              trackCount: 1,
              trackFingerprints: ["fp_1"],
              appleSongIds: ["apple_1"],
              tracks: [
                {
                  fingerprint: "fp_1",
                  normalizedTrackId: "track_1",
                  appleSongId: "apple_1",
                  position: 0,
                  score: 0.9,
                  reason: "Language matches ukrainian"
                }
              ]
            }
          ]
        }
      })
    ).resolves.toBeUndefined();

    expect(tableCalls).toContainEqual({
      table: "playlists",
      operation: "insert",
      payload: [
        expect.objectContaining({
          user_id: "user_1",
          name: "Ukrainian rap",
          created_from_sort_run_id: "sort_1",
          latest_library_sync_id: "sync_1",
          last_generated_at: "2026-05-26T12:00:00.000Z"
        })
      ]
    });
    expect(tableCalls).toContainEqual({
      table: "playlist_generations",
      operation: "insert",
      payload: [
        expect.objectContaining({
          user_id: "user_1",
          playlist_id: "playlist_1",
          recipe_id: recipe.id,
          sort_run_id: "sort_1",
          status: "ready_for_review"
        })
      ]
    });
    expect(tableCalls).toContainEqual({
      table: "playlist_recipes",
      operation: "update",
      payload: {
        playlist_id: "playlist_1"
      }
    });
    expect(recipeUpdateFilters).toEqual([
      ["id", recipe.id],
      ["sort_run_id", "sort_1"]
    ]);
  });

  it("records failed full-organization jobs without raw track names or tokens", async () => {
    const store = createStore({
      listRecipesForSort: vi.fn().mockRejectedValue(
        new Error("raw-music-user-token failed while sorting Track One by Artist One.")
      )
    });

    await expect(
      handleFullSortJob({
        store,
        data: { sortRunId: "sort_1", userId: "user_1" }
      })
    ).rejects.toThrow("Full organization failed. Failure category: authentication.");

    expect(store.markSortRunFailed).toHaveBeenCalledWith({
      sortRunId: "sort_1",
      userId: "user_1",
      errorSummary: "Full organization failed. Failure category: authentication."
    });
    expect(store.createJobEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        sortRunId: "sort_1",
        stage: "full_sort",
        level: "error",
        message: "Full organization failed.",
        details: expect.objectContaining({
          eventType: "full_sort_failed",
          failureCategory: "authentication",
          durationMs: expect.any(Number)
        })
      })
    );

    const persistedObservability = JSON.stringify({
      markFailed: vi.mocked(store.markSortRunFailed).mock.calls,
      events: vi.mocked(store.createJobEvent).mock.calls
    });

    expect(persistedObservability).not.toContain("raw-music-user-token");
    expect(persistedObservability).not.toContain("Track One");
    expect(persistedObservability).not.toContain("Artist One");
  });
});
