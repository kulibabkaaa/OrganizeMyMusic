import { signOut } from "@/app/(app)/dashboard/actions";
import { DashboardStateController } from "@/components/app/dashboard/dashboard-state-controller";
import { listDashboardActivity } from "@/modules/activity/list-activity";
import { deriveDashboardState } from "@/modules/dashboard/get-dashboard-state";
import {
  createSupabaseNewMusicStore,
  getNewMusicSummary,
  type NewMusicSummary
} from "@/modules/library-syncs/new-music";
import {
  createSupabaseLibrarySyncStore,
  getLatestLibrarySyncStatus,
  type AppleMusicConnectionSummary
} from "@/modules/library-syncs/queue";
import { createSupabasePlaylistStore } from "@/modules/playlists/store";
import {
  createSupabaseRecentSortRunStore,
  type RecentSortRunSummary
} from "@/modules/sorts/list-sort-runs";
import { ensureProfileForUser } from "@/lib/auth/profile";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import type { PersistentPlaylist } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function AppDashboardPage() {
  const session = await getAuthenticatedSession();
  const serviceSupabase =
    session.status === "authenticated" ? createSupabaseServiceRoleClient() : null;
  const syncStore = serviceSupabase ? createSupabaseLibrarySyncStore(serviceSupabase) : null;
  let appleMusicConnection: AppleMusicConnectionSummary | null = null;
  let latestLibrarySync: Awaited<ReturnType<typeof getLatestLibrarySyncStatus>> = null;
  let recentSorts: RecentSortRunSummary[] = [];
  let playlists: PersistentPlaylist[] = [];
  let reviewQueueCount = 0;
  let newMusicSummary: NewMusicSummary | null = null;

  if (session.status === "authenticated" && serviceSupabase) {
    await ensureProfileForUser(serviceSupabase, session.user);
  }

  if (session.status === "authenticated" && syncStore && serviceSupabase) {
    try {
      appleMusicConnection = await syncStore.getConnectedAppleMusicConnection(session.user.id);
      latestLibrarySync = await getLatestLibrarySyncStatus({
        store: syncStore,
        userId: session.user.id
      });
      [recentSorts, playlists, reviewQueueCount, newMusicSummary] = await Promise.all([
        createSupabaseRecentSortRunStore(serviceSupabase).listRecentSortRuns({
          userId: session.user.id,
          limit: 4
        }),
        createSupabasePlaylistStore(serviceSupabase).listPlaylists({
          userId: session.user.id
        }),
        getReviewQueueCount(serviceSupabase, session.user.id),
        getNewMusicSummary({
          store: createSupabaseNewMusicStore(serviceSupabase),
          userId: session.user.id
        })
      ]);
    } catch {
      // Keep the dashboard usable when one backend panel is temporarily unavailable.
    }
  }

  const activities = listDashboardActivity({
    latestSync: latestLibrarySync?.sync ?? null,
    recentSorts
  });
  const activeProcessingJobCount = recentSorts.filter((sort) =>
    ["preview_generating", "paid", "processing", "exporting"].includes(sort.uiStatus)
  ).length;
  const state = deriveDashboardState({
    authStatus: session.status,
    hasAppleMusicConnection: Boolean(appleMusicConnection),
    latestLibrarySyncStatus: latestLibrarySync?.sync.status ?? null,
    recentSortCount: recentSorts.length,
    activeProcessingJobCount
  });

  return (
    <DashboardStateController
      state={state}
      userEmail={session.status === "authenticated" ? session.user.email : null}
      appleMusicConnection={appleMusicConnection}
      latestLibrarySync={latestLibrarySync?.sync ?? null}
      latestLibrarySyncEvents={latestLibrarySync?.events ?? []}
      recentSorts={recentSorts}
      activities={activities}
      playlists={playlists}
      reviewQueueCount={reviewQueueCount}
      newMusicSummary={newMusicSummary}
      canUseServerData={Boolean(serviceSupabase)}
      signOutAction={signOut}
    />
  );
}

async function getReviewQueueCount(
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>,
  userId: string
) {
  const { count, error } = await supabase
    .from("playlist_generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "ready_for_review");

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}
