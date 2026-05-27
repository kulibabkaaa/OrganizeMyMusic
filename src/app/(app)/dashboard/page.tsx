import { signOut } from "@/app/(app)/dashboard/actions";
import { DashboardStateController } from "@/components/app/dashboard/dashboard-state-controller";
import { ensureProfileForUser } from "@/lib/auth/profile";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { listDashboardActivity } from "@/modules/activity/list-activity";
import { deriveDashboardState } from "@/modules/dashboard/get-dashboard-state";
import {
  createSupabaseLibrarySyncStore,
  getLatestLibrarySyncStatus,
  type AppleMusicConnectionSummary,
  type LibrarySyncSummary
} from "@/modules/library-syncs/queue";
import {
  createSupabaseRecentSortRunStore,
  type RecentSortRunSummary
} from "@/modules/sorts/list-sort-runs";

export const dynamic = "force-dynamic";

const activeLibrarySyncStatuses = new Set<LibrarySyncSummary["status"]>([
  "queued",
  "syncing",
  "normalizing"
]);

export default async function DashboardPage() {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return (
      <DashboardStateController
        state="signed_out"
        appleMusicConnection={null}
        latestLibrarySync={null}
        latestLibrarySyncEvents={[]}
        recentSorts={[]}
        activities={[]}
        canUseServerData={false}
        signOutAction={signOut}
      />
    );
  }

  const serviceSupabase = createSupabaseServiceRoleClient();
  await ensureProfileForUser(serviceSupabase, session.user);

  const syncStore = serviceSupabase ? createSupabaseLibrarySyncStore(serviceSupabase) : null;
  let appleMusicConnection: AppleMusicConnectionSummary | null = null;
  let latestLibrarySyncStatus: Awaited<ReturnType<typeof getLatestLibrarySyncStatus>> = null;
  let recentSorts: RecentSortRunSummary[] = [];

  if (syncStore) {
    try {
      appleMusicConnection = await syncStore.getConnectedAppleMusicConnection(session.user.id);
      latestLibrarySyncStatus = await getLatestLibrarySyncStatus({
        store: syncStore,
        userId: session.user.id
      });
    } catch {
      appleMusicConnection = null;
      latestLibrarySyncStatus = null;
    }
  }

  if (serviceSupabase) {
    try {
      recentSorts = await createSupabaseRecentSortRunStore(serviceSupabase).listRecentSortRuns({
        userId: session.user.id
      });
    } catch {
      recentSorts = [];
    }
  }

  const latestLibrarySync = latestLibrarySyncStatus?.sync ?? null;
  const activeProcessingJobCount =
    latestLibrarySync && activeLibrarySyncStatuses.has(latestLibrarySync.status) ? 1 : 0;
  const state = deriveDashboardState({
    authStatus: session.status,
    hasAppleMusicConnection: Boolean(appleMusicConnection),
    latestLibrarySyncStatus: latestLibrarySync?.status ?? null,
    recentSortCount: recentSorts.length,
    activeProcessingJobCount
  });
  const activities = listDashboardActivity({
    latestSync: latestLibrarySync,
    recentSorts
  });

  return (
    <DashboardStateController
      state={state}
      userEmail={session.user.email}
      appleMusicConnection={appleMusicConnection}
      latestLibrarySync={latestLibrarySync}
      latestLibrarySyncEvents={latestLibrarySyncStatus?.events ?? []}
      recentSorts={recentSorts}
      activities={activities}
      canUseServerData={Boolean(serviceSupabase)}
      signOutAction={signOut}
    />
  );
}
