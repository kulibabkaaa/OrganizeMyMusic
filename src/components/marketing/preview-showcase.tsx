import { demoSortRun } from "@/lib/sample-data";

import { StatusPill } from "@/components/ui/status-pill";

export function PreviewShowcase() {
  return (
    <section className="bg-mist text-black">
      <div className="mx-auto grid max-w-7xl gap-14 px-6 py-24 lg:grid-cols-[0.95fr_1.05fr] lg:px-10 lg:py-32">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-black/45">Preview surface</p>
          <h2 className="mt-4 max-w-md font-display text-4xl tracking-[-0.04em]">
            The app feels operational, not ornamental, once the library is in motion.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-black/68">
            Sync state, duplicate cleanup, classification progress, payment state, and creation
            status stay visible in one place so users always know what the system is doing.
          </p>
        </div>

        <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_30px_80px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between border-b border-black/8 pb-4">
            <div>
              <p className="font-display text-2xl tracking-[-0.03em]">Preview bundle</p>
              <p className="mt-1 text-sm text-black/54">Before payment, fully reviewable.</p>
            </div>
            <StatusPill label="Preview ready" tone="accent" />
          </div>

          <div className="mt-6 space-y-4">
            {demoSortRun.playlists.map((playlist) => (
              <div key={playlist.id} className="grid gap-2 border-b border-black/6 pb-4 last:border-b-0">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{playlist.title}</p>
                    <p className="text-sm text-black/56">{playlist.description}</p>
                  </div>
                  <span className="text-sm text-black/50">{playlist.trackCount} tracks</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

