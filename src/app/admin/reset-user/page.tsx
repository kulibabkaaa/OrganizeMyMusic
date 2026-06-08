import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  executeUserResetAction,
  requestUserResetPreviewAction
} from "@/app/admin/reset-user/actions";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { ensureProfileForUser } from "@/lib/auth/profile";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { withPgBoss } from "@/lib/pg-boss";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createPgBossUserJobStore,
  createSupabaseUserResetStore,
  getUserDataResetTotalCount,
  previewUserDataReset,
  type UserDataResetCounts,
  type UserResetPreviewResult
} from "@/modules/admin/user-reset";

export const dynamic = "force-dynamic";

export default async function AdminUserResetPage({
  searchParams
}: {
  searchParams: Promise<{ email?: string; status?: string; jobs?: string }>;
}) {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    redirect("/auth");
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return (
      <AppShell
        title="Development reset"
        subtitle="Admin-only reset for one test account without manual SQL."
      >
        <UnavailablePanel message="Service-role Supabase configuration is required before reset can run." />
      </AppShell>
    );
  }

  const profileResult = await ensureProfileForUser(supabase, session.user);

  if (profileResult.status !== "ready") {
    return (
      <AppShell
        title="Development reset"
        subtitle="Admin-only reset for one test account without manual SQL."
      >
        <UnavailablePanel message="Admin profile could not be loaded." />
      </AppShell>
    );
  }

  if (!profileResult.profile.isAdmin) {
    notFound();
  }

  const params = await searchParams;
  const preview = params.email
    ? await loadResetPreview({
        requesterUserId: session.user.id,
        email: params.email,
        supabase
      })
    : null;

  return (
    <AppShell
      title="Development reset"
      subtitle="Admin-only reset for one test account. Deletes app data and the auth user; Apple Music is never touched."
    >
      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/admin/sort-runs" className="text-sm font-medium text-platform-secondary hover:text-white">
          Back to admin runs
        </Link>
      </div>

      <StatusBanner status={params.status} jobs={params.jobs} />

      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-platform-muted">Find user</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Reset by email</h2>
            </div>
            <StatusPill label="Admin only" tone="danger" />
          </div>
          <form action={requestUserResetPreviewAction} className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm text-platform-secondary">
              Test account email
              <input
                name="email"
                type="email"
                defaultValue={params.email ?? ""}
                placeholder="listener@example.com"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none transition focus:border-platform-pink"
                required
              />
            </label>
            <Button type="submit" variant="secondary" className="w-fit">
              Preview reset
            </Button>
          </form>
        </div>

        <ResetPreviewPanel preview={preview} />
      </section>
    </AppShell>
  );
}

async function loadResetPreview(input: {
  requesterUserId: string;
  email: string;
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>;
}) {
  const store = createSupabaseUserResetStore(input.supabase);

  return (
    (await withPgBoss((boss) =>
      previewUserDataReset({
        store,
        pgBossJobs: createPgBossUserJobStore(boss),
        requesterUserId: input.requesterUserId,
        email: input.email
      })
    )) ??
    (await previewUserDataReset({
      store,
      pgBossJobs: null,
      requesterUserId: input.requesterUserId,
      email: input.email
    }))
  );
}

function ResetPreviewPanel({ preview }: { preview: UserResetPreviewResult | null }) {
  if (!preview) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
        <p className="text-sm uppercase tracking-[0.18em] text-platform-muted">Preview</p>
        <p className="mt-4 text-sm leading-7 text-platform-secondary">
          Enter an email to preview the rows and pg-boss jobs that would be removed.
        </p>
      </div>
    );
  }

  if (preview.status === "invalid_email") {
    return <PreviewMessage tone="danger" title="Invalid email" body="Enter a valid account email." />;
  }

  if (preview.status === "forbidden") {
    return <PreviewMessage tone="danger" title="Not allowed" body="Only admin users can reset data." />;
  }

  if (preview.status === "target_not_found") {
    return (
      <PreviewMessage
        tone="warning"
        title="No matching profile"
        body={`No app profile was found for ${preview.email}.`}
      />
    );
  }

  const canReset = preview.status === "ready";

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-platform-muted">Preview</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{preview.target.email}</h2>
          <p className="mt-2 text-sm text-platform-secondary">
            {getUserDataResetTotalCount(preview.counts).toLocaleString("en-US")} rows/jobs would be
            removed from app storage and pg-boss.
          </p>
        </div>
        <StatusPill
          label={preview.status.replaceAll("_", " ")}
          tone={canReset ? "success" : "warning"}
        />
      </div>

      <CountGrid counts={preview.counts} />

      <div className="mt-6 rounded-2xl border border-[rgba(255,77,109,0.22)] bg-[rgba(255,77,109,0.08)] p-4">
        <p className="text-sm font-medium text-white">Typed confirmation required</p>
        <p className="mt-2 text-sm leading-6 text-platform-secondary">
          This deletes the Supabase auth user and cascaded app data only. It does not edit, delete,
          or rewrite anything in Apple Music.
        </p>
        <p className="mt-3 rounded-xl bg-black/30 px-3 py-2 font-mono text-sm text-white">
          {preview.confirmationText}
        </p>
      </div>

      <form action={executeUserResetAction} className="mt-5 grid gap-4">
        <input type="hidden" name="email" value={preview.target.email ?? ""} />
        <label className="grid gap-2 text-sm text-platform-secondary">
          Confirmation
          <input
            name="confirmation"
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none transition focus:border-platform-pink"
            placeholder={preview.confirmationText}
            disabled={!canReset}
            required
          />
        </label>
        {!canReset ? (
          <p className="text-sm leading-6 text-platform-warning">{getDisabledReason(preview.status)}</p>
        ) : null}
        <Button type="submit" variant={canReset ? "danger" : "disabled"} className="w-fit">
          Delete test account data
        </Button>
      </form>
    </div>
  );
}

function StatusBanner({ status, jobs }: { status?: string; jobs?: string }) {
  if (!status) {
    return null;
  }

  const banner = getStatusBanner(status, jobs);

  return (
    <div
      className={`mb-6 rounded-2xl border px-5 py-4 text-sm ${
        banner.tone === "success"
          ? "border-[rgba(57,217,138,0.28)] bg-[rgba(57,217,138,0.10)] text-platform-success"
          : "border-[rgba(255,176,32,0.28)] bg-[rgba(255,176,32,0.10)] text-platform-warning"
      }`}
    >
      {banner.message}
    </div>
  );
}

function CountGrid({ counts }: { counts: UserDataResetCounts }) {
  const items = [
    ["Profile", counts.profileCount],
    ["Apple Music connection", counts.appleMusicConnectionCount],
    ["Library syncs", counts.librarySyncCount],
    ["Raw library payloads", counts.rawLibraryTrackCount],
    ["Track ownership", counts.trackOwnershipCount],
    ["Sorts", counts.sortRunCount],
    ["Playlist requests", counts.playlistRequestCount],
    ["Playlist plans", counts.playlistRecipeCount],
    ["Generated playlists", counts.sortPlaylistCount],
    ["Playlist tracks", counts.sortPlaylistTrackCount],
    ["Payments", counts.paymentCount],
    ["Job events", counts.jobEventCount],
    ["pg-boss jobs", counts.pgBossJobCount]
  ] as const;

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-platform-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {value === null ? "Unavailable" : value.toLocaleString("en-US")}
          </p>
        </div>
      ))}
    </div>
  );
}

function PreviewMessage({
  tone,
  title,
  body
}: {
  tone: "warning" | "danger";
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
      <StatusPill label={tone} tone={tone} />
      <h2 className="mt-4 text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-platform-secondary">{body}</p>
    </div>
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

function getDisabledReason(status: UserResetPreviewResult["status"]) {
  switch (status) {
    case "pg_boss_unavailable":
      return "DATABASE_URL is required so pg-boss jobs can be removed before auth deletion.";
    case "self_reset_blocked":
      return "Resetting your own admin account is blocked.";
    default:
      return "Resolve the preview issue before reset can run.";
  }
}

function getStatusBanner(status: string, jobs?: string) {
  switch (status) {
    case "deleted":
      return {
        tone: "success" as const,
        message: `Test account reset completed. Removed ${jobs ?? "0"} pg-boss jobs before auth deletion.`
      };
    case "confirmation_required":
      return {
        tone: "warning" as const,
        message: "Reset did not run. Type the exact confirmation text before deleting data."
      };
    case "pg_boss_unavailable":
      return {
        tone: "warning" as const,
        message: "Reset did not run because pg-boss cleanup is unavailable."
      };
    case "self_reset_blocked":
      return {
        tone: "warning" as const,
        message: "Resetting your own admin account is blocked."
      };
    case "forbidden":
      return {
        tone: "warning" as const,
        message: "Only admin users can reset account data."
      };
    case "target_not_found":
      return {
        tone: "warning" as const,
        message: "No matching user profile was found."
      };
    case "service_role_missing":
      return {
        tone: "warning" as const,
        message: "Service-role Supabase configuration is required before reset can run."
      };
    default:
      return {
        tone: "warning" as const,
        message: "Reset did not run. Review the preview and try again."
      };
  }
}
