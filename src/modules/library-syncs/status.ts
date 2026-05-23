import type { LibrarySyncStatus } from "@/modules/library-syncs/queue";

export type LibrarySyncVisibleStatus = LibrarySyncStatus | "not_started";

export interface LibrarySyncDisplayState {
  status: LibrarySyncVisibleStatus;
  label: string;
  description: string;
  progressPercent: number;
  tone: "inverse" | "success" | "warning";
  isActive: boolean;
  isTerminal: boolean;
}

const ACTIVE_STATUSES = new Set<LibrarySyncVisibleStatus>([
  "queued",
  "syncing",
  "normalizing"
]);

export function isActiveLibrarySyncStatus(status: LibrarySyncVisibleStatus) {
  return ACTIVE_STATUSES.has(status);
}

export function getLibrarySyncDisplayState(
  status: LibrarySyncVisibleStatus,
  errorSummary?: string | null
): LibrarySyncDisplayState {
  switch (status) {
    case "queued":
      return {
        status,
        label: "queued",
        description: "Waiting for the worker to start the Apple Music library sync.",
        progressPercent: 12,
        tone: "inverse",
        isActive: true,
        isTerminal: false
      };
    case "syncing":
      return {
        status,
        label: "syncing",
        description: "Fetching Apple Music library songs and storing raw track JSON.",
        progressPercent: 48,
        tone: "inverse",
        isActive: true,
        isTerminal: false
      };
    case "normalizing":
      return {
        status,
        label: "normalizing",
        description: "Normalizing tracks, linking ownership, and counting duplicates.",
        progressPercent: 78,
        tone: "inverse",
        isActive: true,
        isTerminal: false
      };
    case "completed":
      return {
        status,
        label: "complete",
        description: "Sync complete. Raw tracks, normalized tracks, and duplicate counts are stored.",
        progressPercent: 100,
        tone: "success",
        isActive: false,
        isTerminal: true
      };
    case "failed":
      return {
        status,
        label: "failed",
        description: errorSummary
          ? `Sync failed: ${errorSummary}`
          : "Sync failed. Review the latest job events before trying again.",
        progressPercent: 100,
        tone: "warning",
        isActive: false,
        isTerminal: true
      };
    case "not_started":
      return {
        status,
        label: "not started",
        description: "Start a background sync after Apple Music is connected.",
        progressPercent: 0,
        tone: "inverse",
        isActive: false,
        isTerminal: false
      };
  }
}
