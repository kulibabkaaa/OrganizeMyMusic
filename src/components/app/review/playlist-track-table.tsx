import React from "react";

import { Button } from "@/components/ui/button";
import { TagChip } from "@/components/ui/tag-chip";
import {
  getMatchedTagsForReviewTrack,
  type ReviewPlaylistView
} from "@/modules/sorts/review-selection";

export function PlaylistTrackTable({
  playlist,
  onRemoveTrack,
  onUndoRemoveTrack
}: {
  playlist: ReviewPlaylistView | null;
  onRemoveTrack: (fingerprint: string) => void;
  onUndoRemoveTrack: () => void;
}) {
  if (!playlist) {
    return (
      <section className="rounded-[1.5rem] border border-white/10 bg-platform-card p-5">
        <h2 className="font-display text-2xl font-semibold tracking-[0em] text-white">
          No playlist selected
        </h2>
        <p className="mt-2 text-sm text-platform-secondary">
          Select a generated playlist to inspect tracks.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-platform-card">
      <div className="border-b border-white/10 p-5">
        <h2 className="font-display text-2xl font-semibold tracking-[0em] text-white">
          {playlist.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-platform-secondary">
          {playlist.playlist.description}
        </p>
        {playlist.playlist.qualityWarnings?.length ? (
          <div
            className="mt-4 rounded-2xl border border-[rgba(255,176,32,0.24)] bg-[rgba(255,176,32,0.08)] p-4"
            role="status"
            aria-label={`${playlist.title} sorting warnings`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-platform-warning">
              Sorting warnings
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-platform-secondary">
              {playlist.playlist.qualityWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {playlist.removedTrackCount > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[rgba(255,176,32,0.25)] bg-[rgba(255,176,32,0.10)] px-4 py-3">
            <p className="text-sm text-platform-secondary">
              {playlist.removedTrackCount} {playlist.removedTrackCount === 1 ? "track" : "tracks"} removed from this playlist.
            </p>
            <Button variant="glass" className="min-h-11 px-4 py-2 text-sm" onClick={onUndoRemoveTrack}>
              Undo remove
            </Button>
          </div>
        ) : null}
      </div>
      <div className="grid gap-3 p-4 md:hidden" aria-label={`Tracks selected for ${playlist.title}`}>
        {playlist.visibleTracks.map((track) => (
          <article
            key={track.fingerprint}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="break-words text-base font-semibold leading-6 text-white">
                  {track.name ?? "Untitled"}
                </h3>
                <p className="mt-1 break-words text-sm leading-6 text-platform-secondary">
                  {track.artistName ?? "Unknown artist"}
                </p>
              </div>
              <Button
                variant="danger"
                className="min-h-11 shrink-0 px-4 py-2 text-sm"
                onClick={() => onRemoveTrack(track.fingerprint)}
              >
                Remove
              </Button>
            </div>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-platform-muted">
                  Album
                </dt>
                <dd className="mt-1 break-words leading-6 text-platform-secondary">
                  {track.albumName ?? "Unknown album"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-platform-muted">
                  Reason included
                </dt>
                <dd className="mt-1 break-words leading-6 text-platform-secondary">
                  {track.reason}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-platform-muted">
                  Matched tags
                </dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {getMatchedTagsForReviewTrack(track).map((tag) => (
                    <TagChip key={tag} label={tag} tone="muted" />
                  ))}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <caption className="sr-only">Tracks selected for {playlist.title}</caption>
          <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-platform-muted">
            <tr>
              <th scope="col" className="px-5 py-4 font-medium">Track</th>
              <th scope="col" className="px-5 py-4 font-medium">Artist</th>
              <th scope="col" className="px-5 py-4 font-medium">Album</th>
              <th scope="col" className="px-5 py-4 font-medium">Reason included</th>
              <th scope="col" className="px-5 py-4 font-medium">Matched tags</th>
              <th scope="col" className="px-5 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {playlist.visibleTracks.map((track) => (
              <tr key={track.fingerprint} className="align-top text-platform-secondary">
                <td className="px-5 py-4 font-semibold text-white">{track.name ?? "Untitled"}</td>
                <td className="px-5 py-4">{track.artistName ?? "Unknown artist"}</td>
                <td className="px-5 py-4">{track.albumName ?? "Unknown album"}</td>
                <td className="px-5 py-4">{track.reason}</td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    {getMatchedTagsForReviewTrack(track).map((tag) => (
                      <TagChip key={tag} label={tag} tone="muted" />
                    ))}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <Button
                    variant="danger"
                    className="min-h-11 px-3 py-2 text-xs"
                    onClick={() => onRemoveTrack(track.fingerprint)}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
