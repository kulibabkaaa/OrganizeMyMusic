import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createSupabaseLibrarySyncStore,
  getLatestLibrarySyncStatus,
  type AppleMusicConnectionSummary,
  type LibrarySyncSummary
} from "@/modules/library-syncs/queue";
import {
  createSupabaseNewMusicStore,
  getNewMusicSummary,
  type NewMusicSummary
} from "@/modules/library-syncs/new-music";

export interface LibraryPageState {
  appleMusicConnection: AppleMusicConnectionSummary | null;
  latestSync: LibrarySyncSummary | null;
  newMusicSummary: NewMusicSummary | null;
}

export async function getLibraryPageState(): Promise<LibraryPageState> {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return {
      appleMusicConnection: null,
      latestSync: null,
      newMusicSummary: null
    };
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return {
      appleMusicConnection: null,
      latestSync: null,
      newMusicSummary: null
    };
  }

  const store = createSupabaseLibrarySyncStore(supabase);
  const newMusicStore = createSupabaseNewMusicStore(supabase);

  try {
    const [appleMusicConnection, latestSyncStatus, newMusicSummary] = await Promise.all([
      store.getConnectedAppleMusicConnection(session.user.id),
      getLatestLibrarySyncStatus({
        store,
        userId: session.user.id
      }),
      getNewMusicSummary({
        store: newMusicStore,
        userId: session.user.id
      })
    ]);

    return {
      appleMusicConnection,
      latestSync: latestSyncStatus?.sync ?? null,
      newMusicSummary
    };
  } catch {
    return {
      appleMusicConnection: null,
      latestSync: null,
      newMusicSummary: null
    };
  }
}
