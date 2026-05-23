import { describe, expect, it, vi } from "vitest";

import {
  confirmSortRun,
  PLAYLIST_CREATION_JOB_NAME,
  type PlaylistCreationQueue,
  type SortRunConfirmationStore
} from "@/modules/sorts/confirmation";
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
    generatedAt: "2026-05-22T20:00:00.000Z",
    playlists: [
      {
        id: "playlist_1",
        dimension: "request",
        title: "Ukrainian Rap",
        description: "Ukrainian rap tracks.",
        confidenceLabel: "high",
        trackCount: 2,
        trackFingerprints: ["fp_1", "fp_2"],
        appleSongIds: ["apple_1", "apple_2"],
        tracks: [
          {
            fingerprint: "fp_1",
            normalizedTrackId: "track_1",
            appleSongId: "apple_1",
            name: "Kyiv Bars",
            artistName: "Artist A",
            albumName: "Album A",
            position: 1,
            score: 0.95,
            reason: "Matched language and genre."
          },
          {
            fingerprint: "fp_2",
            normalizedTrackId: "track_2",
            appleSongId: "apple_2",
            name: "Dnipro Flow",
            artistName: "Artist B",
            albumName: "Album B",
            position: 2,
            score: 0.86,
            reason: "Matched genre."
          }
        ]
      },
      {
        id: "playlist_2",
        dimension: "request",
        title: "Gym Rap",
        description: "Workout rap tracks.",
        confidenceLabel: "medium",
        trackCount: 1,
        trackFingerprints: ["fp_3"],
        appleSongIds: ["apple_3"],
        tracks: [
          {
            fingerprint: "fp_3",
            normalizedTrackId: "track_3",
            appleSongId: "apple_3",
            name: "Lift",
            artistName: "Artist C",
            albumName: "Album C",
            position: 1,
            score: 0.79,
            reason: "Matched energy and mood."
          }
        ]
      }
    ]
  }
};

function createStore(sortRun: PreviewSortRun | null = previewSortRun) {
  return {
    getSortRunForConfirmation: vi.fn(async () => sortRun),
    saveConfirmation: vi.fn(async () => undefined),
    createJobEvent: vi.fn(async () => undefined)
  } satisfies SortRunConfirmationStore;
}

function createQueue() {
  return {
    createQueue: vi.fn(async () => undefined),
    send: vi.fn(async () => "job_1")
  } satisfies PlaylistCreationQueue;
}

describe("confirmSortRun", () => {
  it("persists selected playlists, queues write-back, and returns exact counts", async () => {
    const store = createStore();
    const queue = createQueue();

    await expect(
      confirmSortRun({
        store,
        queue,
        sortRunId: "sort_1",
        userId: "user_1",
        selection: {
          selectedPlaylistIds: ["playlist_1", "playlist_2"],
          removedTrackFingerprintsByPlaylistId: {
            playlist_1: ["fp_1"]
          }
        }
      })
    ).resolves.toEqual({
      status: "confirmed",
      sortRunId: "sort_1",
      state: "creating_playlists",
      selectedPlaylistCount: 2,
      selectedTrackCount: 2,
      jobId: "job_1"
    });

    expect(store.saveConfirmation).toHaveBeenCalledWith({
      sortRun: previewSortRun,
      selectedPlaylists: [
        {
          generatedPlaylistId: "playlist_1",
          removedTrackFingerprints: ["fp_1"],
          includedNormalizedTrackIds: ["track_2"]
        },
        {
          generatedPlaylistId: "playlist_2",
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
        stage: "playlist_creation",
        level: "info",
        details: {
          jobId: "job_1",
          selectedPlaylistCount: 2,
          selectedTrackCount: 2
        }
      })
    );
  });

  it("rejects unknown playlist selections before queueing", async () => {
    const store = createStore();
    const queue = createQueue();

    await expect(
      confirmSortRun({
        store,
        queue,
        sortRunId: "sort_1",
        userId: "user_1",
        selection: {
          selectedPlaylistIds: ["playlist_outside_preview"],
          removedTrackFingerprintsByPlaylistId: {}
        }
      })
    ).resolves.toMatchObject({
      status: "invalid_selection"
    });
    expect(store.saveConfirmation).not.toHaveBeenCalled();
    expect(queue.send).not.toHaveBeenCalled();
  });

  it("requires at least one selected track before queueing", async () => {
    const store = createStore();
    const queue = createQueue();

    await expect(
      confirmSortRun({
        store,
        queue,
        sortRunId: "sort_1",
        userId: "user_1",
        selection: {
          selectedPlaylistIds: ["playlist_1"],
          removedTrackFingerprintsByPlaylistId: {
            playlist_1: ["fp_1", "fp_2"]
          }
        }
      })
    ).resolves.toMatchObject({
      status: "empty_selection"
    });
    expect(store.saveConfirmation).not.toHaveBeenCalled();
    expect(queue.send).not.toHaveBeenCalled();
  });
});
