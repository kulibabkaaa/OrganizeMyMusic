import type { AuthSessionResult } from "@/lib/auth/session";
import type { LibrarySyncStatus } from "@/modules/library-syncs/queue";

export type DashboardState =
  | "signed_out"
  | "no_library_connected"
  | "library_syncing"
  | "library_ready_no_sorts"
  | "library_ready_with_sorts";

export interface DashboardStateInput {
  authStatus: AuthSessionResult["status"];
  hasAppleMusicConnection: boolean;
  latestLibrarySyncStatus: LibrarySyncStatus | null;
  recentSortCount: number;
  activeProcessingJobCount: number;
}

export function deriveDashboardState(input: DashboardStateInput): DashboardState {
  if (input.authStatus !== "authenticated") {
    return "signed_out";
  }

  if (!input.hasAppleMusicConnection) {
    return "no_library_connected";
  }

  if (input.activeProcessingJobCount > 0 || input.latestLibrarySyncStatus !== "completed") {
    return "library_syncing";
  }

  if (input.recentSortCount > 0) {
    return "library_ready_with_sorts";
  }

  return "library_ready_no_sorts";
}
