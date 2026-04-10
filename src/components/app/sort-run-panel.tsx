import type { SortRunSummary } from "@/types/domain";

import { StatusPill } from "@/components/ui/status-pill";

export function SortRunPanel({ sortRun }: { sortRun: SortRunSummary }) {
  return (
    <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <aside className="rounded-[2rem] border border-black/8 bg-white p-6">
        <p className="text-sm uppercase tracking-[0.18em] text-black/42">Run state</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <StatusPill label={sortRun.state.replaceAll("_", " ")} tone="accent" />
          <StatusPill label={sortRun.paymentStatus} tone="neutral" />
        </div>
        <div className="mt-8 space-y-5 text-sm text-black/64">
          <div>
            <p className="text-black">Bundle price</p>
            <p>${(sortRun.previewPrice / 100).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-black">Selected playlists</p>
            <p>{sortRun.selectedPlaylistIds.length}</p>
          </div>
        </div>
      </aside>

      <div className="rounded-[2rem] border border-black/8 bg-white p-6">
        <p className="text-sm uppercase tracking-[0.18em] text-black/42">Playlist preview</p>
        <div className="mt-5 space-y-4">
          {sortRun.playlists.map((playlist) => (
            <div key={playlist.id} className="border-t border-black/8 pt-4 first:border-t-0 first:pt-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{playlist.title}</p>
                  <p className="mt-1 text-sm text-black/58">{playlist.description}</p>
                </div>
                <span className="text-sm text-black/48">{playlist.trackCount} tracks</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

