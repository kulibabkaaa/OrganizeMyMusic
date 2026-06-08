import Link from "next/link";

import { AppShell } from "@/components/app/app-shell";
import { DashboardEmpty } from "@/components/app/dashboard/dashboard-empty";
import { DashboardReadyEmpty } from "@/components/app/dashboard/dashboard-ready-empty";
import { DashboardReturning } from "@/components/app/dashboard/dashboard-returning";
import { DashboardSyncing } from "@/components/app/dashboard/dashboard-syncing";
import { StartLibrarySyncButton } from "@/components/app/start-library-sync-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type { DashboardActivityItem } from "@/modules/activity/list-activity";
import type { DashboardState } from "@/modules/dashboard/get-dashboard-state";
import type {
  AppleMusicConnectionSummary,
  LibrarySyncJobEvent,
  LibrarySyncSummary
} from "@/modules/library-syncs/queue";
import type { RecentSortRunSummary } from "@/modules/sorts/list-sort-runs";

interface DashboardStateControllerProps {
  state: DashboardState;
  userEmail?: string | null;
  appleMusicConnection: AppleMusicConnectionSummary | null;
  latestLibrarySync: LibrarySyncSummary | null;
  latestLibrarySyncEvents: LibrarySyncJobEvent[];
  recentSorts: RecentSortRunSummary[];
  activities: DashboardActivityItem[];
  canUseServerData: boolean;
  signOutAction: () => Promise<void>;
}

const shellCopy: Record<DashboardState, { title: string; subtitle: string }> = {
  signed_out: {
    title: "Your music workspace",
    subtitle: "Sign in to connect Apple Music and start organizing your library."
  },
  no_library_connected: {
    title: "Your music workspace",
    subtitle: "Connect Apple Music so Organize Your Music can read your library and prepare it for sorting."
  },
  library_syncing: {
    title: "Your music workspace",
    subtitle: "Syncing your library so you can organize it into playlists."
  },
  library_ready_no_sorts: {
    title: "Library ready",
    subtitle: "Organize your Apple Music library into saved playlists and recipes."
  },
  library_ready_with_sorts: {
    title: "Your music workspace",
    subtitle: "Manage playlists, recipes, organization work, and Apple Music exports."
  }
};

export function DashboardStateController({
  state,
  userEmail,
  appleMusicConnection,
  latestLibrarySync,
  recentSorts,
  activities,
  canUseServerData,
  signOutAction
}: DashboardStateControllerProps) {
  const copy = shellCopy[state];

  return (
    <AppShell title={copy.title} subtitle={copy.subtitle}>
      {state === "signed_out" ? (
        <SignedOutState />
      ) : (
        <>
          <DashboardTopBar
            email={userEmail}
            isConnected={Boolean(appleMusicConnection)}
            syncStatus={latestLibrarySync?.status ?? null}
            signOutAction={signOutAction}
          />
          {state === "no_library_connected" ? (
            <DashboardEmpty />
          ) : null}
          {state === "library_syncing" ? (
            <LibrarySyncingState
              latestLibrarySync={latestLibrarySync}
              canUseServerData={canUseServerData}
            />
          ) : null}
          {state === "library_ready_no_sorts" ? (
            <DashboardReadyEmpty latestSync={latestLibrarySync} />
          ) : null}
          {state === "library_ready_with_sorts" ? (
            <DashboardReturning
              latestSync={latestLibrarySync}
              recentSorts={recentSorts}
              activities={activities}
            />
          ) : null}
        </>
      )}
    </AppShell>
  );
}

function SignedOutState() {
  return (
    <Card elevated className="grid gap-5 p-7 lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <StatusPill label="Signed out" tone="inverse" />
        <h2 className="mt-4 font-display text-3xl font-semibold tracking-[0em]">
          Sign in to continue.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-platform-secondary">
          Your library, previews, and export choices stay private to your account.
        </p>
      </div>
      <Link href="/auth" className="inline-flex">
        <Button className="min-w-36">Sign in</Button>
      </Link>
    </Card>
  );
}

function DashboardTopBar({
  email,
  isConnected,
  syncStatus,
  signOutAction
}: {
  email?: string | null;
  isConnected: boolean;
  syncStatus: LibrarySyncSummary["status"] | null;
  signOutAction: () => Promise<void>;
}) {
  return (
    <section className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-platform-border bg-platform-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill label="Signed in" tone="success" />
        <StatusPill
          label={isConnected ? "Apple Music connected" : "Apple Music needed"}
          tone={isConnected ? "success" : "warning"}
        />
        <StatusPill label={formatSyncStatus(syncStatus)} tone={syncStatus === "completed" ? "success" : "inverse"} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {email ? <span className="text-sm text-platform-secondary">{email}</span> : null}
        <form action={signOutAction}>
          <Button type="submit" variant="glass" className="min-w-28">
            Sign out
          </Button>
        </form>
      </div>
    </section>
  );
}

function LibrarySyncingState({
  latestLibrarySync,
  canUseServerData
}: {
  latestLibrarySync: LibrarySyncSummary | null;
  canUseServerData: boolean;
}) {
  return (
    <div className="space-y-6">
      <DashboardSyncing
        latestSync={latestLibrarySync}
        syncFallbackAction={
          canUseServerData ? <StartLibrarySyncButton latestSync={latestLibrarySync} /> : null
        }
      />
      {!canUseServerData ? (
        <Card className="p-7">
          <StatusPill label="Not available" tone="warning" />
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-[0em]">
            Library sync is unavailable.
          </h2>
          <p className="mt-3 text-sm leading-7 text-platform-secondary">
            Sign in again later to continue library setup.
          </p>
        </Card>
      ) : null}
    </div>
  );
}

function formatSyncStatus(status: LibrarySyncSummary["status"] | null) {
  if (!status) {
    return "Sync not started";
  }

  return status.replaceAll("_", " ");
}
