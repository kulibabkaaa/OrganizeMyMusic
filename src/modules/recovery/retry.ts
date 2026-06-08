import {
  LIBRARY_SYNC_JOB_NAME,
  queueLibrarySync,
  type LibrarySyncQueue,
  type LibrarySyncStore
} from "@/modules/library-syncs/queue";

export type RetryLibrarySyncResult =
  | {
      status: "retried";
      previousSyncId: string;
      syncId: string;
      jobId: string | null;
    }
  | {
      status: "not_found" | "not_failed" | "missing_apple_music_connection";
      message: string;
    };

export async function retryLibrarySync(input: {
  store: LibrarySyncStore;
  queue: LibrarySyncQueue;
  syncId: string;
  userId: string;
}): Promise<RetryLibrarySyncResult> {
  const sync = await input.store.getSyncForUser({
    syncId: input.syncId,
    userId: input.userId
  });

  if (!sync) {
    return {
      status: "not_found",
      message: "Library sync not found."
    };
  }

  if (sync.status !== "failed") {
    return {
      status: "not_failed",
      message: "Only failed library syncs can be retried."
    };
  }

  const retryResult = await queueLibrarySync({
    store: input.store,
    queue: input.queue,
    userId: input.userId
  });

  if (retryResult.status === "missing_apple_music_connection") {
    return {
      status: "missing_apple_music_connection",
      message: "Connect Apple Music before retrying a library sync."
    };
  }

  await input.store.createJobEvent({
    librarySyncId: sync.id,
    stage: "library_sync",
    level: "info",
    message: `Retry requested. New sync ${retryResult.sync.id} queued.`,
    details: {
      retrySyncId: retryResult.sync.id,
      retryJobId: retryResult.jobId,
      retryJobName: LIBRARY_SYNC_JOB_NAME
    }
  });

  return {
    status: "retried",
    previousSyncId: sync.id,
    syncId: retryResult.sync.id,
    jobId: retryResult.jobId
  };
}
