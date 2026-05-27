import { describe, expect, it, vi } from "vitest";

import { LIBRARY_SYNC_JOB_NAME, type LibrarySyncQueue, type LibrarySyncStore } from "@/modules/library-syncs/queue";
import {
  retryLibrarySync,
  retrySortRunWriteBack,
  type SortRunRetryStore
} from "@/modules/recovery/retry";
import {
  PLAYLIST_CREATION_JOB_NAME,
  type PlaylistExportQueue
} from "@/modules/sorts/export-selection";
import type { LibrarySyncSummary } from "@/modules/library-syncs/queue";
import type { SortRunState } from "@/types/domain";

function syncSummary(overrides: Partial<LibrarySyncSummary> = {}): LibrarySyncSummary {
  return {
    id: "sync_failed",
    userId: "user_1",
    status: "failed",
    rawTrackCount: 10,
    normalizedTrackCount: 9,
    duplicateCount: 1,
    errorSummary: "Apple Music request failed.",
    createdAt: "2026-05-22T20:00:00.000Z",
    updatedAt: "2026-05-22T20:01:00.000Z",
    ...overrides
  };
}

function createLibrarySyncStore(sync: LibrarySyncSummary | null = syncSummary()) {
  const store = {
    getConnectedAppleMusicConnection: vi.fn(async () => ({
      id: "connection_1",
      status: "connected" as const,
      storefront: "us"
    })),
    createQueuedSync: vi.fn(async (userId: string) =>
      syncSummary({
        id: "sync_retry",
        userId,
        status: "queued",
        rawTrackCount: 0,
        normalizedTrackCount: 0,
        duplicateCount: 0,
        errorSummary: null
      })
    ),
    createJobEvent: vi.fn(async () => undefined),
    getSyncForUser: vi.fn(async () => sync)
  };

  return store as unknown as LibrarySyncStore & typeof store;
}

function createLibrarySyncQueue() {
  return {
    createQueue: vi.fn(async () => undefined),
    send: vi.fn(async () => "library_job_1")
  } satisfies LibrarySyncQueue;
}

function createSortRunStore(state: SortRunState = "failed") {
  return {
    getSortRunForRetry: vi.fn(async () => ({
      id: "sort_1",
      userId: "user_1",
      state
    })),
    markCreatingPlaylists: vi.fn(async () => undefined),
    createJobEvent: vi.fn(async () => undefined)
  } satisfies SortRunRetryStore;
}

function createPlaylistCreationQueue() {
  return {
    createQueue: vi.fn(async () => undefined),
    send: vi.fn(async () => "playlist_job_1")
  } satisfies PlaylistExportQueue;
}

describe("retryLibrarySync", () => {
  it("queues a new library sync and records the retry on the failed sync", async () => {
    const store = createLibrarySyncStore();
    const queue = createLibrarySyncQueue();

    await expect(
      retryLibrarySync({
        store,
        queue,
        syncId: "sync_failed",
        userId: "user_1"
      })
    ).resolves.toEqual({
      status: "retried",
      previousSyncId: "sync_failed",
      syncId: "sync_retry",
      jobId: "library_job_1"
    });

    expect(queue.send).toHaveBeenCalledWith(
      LIBRARY_SYNC_JOB_NAME,
      {
        syncId: "sync_retry",
        userId: "user_1"
      },
      {
        retryLimit: 3,
        retryDelay: 30,
        retryBackoff: true,
        singletonKey: "sync_retry"
      }
    );
    expect(store.createJobEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        librarySyncId: "sync_failed",
        stage: "library_sync",
        level: "info",
        details: expect.objectContaining({
          retrySyncId: "sync_retry",
          retryJobName: LIBRARY_SYNC_JOB_NAME
        })
      })
    );
  });

  it("does not queue when the selected sync has not failed", async () => {
    const store = createLibrarySyncStore(syncSummary({ status: "completed" }));
    const queue = createLibrarySyncQueue();

    await expect(
      retryLibrarySync({
        store,
        queue,
        syncId: "sync_completed",
        userId: "user_1"
      })
    ).resolves.toMatchObject({
      status: "not_failed"
    });

    expect(queue.send).not.toHaveBeenCalled();
    expect(store.createQueuedSync).not.toHaveBeenCalled();
  });
});

describe("retrySortRunWriteBack", () => {
  it("marks a failed sort run as creating and requeues playlist creation", async () => {
    const store = createSortRunStore();
    const queue = createPlaylistCreationQueue();

    await expect(
      retrySortRunWriteBack({
        store,
        queue,
        sortRunId: "sort_1",
        userId: "user_1"
      })
    ).resolves.toEqual({
      status: "retried",
      sortRunId: "sort_1",
      state: "creating_playlists",
      jobId: "playlist_job_1"
    });

    expect(store.markCreatingPlaylists).toHaveBeenCalledWith({
      sortRunId: "sort_1",
      userId: "user_1"
    });
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
        details: expect.objectContaining({
          retryJobName: PLAYLIST_CREATION_JOB_NAME
        })
      })
    );
  });

  it("does not requeue sort runs that are not failed", async () => {
    const store = createSortRunStore("preview_ready");
    const queue = createPlaylistCreationQueue();

    await expect(
      retrySortRunWriteBack({
        store,
        queue,
        sortRunId: "sort_1",
        userId: "user_1"
      })
    ).resolves.toMatchObject({
      status: "not_failed"
    });

    expect(store.markCreatingPlaylists).not.toHaveBeenCalled();
    expect(queue.send).not.toHaveBeenCalled();
  });
});
