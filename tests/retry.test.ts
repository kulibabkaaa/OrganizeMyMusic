import { describe, expect, it, vi } from "vitest";

import {
  LIBRARY_SYNC_JOB_NAME,
  type LibrarySyncQueue,
  type LibrarySyncStore,
  type LibrarySyncSummary
} from "@/modules/library-syncs/queue";
import { retryLibrarySync } from "@/modules/recovery/retry";

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
