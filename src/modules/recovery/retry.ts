import {
  LIBRARY_SYNC_JOB_NAME,
  queueLibrarySync,
  type LibrarySyncQueue,
  type LibrarySyncStore
} from "@/modules/library-syncs/queue";
import {
  PLAYLIST_CREATION_JOB_NAME,
  type PlaylistCreationJobData,
  type PlaylistExportQueue
} from "@/modules/sorts/export-selection";
import type { SortRunState } from "@/types/domain";

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

export interface SortRunRetrySummary {
  id: string;
  userId: string;
  state: SortRunState;
}

export interface SortRunRetryStore {
  getSortRunForRetry(input: {
    sortRunId: string;
    userId: string;
  }): Promise<SortRunRetrySummary | null>;
  markCreatingPlaylists(input: {
    sortRunId: string;
    userId: string;
  }): Promise<void>;
  createJobEvent(input: {
    sortRunId: string;
    stage: string;
    level: "info" | "warn" | "error";
    message: string;
    details?: Record<string, unknown>;
  }): Promise<void>;
}

export type RetrySortRunResult =
  | {
      status: "retried";
      sortRunId: string;
      state: Extract<SortRunState, "creating_playlists">;
      jobId: string | null;
    }
  | {
      status: "not_found" | "not_failed";
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

export async function retrySortRunWriteBack(input: {
  store: SortRunRetryStore;
  queue: PlaylistExportQueue;
  sortRunId: string;
  userId: string;
}): Promise<RetrySortRunResult> {
  const sortRun = await input.store.getSortRunForRetry({
    sortRunId: input.sortRunId,
    userId: input.userId
  });

  if (!sortRun) {
    return {
      status: "not_found",
      message: "Sort run not found."
    };
  }

  if (sortRun.state !== "failed") {
    return {
      status: "not_failed",
      message: "Only failed sort runs can be retried."
    };
  }

  await input.store.markCreatingPlaylists({
    sortRunId: sortRun.id,
    userId: sortRun.userId
  });

  await input.queue.createQueue?.(PLAYLIST_CREATION_JOB_NAME);

  const jobId = await input.queue.send(
    PLAYLIST_CREATION_JOB_NAME,
    {
      sortRunId: sortRun.id,
      userId: sortRun.userId
    } satisfies PlaylistCreationJobData,
    {
      retryLimit: 3,
      retryDelay: 30,
      retryBackoff: true,
      singletonKey: sortRun.id
    }
  );

  await input.store.createJobEvent({
    sortRunId: sortRun.id,
    stage: "playlist_creation",
    level: "info",
    message: "Retry requested. Playlist write-back queued again.",
    details: {
      retryJobId: jobId,
      retryJobName: PLAYLIST_CREATION_JOB_NAME
    }
  });

  return {
    status: "retried",
    sortRunId: sortRun.id,
    state: "creating_playlists",
    jobId
  };
}
