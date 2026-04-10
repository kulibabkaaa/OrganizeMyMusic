import { PipelineOverview } from "@/components/app/pipeline-overview";
import { AppShell } from "@/components/app/app-shell";
import { AppleMusicConnectCard } from "@/components/app/apple-music-connect-card";
import { CreateSortButton } from "@/components/app/create-sort-button";
import { demoSortRun } from "@/lib/sample-data";
import { StatusPill } from "@/components/ui/status-pill";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <AppShell
      title="Dashboard"
      subtitle="Connect Apple Music, run a sync, and inspect preview-ready sorts."
    >
      <section className="mb-6 flex flex-wrap items-center gap-3">
        <StatusPill label="Apple Music not connected" tone="warning" />
        <StatusPill label="1 preview-ready sort" tone="accent" />
      </section>

      <PipelineOverview />

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <AppleMusicConnectCard />

        <div className="rounded-[2rem] border border-black/8 bg-white p-7">
          <p className="text-sm uppercase tracking-[0.18em] text-black/42">Latest sort run</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h2 className="font-display text-3xl tracking-[-0.04em]">
                Preview ready for review
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-black/62">
                {demoSortRun.playlists.length} playlists generated across language, genre, and
                mood. Payment stays blocked until the user reviews the bundle.
              </p>
            </div>
            <a
              href={`/sorts/${demoSortRun.id}`}
              className="inline-flex rounded-full bg-[linear-gradient(135deg,#ff4e6b_0%,#ff0436_100%)] px-5 py-3 text-sm font-semibold text-white"
            >
              Open sort run
            </a>
          </div>
          <div className="mt-6">
            <CreateSortButton />
          </div>
        </div>
      </section>
    </AppShell>
  );
}
