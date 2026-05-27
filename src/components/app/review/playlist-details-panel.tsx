import React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type {
  ReviewPlaylistView,
  ReviewSelectionSummary
} from "@/modules/sorts/review-selection";

export function PlaylistDetailsPanel({
  playlist,
  summary,
  onRename,
  onDelete,
  onOpenExport
}: {
  playlist: ReviewPlaylistView | null;
  summary: ReviewSelectionSummary;
  onRename: (title: string) => void;
  onDelete: () => void;
  onOpenExport: () => void;
}) {
  const playlistDisabledReasonId = !playlist ? "playlist-details-disabled-reason" : undefined;
  const exportDisabledReasonId =
    summary.selectedPlaylistCount === 0 ? "playlist-export-disabled-reason" : undefined;

  return (
    <Card elevated className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-[0em] text-white">
            Playlist details
          </h2>
          <p className="mt-2 text-sm leading-6 text-platform-secondary">
            Nothing is exported automatically. Existing Apple Music playlists will not be modified.
          </p>
        </div>
        <StatusPill label="Review" tone="pink" />
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-white">Rename playlist</span>
        <input
          value={playlist?.title ?? ""}
          onChange={(event) => onRename(event.target.value)}
          disabled={!playlist}
          aria-describedby={playlistDisabledReasonId}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-platform-muted focus:border-[rgba(255,45,85,0.45)] disabled:cursor-not-allowed disabled:opacity-50"
        />
      </label>
      {!playlist ? (
        <p id={playlistDisabledReasonId} className="text-sm leading-6 text-platform-secondary">
          Select a generated playlist before renaming or deleting.
        </p>
      ) : null}

      <dl className="grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <dt className="text-platform-secondary">Playlists selected</dt>
          <dd className="font-semibold text-white">{summary.selectedPlaylistCount}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <dt className="text-platform-secondary">Tracks selected</dt>
          <dd className="font-semibold text-white">{summary.selectedTrackCount}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <dt className="text-platform-secondary">Removed here</dt>
          <dd className="font-semibold text-white">{playlist?.removedTrackCount ?? 0}</dd>
        </div>
      </dl>

      <div className="grid gap-3">
        <Button
          variant="danger"
          disabled={!playlist}
          aria-describedby={playlistDisabledReasonId}
          onClick={onDelete}
        >
          Delete playlist
        </Button>
        <Link
          href="/app/sorts"
          className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/[0.14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink"
        >
          Adjust recipe
        </Link>
        <Button
          variant="primary"
          disabled={summary.selectedPlaylistCount === 0}
          aria-describedby={exportDisabledReasonId}
          onClick={onOpenExport}
        >
          Export selected playlists
        </Button>
        {summary.selectedPlaylistCount === 0 ? (
          <p id={exportDisabledReasonId} className="text-sm leading-6 text-platform-secondary">
            Select at least one playlist before exporting to Apple Music.
          </p>
        ) : null}
      </div>
    </Card>
  );
}
