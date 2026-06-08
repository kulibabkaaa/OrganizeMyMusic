import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { StatusPill } from "@/components/ui/status-pill";
import { ensureProfileForUser } from "@/lib/auth/profile";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { listAdminSortRuns } from "@/modules/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminSortRunsPage() {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    redirect("/auth");
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return (
      <AppShell title="Admin runs" subtitle="Real Sort run diagnostics for support and smoke tests.">
        <UnavailablePanel message="Service-role Supabase configuration is required before admin run inspection can load." />
      </AppShell>
    );
  }

  const profileResult = await ensureProfileForUser(supabase, session.user);

  if (profileResult.status !== "ready") {
    return (
      <AppShell title="Admin runs" subtitle="Real Sort run diagnostics for support and smoke tests.">
        <UnavailablePanel message="Admin profile could not be loaded." />
      </AppShell>
    );
  }

  if (!profileResult.profile.isAdmin) {
    notFound();
  }

  const sortRuns = await listAdminSortRuns(supabase);

  return (
    <AppShell title="Admin runs" subtitle="Real Sort run diagnostics for support and smoke tests.">
      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06]">
        <div className="grid gap-4 border-b border-white/10 px-6 py-4 text-xs uppercase tracking-[0.18em] text-platform-muted md:grid-cols-[1.2fr_0.8fr_0.6fr_auto]">
          <span>Run</span>
          <span>State</span>
          <span>Payment</span>
          <span />
        </div>

        {sortRuns.map((sortRun) => (
          <div
            key={sortRun.id}
            className="grid gap-4 border-t border-white/10 px-6 py-5 text-sm first:border-t-0 md:grid-cols-[1.2fr_0.8fr_0.6fr_auto]"
          >
            <div>
              <p className="font-medium text-white">{sortRun.id}</p>
              <p className="mt-1 text-platform-secondary">
                {sortRun.playlistCount} {sortRun.playlistCount === 1 ? "playlist" : "playlists"} proposed
              </p>
              <p className="mt-1 text-xs text-platform-muted">
                {sortRun.userEmail ?? sortRun.userId}
              </p>
            </div>
            <div>
              <StatusPill label={sortRun.state.replaceAll("_", " ")} tone="accent" />
            </div>
            <div>
              <StatusPill label={sortRun.paymentStatus} tone="neutral" />
            </div>
            <div>
              <Link href={`/admin/sort-runs/${sortRun.id}`} className="font-medium text-platform-pink">
                Inspect
              </Link>
            </div>
          </div>
        ))}
        {sortRuns.length === 0 ? (
          <p className="px-6 py-8 text-sm leading-7 text-platform-secondary">
            No Sort runs exist yet.
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}

function UnavailablePanel({ message }: { message: string }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
      <StatusPill label="Unavailable" tone="warning" />
      <p className="mt-4 text-sm leading-7 text-platform-secondary">{message}</p>
    </div>
  );
}
