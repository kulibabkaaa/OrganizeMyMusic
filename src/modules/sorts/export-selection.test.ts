import { describe, expect, it, vi } from "vitest";

import {
  createSupabaseSortRunExportStore,
  exportReviewedPlaylists,
  type PlaylistExportQueue,
  type SortRunExportStore
} from "@/modules/sorts/export-selection";
import { PLAYLIST_CREATION_JOB_NAME } from "@/modules/sorts/playlist-creation-queue";
import type { PreviewSortRun } from "@/modules/sorts/preview-snapshot";

const previewSortRun: PreviewSortRun = {
  id: "sort_1",
  userId: "user_1",
  librarySyncId: "sync_1",
  state: "preview_ready",
  paymentStatus: "pending",
  requests: [],
  previewSnapshot: {
    sortRunId: "sort_1",
    librarySyncId: "sync_1",
    generatedAt: "2026-05-26T20:00:00.000Z",
    playlists: [
      {
        id: "playlist_1",
        dimension: "request",
        title: "Sad late-night songs",
        description: "Sad tracks.",
        confidenceLabel: "high",
        trackCount: 2,
        trackFingerprints: ["fp_1", "fp_2"],
        appleSongIds: ["apple_1", "apple_2"],
        tracks: [
          {
            fingerprint: "fp_1",
            normalizedTrackId: "track_1",
            appleSongId: "apple_1",
            position: 1,
            score: 0.91,
            reason: "mood Sad"
          },
          {
            fingerprint: "fp_2",
            normalizedTrackId: "track_2",
            appleSongId: "apple_2",
            position: 2,
            score: 0.87,
            reason: "mood Sad"
          }
        ]
      },
      {
        id: "playlist_2",
        dimension: "request",
        title: "Indie commute",
        description: "Indie tracks.",
        confidenceLabel: "medium",
        trackCount: 1,
        trackFingerprints: ["fp_3"],
        appleSongIds: ["apple_3"],
        tracks: [
          {
            fingerprint: "fp_3",
            normalizedTrackId: "track_3",
            appleSongId: "apple_3",
            position: 1,
            score: 0.77,
            reason: "genre Indie/Alternative"
          }
        ]
      }
    ]
  }
};

function createStore(sortRun: PreviewSortRun | null = previewSortRun) {
  return {
    getSortRunForExport: vi.fn(async () => sortRun),
    saveExportSelection: vi.fn(async () => undefined),
    createJobEvent: vi.fn(async () => undefined)
  } satisfies SortRunExportStore;
}

function createQueue() {
  return {
    createQueue: vi.fn(async () => undefined),
    send: vi.fn(async () => "job_1")
  } satisfies PlaylistExportQueue;
}

describe("exportReviewedPlaylists", () => {
  it("persists reviewed selection and queues Apple Music export", async () => {
    const store = createStore();
    const queue = createQueue();

    await expect(
      exportReviewedPlaylists({
        store,
        queue,
        sortRunId: "sort_1",
        userId: "user_1",
        selection: {
          selectedPlaylistIds: ["playlist_1", "playlist_2"],
          removedTrackFingerprintsByPlaylistId: {
            playlist_1: ["fp_1"]
          },
          renamedPlaylistTitlesById: {
            playlist_1: "Late night edits"
          }
        }
      })
    ).resolves.toEqual({
      status: "exporting",
      sortRunId: "sort_1",
      state: "creating_playlists",
      selectedPlaylistCount: 2,
      selectedTrackCount: 2,
      jobId: "job_1"
    });

    expect(store.saveExportSelection).toHaveBeenCalledWith({
      sortRun: previewSortRun,
      selectedPlaylists: [
        {
          generatedPlaylistId: "playlist_1",
          title: "Late night edits",
          removedTrackFingerprints: ["fp_1"],
          includedNormalizedTrackIds: ["track_2"]
        },
        {
          generatedPlaylistId: "playlist_2",
          title: "Indie commute",
          removedTrackFingerprints: [],
          includedNormalizedTrackIds: ["track_3"]
        }
      ]
    });
    expect(queue.createQueue).toHaveBeenCalledWith(PLAYLIST_CREATION_JOB_NAME);
    expect(queue.send).toHaveBeenCalledWith(
      PLAYLIST_CREATION_JOB_NAME,
      {
        sortRunId: "sort_1",
        userId: "user_1"
      },
      {
        retryLimit: 3,
        retryDelay: 30,
        retryBackoff: true,
        singletonKey: "sort_1"
      }
    );
    expect(store.createJobEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        sortRunId: "sort_1",
        stage: "playlist_export",
        level: "info",
        details: {
          jobId: "job_1",
          selectedPlaylistCount: 2,
          selectedTrackCount: 2
        }
      })
    );
  });

  it("exports paid full-organization runs that have stored review snapshots", async () => {
    const paidSortRun = {
      ...previewSortRun,
      state: "paid" as const,
      paymentStatus: "paid" as const
    };
    const store = createStore(paidSortRun);
    const queue = createQueue();

    await expect(
      exportReviewedPlaylists({
        store,
        queue,
        sortRunId: "sort_1",
        userId: "user_1",
        selection: {
          selectedPlaylistIds: ["playlist_1"],
          removedTrackFingerprintsByPlaylistId: {},
          renamedPlaylistTitlesById: {}
        }
      })
    ).resolves.toMatchObject({
      status: "exporting",
      sortRunId: "sort_1",
      state: "creating_playlists",
      selectedPlaylistCount: 1,
      selectedTrackCount: 2
    });

    expect(store.saveExportSelection).toHaveBeenCalledWith(
      expect.objectContaining({
        sortRun: paidSortRun
      })
    );
    expect(queue.send).toHaveBeenCalledWith(
      PLAYLIST_CREATION_JOB_NAME,
      { sortRunId: "sort_1", userId: "user_1" },
      expect.objectContaining({
        singletonKey: "sort_1"
      })
    );
  });

  it("does not export before generated playlists are ready for review", async () => {
    const store = createStore({
      ...previewSortRun,
      state: "draft",
      previewSnapshot: null
    });
    const queue = createQueue();

    await expect(
      exportReviewedPlaylists({
        store,
        queue,
        sortRunId: "sort_1",
        userId: "user_1",
        selection: {
          selectedPlaylistIds: ["playlist_1"],
          removedTrackFingerprintsByPlaylistId: {},
          renamedPlaylistTitlesById: {}
        }
      })
    ).resolves.toMatchObject({
      status: "invalid_state"
    });

    expect(store.saveExportSelection).not.toHaveBeenCalled();
    expect(queue.send).not.toHaveBeenCalled();
  });

  it("keeps export retries idempotent once write-back has started", async () => {
    const store = createStore({
      ...previewSortRun,
      state: "creating_playlists"
    });
    const queue = createQueue();

    await expect(
      exportReviewedPlaylists({
        store,
        queue,
        sortRunId: "sort_1",
        userId: "user_1",
        selection: {
          selectedPlaylistIds: ["playlist_1"],
          removedTrackFingerprintsByPlaylistId: {},
          renamedPlaylistTitlesById: {}
        }
      })
    ).resolves.toEqual({
      status: "already_exporting",
      sortRunId: "sort_1",
      state: "creating_playlists"
    });

    expect(store.saveExportSelection).not.toHaveBeenCalled();
    expect(queue.send).not.toHaveBeenCalled();
  });

  it("mirrors reviewed Sort track removals into persistent playlist generations", async () => {
    const operations: Array<{
      table: string;
      operation: string;
      payload?: unknown;
      filters: Array<[string, unknown, unknown?]>;
    }> = [];
    const createQuery = (table: string) => {
      let operation = "";
      let payload: unknown;
      const filters: Array<[string, unknown, unknown?]> = [];
      const query = {
        select: vi.fn((columns: string) => {
          if (!operation) {
            operation = "select";
          }
          payload = columns;
          return query;
        }),
        update: vi.fn((values: unknown) => {
          operation = "update";
          payload = values;
          return query;
        }),
        insert: vi.fn(async (values: unknown) => {
          operations.push({
            table,
            operation: "insert",
            payload: values,
            filters: []
          });
          return { error: null };
        }),
        eq: vi.fn((column: string, value: unknown) => {
          filters.push([column, value]);
          return query;
        }),
        in: vi.fn((column: string, value: unknown) => {
          filters.push([column, value]);
          return query;
        }),
        not: vi.fn((column: string, operator: string, value: unknown) => {
          filters.push([column, operator, value]);
          return query;
        }),
        single: vi.fn(async () => {
          operations.push({ table, operation, payload, filters: [...filters] });
          return { data: { id: "sort_1" }, error: null };
        }),
        then: (
          resolve: (value: { data?: unknown; error: null }) => unknown,
          reject?: (reason: unknown) => unknown
        ) => {
          const result =
            operation === "select" && table === "sort_playlists"
              ? {
                  data: [
                    {
                      id: "sort_playlist_1",
                      playlist_id: "persistent_playlist_1",
                      playlist_rules: { generatedPlaylistId: "playlist_1" }
                    }
                  ],
                  error: null
                }
              : operation === "select" && table === "playlist_generations"
                ? { data: [{ id: "generation_1" }], error: null }
                : { error: null };

          operations.push({ table, operation, payload, filters: [...filters] });
          return Promise.resolve(result).then(resolve, reject);
        }
      };

      return query;
    };
    const supabase = {
      from: vi.fn((table: string) => createQuery(table))
    };
    const store = createSupabaseSortRunExportStore(
      supabase as never,
      vi.fn(async () => previewSortRun)
    );

    await expect(
      store.saveExportSelection({
        sortRun: previewSortRun,
        selectedPlaylists: [
          {
            generatedPlaylistId: "playlist_1",
            title: "Late night edits",
            removedTrackFingerprints: ["fp_1"],
            includedNormalizedTrackIds: ["track_2"]
          }
        ]
      })
    ).resolves.toBeUndefined();

    expect(operations).toContainEqual(
      expect.objectContaining({
        table: "playlist_generation_tracks",
        operation: "update",
        payload: { decision: "keep" },
        filters: [["generation_id", ["generation_1"]]]
      })
    );
    expect(operations).toContainEqual(
      expect.objectContaining({
        table: "playlist_generation_tracks",
        operation: "update",
        payload: { decision: "remove" },
        filters: [
          ["generation_id", ["generation_1"]],
          ["normalized_track_id", "in", "(track_2)"]
        ]
      })
    );
  });
});
