import { PipelineOverview } from "@/components/app/pipeline-overview";
import { AppShell } from "@/components/app/app-shell";
import { AppleMusicConnectCard } from "@/components/app/apple-music-connect-card";
import { LatestSortRunCard } from "@/components/app/latest-sort-run-card";
import { LibrarySyncCard } from "@/components/app/library-sync-card";
import { PlaylistRequestCard } from "@/components/app/playlist-request-card";
import { signOut } from "@/app/(app)/dashboard/actions";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { ensureProfileForUser } from "@/lib/auth/profile";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createSupabaseLibrarySyncStore,
  getLatestLibrarySyncStatus,
  type AppleMusicConnectionSummary
} from "@/modules/library-syncs/queue";
import {
  createSupabaseLatestSortRunStore,
  type LatestSortRunSummary
} from "@/modules/sorts/latest-run";

export const dynamic = "force-dynamic";

const stateCards = [
  {
    label: "Account",
    title: "Signed-out state",
    description:
      "Visitors see a clear sign-in requirement before any private music data is shown.",
    status: "Auth pending"
  },
  {
    label: "Session",
    title: "Signed-in placeholder",
    description:
      "After Supabase Auth is wired, this area will show the user profile and next action.",
    status: "Shell only"
  },
  {
    label: "Library",
    title: "Sync not started",
    description:
      "The sync panel will show raw track count, normalized count, duplicate count, and events.",
    status: "Waiting"
  },
  {
    label: "Sort run",
    title: "No preview yet",
    description:
      "Playlist request, planning, preview, and confirmation stay blocked until later tickets.",
    status: "Not ready"
  }
];

function SignedOutDashboard({ isConfigured }: { isConfigured: boolean }) {
  return (
    <AppShell
      title="Dashboard"
      subtitle="A safe product shell for sign-in, Apple Music connection, library sync, and playlist preview states."
    >
      <section className="mb-6 flex flex-wrap items-center gap-3">
        <StatusPill label="Signed out" tone="inverse" />
        <StatusPill label="Apple Music not connected" tone="warning" />
        <StatusPill label="Sync not started" tone="inverse" />
        <StatusPill label="No sort run" tone="inverse" />
      </section>

      <section className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.08] p-7">
        <p className="text-sm uppercase tracking-[0.18em] text-white/42">Account required</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h2 className="font-display text-3xl tracking-[-0.04em]">
              Sign in to continue the Apple Music flow.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/62">
              Private library data stays hidden until Supabase Auth verifies the user session.
            </p>
            {!isConfigured ? (
              <p className="mt-3 text-sm leading-6 text-amber-100">
                Supabase URL and anon key are not configured in this environment yet.
              </p>
            ) : null}
          </div>
          <a href="/login">
            <Button className="min-w-40">Sign in</Button>
          </a>
        </div>
      </section>

      <PipelineOverview />

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <AppleMusicConnectCard canConnect={false} />

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-7">
          <p className="text-sm uppercase tracking-[0.18em] text-white/42">Current run</p>
          <h2 className="mt-3 font-display text-3xl tracking-[-0.04em]">
            Preview will appear after sync and planning.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62">
            This placeholder keeps write-back impossible. Later tickets will replace it with real
            sync progress, playlist requests, and a stable preview snapshot.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-black/24 p-4">
              <p className="text-2xl font-semibold">0</p>
              <p className="mt-1 text-sm text-white/54">raw tracks synced</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/24 p-4">
              <p className="text-2xl font-semibold">0</p>
              <p className="mt-1 text-sm text-white/54">playlist previews</p>
            </div>
          </div>
        </section>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stateCards.map((card) => (
          <article key={card.title} className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.18em] text-white/40">{card.label}</p>
              <StatusPill label={card.status} tone="inverse" />
            </div>
            <h3 className="mt-4 font-display text-2xl tracking-[-0.04em]">{card.title}</h3>
            <p className="mt-2 text-sm leading-6 text-white/58">{card.description}</p>
          </article>
        ))}
      </section>
    </AppShell>
  );
}

export default async function DashboardPage() {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return <SignedOutDashboard isConfigured={session.status !== "missing_config"} />;
  }

  const serviceSupabase = createSupabaseServiceRoleClient();
  const profileResult = await ensureProfileForUser(serviceSupabase, session.user);
  const syncStore = serviceSupabase ? createSupabaseLibrarySyncStore(serviceSupabase) : null;
  let appleMusicConnection: AppleMusicConnectionSummary | null = null;
  let latestLibrarySync: Awaited<ReturnType<typeof getLatestLibrarySyncStatus>> = null;
  let latestSortRun: LatestSortRunSummary | null = null;
  let libraryStateError: string | null = null;
  let sortRunStateError: string | null = null;

  if (syncStore) {
    try {
      appleMusicConnection = await syncStore.getConnectedAppleMusicConnection(session.user.id);
      latestLibrarySync = await getLatestLibrarySyncStatus({
        store: syncStore,
        userId: session.user.id
      });
    } catch (error) {
      libraryStateError = error instanceof Error ? error.message : "Unable to load library state.";
    }
  }

  if (serviceSupabase) {
    try {
      latestSortRun = await createSupabaseLatestSortRunStore(serviceSupabase).getLatestSortRunSummary({
        userId: session.user.id
      });
    } catch (error) {
      sortRunStateError = error instanceof Error ? error.message : "Unable to load latest sort run.";
    }
  }

  const profileStatus =
    profileResult.status === "ready"
      ? "Profile ready"
      : profileResult.status === "schema_missing"
        ? "Profile schema pending"
        : profileResult.status === "service_role_missing"
          ? "Service role missing"
          : "Profile error";

  return (
    <AppShell
      title="Dashboard"
      subtitle="Supabase Auth is active. Continue through Apple Music connection, sync, planning, preview, and confirmation."
    >
      <section className="mb-6 flex flex-wrap items-center gap-3">
        <StatusPill label="Signed in" tone="success" />
        <StatusPill label={profileStatus} tone={profileResult.status === "ready" ? "success" : "warning"} />
        <StatusPill
          label={appleMusicConnection ? "Apple Music connected" : "Apple Music not connected"}
          tone={appleMusicConnection ? "success" : "warning"}
        />
        <StatusPill label={latestLibrarySync?.sync.status ?? "Sync not started"} tone="inverse" />
      </section>

      <section className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.08] p-7">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-white/42">Account</p>
            <h2 className="mt-3 font-display text-3xl tracking-[-0.04em]">
              {session.user.email ?? "Signed-in user"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/62">
              Dashboard access is protected by Supabase Auth. The profile row is created
              automatically once the `profiles` table is available.
            </p>
            {profileResult.status === "schema_missing" ? (
              <p className="mt-3 text-sm leading-6 text-amber-100">
                Hosted database schema has not been applied yet. `MVP-005` will add schema and RLS.
              </p>
            ) : null}
            {profileResult.status === "service_role_missing" ? (
              <p className="mt-3 text-sm leading-6 text-amber-100">
                `SUPABASE_SERVICE_ROLE_KEY` is required on the server before profile rows can be
                created.
              </p>
            ) : null}
          </div>
          <form action={signOut}>
            <Button variant="secondary" className="min-w-32 border-white/15 bg-white/10 text-white">
              Sign out
            </Button>
          </form>
        </div>
      </section>

      <PipelineOverview />

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <AppleMusicConnectCard
          initiallyConnected={Boolean(appleMusicConnection)}
          initialStorefront={appleMusicConnection?.storefront ?? null}
        />

        <LibrarySyncCard
          canStart={Boolean(appleMusicConnection && serviceSupabase && !libraryStateError)}
          latestSync={latestLibrarySync?.sync ?? null}
          events={latestLibrarySync?.events ?? []}
          disabledReason={
            libraryStateError ??
            (!serviceSupabase
              ? "Server database access is not configured."
              : !appleMusicConnection
                ? "Connect Apple Music before starting sync."
                : undefined)
          }
        />
      </section>

      <section className="mt-6">
        <PlaylistRequestCard
          canRequest={Boolean(
            serviceSupabase &&
              latestLibrarySync?.sync.id &&
              latestLibrarySync.sync.status === "completed"
          )}
          librarySyncId={latestLibrarySync?.sync.id}
          disabledReason={
            !serviceSupabase
              ? "Server database access is not configured."
              : latestLibrarySync?.sync.status !== "completed"
                ? "Complete a library sync before requesting playlists."
                : undefined
          }
        />
      </section>

      <section className="mt-6">
        <LatestSortRunCard latestSortRun={latestSortRun} error={sortRunStateError} />
      </section>
    </AppShell>
  );
}
