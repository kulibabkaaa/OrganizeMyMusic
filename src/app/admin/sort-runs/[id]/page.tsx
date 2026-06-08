import { notFound } from "next/navigation";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { StatusPill } from "@/components/ui/status-pill";
import { ensureProfileForUser } from "@/lib/auth/profile";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { formatRelativeStatus } from "@/lib/utils";
import { getAdminSortRun } from "@/modules/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminSortRunPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    redirect("/auth");
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return (
      <AppShell title="Run inspection" subtitle="Real Sort run diagnostics for support and smoke tests.">
        <UnavailablePanel message="Service-role Supabase configuration is required before admin run inspection can load." />
      </AppShell>
    );
  }

  const profileResult = await ensureProfileForUser(supabase, session.user);

  if (profileResult.status !== "ready") {
    return (
      <AppShell title="Run inspection" subtitle="Real Sort run diagnostics for support and smoke tests.">
        <UnavailablePanel message="Admin profile could not be loaded." />
      </AppShell>
    );
  }

  if (!profileResult.profile.isAdmin) {
    notFound();
  }

  const { run, events } = await getAdminSortRun(supabase, id);

  if (!run) {
    notFound();
  }

  return (
    <AppShell title="Run inspection" subtitle="Internal debug visibility for early user support.">
      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
          <p className="text-sm uppercase tracking-[0.18em] text-platform-muted">Lifecycle</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <StatusPill label={run.state.replaceAll("_", " ")} tone="accent" />
            <StatusPill label={run.paymentStatus} tone="neutral" />
          </div>
          <div className="mt-8 space-y-5 text-sm text-platform-secondary">
            <div>
              <p className="text-white">Owner</p>
              <p>{run.userEmail ?? run.userId}</p>
            </div>
            <div>
              <p className="text-white">Playlists in preview</p>
              <p>{run.playlistCount}</p>
            </div>
            <div>
              <p className="text-white">Last updated</p>
              <p>{formatRelativeStatus(run.updatedAt)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
          <p className="text-sm uppercase tracking-[0.18em] text-platform-muted">Structured events</p>
          <div className="mt-6 space-y-4">
            {events.map((event) => (
              <div key={event.id} className="border-t border-white/10 pt-4 first:border-t-0 first:pt-0">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium text-white">{event.stage}</p>
                  <span className="text-xs uppercase tracking-[0.18em] text-platform-muted">
                    {formatRelativeStatus(event.createdAt)}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-platform-secondary">{event.message}</p>
              </div>
            ))}
            {events.length === 0 ? (
              <p className="text-sm leading-7 text-platform-secondary">
                No job events recorded for this Sort run yet.
              </p>
            ) : null}
          </div>
        </div>
      </section>
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
