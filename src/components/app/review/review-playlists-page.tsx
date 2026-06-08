"use client";

import React, { useMemo, useState } from "react";

import { ExportConfirmationDialog } from "@/components/app/review/export-confirmation-dialog";
import { GeneratedPlaylistList } from "@/components/app/review/generated-playlist-list";
import { PlaylistDetailsPanel } from "@/components/app/review/playlist-details-panel";
import { PlaylistTrackTable } from "@/components/app/review/playlist-track-table";
import { WorkflowEscapeActions } from "@/components/app/workflow-escape-actions";
import {
  createInitialReviewSelection,
  deleteReviewPlaylist,
  getReviewPlaylistView,
  removeReviewTrack,
  renameReviewPlaylist,
  restoreReviewPlaylist,
  selectReviewPlaylist,
  summarizeReviewSelection,
  undoLastRemovedReviewTrack
} from "@/modules/sorts/review-selection";
import type { PreviewSnapshot } from "@/modules/sorts/preview-snapshot";

export function ReviewPlaylistsPage({
  sortId,
  sortName,
  snapshot
}: {
  sortId: string;
  sortName: string;
  snapshot: PreviewSnapshot;
}) {
  const [selection, setSelection] = useState(() => createInitialReviewSelection(snapshot));
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isExportSubmitting, setIsExportSubmitting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const summary = useMemo(
    () => summarizeReviewSelection(snapshot, selection),
    [snapshot, selection]
  );
  const selectedPlaylist =
    snapshot.playlists.find((playlist) => playlist.id === selection.selectedPlaylistId) ??
    snapshot.playlists[0] ??
    null;
  const selectedPlaylistView = selectedPlaylist
    ? getReviewPlaylistView(selectedPlaylist, selection)
    : null;

  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-platform-muted">
            Full organization ready
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[0em] text-white md:text-4xl">
            Review playlists
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-platform-secondary">
            Inspect tracks, remove misses, and confirm before Apple Music export.
          </p>
          <WorkflowEscapeActions className="mt-4" />
        </div>
        <p className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-platform-secondary">
          {sortName}
        </p>
      </section>

      <section className="grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)_24rem]">
        <GeneratedPlaylistList
          playlists={snapshot.playlists}
          selection={selection}
          onSelect={(playlistId) =>
            setSelection((current) => selectReviewPlaylist(current, playlistId))
          }
          onDelete={(playlistId) =>
            setSelection((current) => deleteReviewPlaylist(current, playlistId))
          }
          onRestore={(playlistId) =>
            setSelection((current) => restoreReviewPlaylist(current, playlistId))
          }
        />
        <PlaylistTrackTable
          playlist={selectedPlaylistView}
          onRemoveTrack={(fingerprint) => {
            if (!selectedPlaylistView) {
              return;
            }

            setSelection((current) =>
              removeReviewTrack(current, selectedPlaylistView.playlist.id, fingerprint)
            );
          }}
          onUndoRemoveTrack={() => {
            if (!selectedPlaylistView) {
              return;
            }

            setSelection((current) =>
              undoLastRemovedReviewTrack(current, selectedPlaylistView.playlist.id)
            );
          }}
        />
        <PlaylistDetailsPanel
          playlist={selectedPlaylistView}
          summary={summary}
          onRename={(title) => {
            if (!selectedPlaylistView) {
              return;
            }

            setSelection((current) =>
              renameReviewPlaylist(current, selectedPlaylistView.playlist.id, title)
            );
          }}
          onDelete={() => {
            if (!selectedPlaylistView) {
              return;
            }

            setSelection((current) =>
              deleteReviewPlaylist(current, selectedPlaylistView.playlist.id)
            );
          }}
          onOpenExport={() => setIsExportOpen(true)}
        />
      </section>

      <ExportConfirmationDialog
        isOpen={isExportOpen}
        summary={summary}
        isSubmitting={isExportSubmitting}
        errorMessage={exportError}
        statusMessage={exportMessage}
        onClose={() => setIsExportOpen(false)}
        onConfirm={async () => {
          setIsExportSubmitting(true);
          setExportError(null);
          setExportMessage(null);

          try {
            const response = await fetch(`/api/app/sorts/${encodeURIComponent(sortId)}/export`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                selectedPlaylistIds: selection.includedPlaylistIds,
                removedTrackFingerprintsByPlaylistId:
                  selection.removedTrackFingerprintsByPlaylistId,
                renamedPlaylistTitlesById: selection.renamedPlaylistTitlesById
              })
            });
            const payload = (await response.json().catch(() => null)) as
              | { error?: string; status?: string }
              | null;

            if (!response.ok) {
              setExportError(payload?.error ?? "Apple Music export could not be queued.");
              return;
            }

            setExportMessage("Apple Music export queued.");
          } finally {
            setIsExportSubmitting(false);
          }
        }}
      />
    </div>
  );
}
