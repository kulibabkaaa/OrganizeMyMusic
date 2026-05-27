import React from "react";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { getReviewPlaylistView, type ReviewSelection } from "@/modules/sorts/review-selection";
import type { GeneratedPlaylist } from "@/types/domain";

export function GeneratedPlaylistList({
  playlists,
  selection,
  onSelect,
  onDelete,
  onRestore
}: {
  playlists: GeneratedPlaylist[];
  selection: ReviewSelection;
  onSelect: (playlistId: string) => void;
  onDelete: (playlistId: string) => void;
  onRestore: (playlistId: string) => void;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-xl font-semibold tracking-[0em] text-white">
          Generated playlists
        </h2>
        <p className="mt-1 text-sm text-platform-secondary">
          Pick a playlist to inspect before export.
        </p>
      </div>

      <div className="space-y-3">
        {playlists.map((playlist) => {
          const view = getReviewPlaylistView(playlist, selection);
          const isActive = selection.selectedPlaylistId === playlist.id;

          return (
            <article
              key={playlist.id}
              className={[
                "rounded-3xl border p-4 transition",
                isActive
                  ? "border-[rgba(255,45,85,0.45)] bg-[rgba(255,45,85,0.12)]"
                  : "border-white/10 bg-white/[0.04]"
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => onSelect(playlist.id)}
                className="w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{view.title}</h3>
                    <p className="mt-1 text-xs text-platform-secondary">
                      {view.visibleTracks.length} {view.visibleTracks.length === 1 ? "track" : "tracks"}
                    </p>
                  </div>
                  <StatusPill label={view.isIncluded ? "Included" : "Deleted"} tone={view.isIncluded ? "success" : "muted"} />
                </div>
              </button>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                {!view.isIncluded ? (
                  <p className="text-xs leading-5 text-platform-secondary">
                    Removed from export. You can undo before exporting.
                  </p>
                ) : (
                  <span />
                )}
                {view.isIncluded ? (
                  <Button
                    variant="ghost"
                    className="px-3 py-2 text-xs"
                    onClick={() => onDelete(playlist.id)}
                  >
                    Delete playlist
                  </Button>
                ) : (
                  <Button
                    variant="glass"
                    className="px-3 py-2 text-xs"
                    onClick={() => onRestore(playlist.id)}
                  >
                    Undo delete
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
