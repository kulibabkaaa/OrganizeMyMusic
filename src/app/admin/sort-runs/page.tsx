import Link from "next/link";

import { AppShell } from "@/components/app/app-shell";
import { StatusPill } from "@/components/ui/status-pill";
import { listAdminSortRuns } from "@/server/db/queries";

export const dynamic = "force-dynamic";

export default async function AdminSortRunsPage() {
  const sortRuns = await listAdminSortRuns();

  return (
    <AppShell title="Admin runs" subtitle="Jobs, failures, payment state, and Apple write visibility.">
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
              <StatusPill label={sortRun.state.replaceAll("_", " ")} tone="accent" />
            </div>
            <div>
              <StatusPill label={sortRun.paymentStatus} tone="neutral" />
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
