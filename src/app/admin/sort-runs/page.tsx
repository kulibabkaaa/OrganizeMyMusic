import Link from "next/link";

import { AppShell } from "@/components/app/app-shell";
import { StatusPill } from "@/components/ui/status-pill";
import { listAdminSortRuns } from "@/server/db/queries";

export const dynamic = "force-dynamic";

export default async function AdminSortRunsPage() {
  const sortRuns = await listAdminSortRuns();
  const failedRuns = sortRuns.filter(
    (sortRun) => sortRun.state === "failed" || sortRun.paymentStatus === "failed"
  );

  return (
    <AppShell title="Admin runs" subtitle="Jobs, failures, payment state, and Apple write visibility.">
      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/admin/reset-user" className="text-sm font-medium text-platform-secondary hover:text-white">
          Development reset
        </Link>
      </div>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/8 bg-white px-5 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-black/42">Runs</p>
          <p className="mt-2 text-2xl font-semibold text-black">{sortRuns.length}</p>
        </div>
        <div className="rounded-2xl border border-black/8 bg-white px-5 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-black/42">Failed jobs</p>
          <p className="mt-2 text-2xl font-semibold text-[#cf143a]">{failedRuns.length}</p>
        </div>
        <div className="rounded-2xl border border-black/8 bg-white px-5 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-black/42">Needs review</p>
          <p className="mt-2 text-2xl font-semibold text-black">
            {sortRuns.filter((sortRun) => sortRun.state === "preview_ready").length}
          </p>
        </div>
      </section>

      <div className="overflow-hidden rounded-[2rem] border border-black/8 bg-white">
        <div className="grid grid-cols-[1.2fr_0.8fr_0.6fr_auto] gap-4 border-b border-black/8 px-6 py-4 text-xs uppercase tracking-[0.18em] text-black/45">
          <span>Run</span>
          <span>State</span>
          <span>Payment</span>
          <span />
        </div>

        {sortRuns.map((sortRun) => (
          <div
            key={sortRun.id}
            className="grid grid-cols-[1.2fr_0.8fr_0.6fr_auto] gap-4 px-6 py-5 text-sm"
          >
            <div>
              <p className="font-medium">{sortRun.id}</p>
              <p className="mt-1 text-black/54">{sortRun.playlists.length} playlists proposed</p>
            </div>
            <div>
              <StatusPill
                label={sortRun.state.replaceAll("_", " ")}
                tone={sortRun.state === "failed" ? "danger" : "accent"}
              />
            </div>
            <div>
              <StatusPill
                label={sortRun.paymentStatus}
                tone={sortRun.paymentStatus === "failed" ? "danger" : "neutral"}
              />
            </div>
            <div>
              <Link href={`/admin/sort-runs/${sortRun.id}`} className="font-medium text-[#cf143a]">
                Inspect
              </Link>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
