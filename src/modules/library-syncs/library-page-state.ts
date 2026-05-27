import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createSupabaseLibrarySyncStore,
  getLatestLibrarySyncStatus,
  type AppleMusicConnectionSummary,
  type LibrarySyncSummary
} from "@/modules/library-syncs/queue";

export interface LibraryPageState {
  appleMusicConnection: AppleMusicConnectionSummary | null;
  latestSync: LibrarySyncSummary | null;
}

export async function getLibraryPageState(): Promise<LibraryPageState> {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return {
      appleMusicConnection: null,
      latestSync: null
    };
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return {
      appleMusicConnection: null,
      latestSync: null
    };
  }

  const store = createSupabaseLibrarySyncStore(supabase);

  try {
    const [appleMusicConnection, latestSyncStatus] = await Promise.all([
      store.getConnectedAppleMusicConnection(session.user.id),
      getLatestLibrarySyncStatus({
        store,
        userId: session.user.id
      })
    ]);

    return {
      appleMusicConnection,
      latestSync: latestSyncStatus?.sync ?? null
    };
  } catch {
    return {
      appleMusicConnection: null,
      latestSync: null
    };
  }
}
