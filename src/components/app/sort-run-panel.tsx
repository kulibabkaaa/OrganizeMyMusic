"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import type { PreviewSortRun } from "@/modules/sorts/preview-snapshot";
import {
  createInitialPreviewSelection,
  getVisiblePreviewTrackCount,
  removePreviewTrack,
  summarizePreviewSelection,
  togglePreviewPlaylist
} from "@/modules/sorts/preview-selection";
import type { GeneratedPlaylist, GeneratedPlaylistTrack } from "@/types/domain";

function formatScore(score: number) {
  return `${Math.round(score * 100)}%`;
}

function formatStateLabel(label: string) {
  return label.replaceAll("_", " ");
}

function trackName(track: GeneratedPlaylistTrack) {
  return track.name?.trim() || "Unknown title";
}

function trackArtist(track: GeneratedPlaylistTrack) {
  return track.artistName?.trim() || "Unknown artist";
}

function TrackRow({
  track,
  disabled,
  onRemove
}: {
  track: GeneratedPlaylistTrack;
  disabled: boolean;
  onRemove: () => void;
}) {
  return (
    <li className="grid gap-3 rounded-3xl border border-white/10 bg-black/24 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 truncate text-sm font-semibold text-white">{trackName(track)}</p>
          <span className="rounded-full bg-white/8 px-2.5 py-1 text-xs font-medium text-white/62">
            {formatScore(track.score)}
          </span>
        </div>
        <p className="mt-1 truncate text-sm text-white/58">
          {trackArtist(track)}
          {track.albumName ? ` - ${track.albumName}` : ""}
        </p>
        <p className="mt-3 text-sm leading-6 text-white/54">{track.reason}</p>
      </div>
      <Button
        type="button"
        variant="secondary"
        disabled={disabled}
        onClick={onRemove}
        className="border-white/12 bg-white/8 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-45"
      >
        Remove
      </Button>
    </li>
  );
}

function PlaylistCard({
  playlist,
  selected,
  locked,
  visibleTrackCount,
  removedFingerprints,
  onToggle,
  onRemoveTrack
}: {
  playlist: GeneratedPlaylist;
  selected: boolean;
  locked: boolean;
  visibleTrackCount: number;
  removedFingerprints: string[];
  onToggle: () => void;
  onRemoveTrack: (fingerprint: string) => void;
}) {
  const removedFingerprintSet = new Set(removedFingerprints);

  return (
    <article
      className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-6 shadow-[0_18px_80px_rgba(0,0,0,0.24)]"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-3 text-sm font-semibold text-white">
              <input
                type="checkbox"
                checked={selected}
                onChange={onToggle}
                disabled={locked}
                className="h-5 w-5 rounded border-white/20 bg-black/30 accent-[#fa244d]"
                aria-label={`${selected ? "Deselect" : "Select"} ${playlist.title}`}
              />
              <span className="truncate">{playlist.title}</span>
            </label>
            <StatusPill
              label={`${playlist.confidenceLabel} confidence`}
              tone={playlist.confidenceLabel === "high" ? "success" : "warning"}
            />
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/62">{playlist.description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <span className="rounded-full border border-white/10 bg-black/24 px-3 py-1.5 text-sm text-white/70">
            {visibleTrackCount} selected
          </span>
          <span className="rounded-full border border-white/10 bg-black/24 px-3 py-1.5 text-sm text-white/70">
            {playlist.tracks.length} proposed
          </span>
        </div>
      </div>

      {playlist.tracks.length > 0 ? (
        <ol className="mt-5 grid gap-3">
          {playlist.tracks
            .filter((track) => !removedFingerprintSet.has(track.fingerprint))
            .map((track) => (
              <TrackRow
                key={`${playlist.id}-${track.fingerprint}-${track.position}`}
                track={track}
                disabled={!selected || locked}
                onRemove={() => onRemoveTrack(track.fingerprint)}
              />
            ))}
        </ol>
      ) : (
        <p className="mt-5 rounded-3xl border border-white/10 bg-black/24 p-4 text-sm text-white/58">
          No tracks were generated for this playlist.
        </p>
      )}

      {visibleTrackCount === 0 && playlist.tracks.length > 0 ? (
        <p className="mt-4 text-sm text-white/50">
          This playlist is currently excluded from the preview selection.
        </p>
      ) : null}
    </article>
  );
}

function ConfirmationDialog({
  selectedPlaylistCount,
  selectedTrackCount,
  pending,
  errorMessage,
  onCancel,
  onConfirm
}: {
  selectedPlaylistCount: number;
  selectedTrackCount: number;
  pending: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 px-4 py-5 backdrop-blur-sm sm:items-center sm:justify-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-playlists-title"
        className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-[#111] p-6 shadow-[0_24px_120px_rgba(0,0,0,0.55)]"
      >
        <p className="text-sm uppercase tracking-[0.18em] text-white/42">Explicit confirmation</p>
        <h2 id="confirm-playlists-title" className="mt-3 font-display text-3xl tracking-[0em]">
          Create selected Apple Music playlists?
        </h2>
        <p className="mt-3 text-sm leading-7 text-white/62">
          This will queue creation for exactly {selectedPlaylistCount} playlists and{" "}
          {selectedTrackCount} tracks. The worker will perform the Apple Music write-back.
        </p>

        {errorMessage ? (
          <p className="mt-4 rounded-3xl border border-[#ff4d6d]/30 bg-[#ff4d6d]/10 p-4 text-sm text-[#ffb8c4]">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={pending}
            className="border-white/12 bg-white/8 text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            Keep reviewing
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Queuing..." : "Confirm and create"}
          </Button>
        </div>
      </section>
    </div>
  );
}

export function SortRunPanel({ sortRun }: { sortRun: PreviewSortRun }) {
  const router = useRouter();
  const snapshot = sortRun.previewSnapshot;
  const [selection, setSelection] = useState(() =>
    snapshot ? createInitialPreviewSelection(snapshot) : null
  );
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const [confirmationQueued, setConfirmationQueued] = useState(sortRun.state === "creating_playlists");
  const [retryError, setRetryError] = useState<string | null>(null);
  const [retryQueued, setRetryQueued] = useState(false);
  const [isPending, startTransition] = useTransition();

  const summary = useMemo(
    () => (snapshot && selection ? summarizePreviewSelection(snapshot, selection) : null),
    [snapshot, selection]
  );

  if (!snapshot || !selection || !summary) {
    return (
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-7">
        <p className="text-sm uppercase tracking-[0.18em] text-white/42">Preview pending</p>
        <h2 className="mt-3 font-display text-3xl tracking-[0em]">
          Playlist output is not ready yet.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62">
          Run playlist requests after a completed library sync to generate a stable preview snapshot.
        </p>
      </section>
    );
  }

  function confirmSelection() {
    if (!snapshot || !selection || !summary) {
      return;
    }

    setConfirmationError(null);
    startTransition(async () => {
      const response = await fetch(`/api/sort-runs/${sortRun.id}/confirm`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(selection)
      });
      const payload = (await response.json()) as {
        error?: string;
        state?: string;
      };

      if (!response.ok) {
        setConfirmationError(payload.error ?? "Confirmation failed.");
        return;
      }

      setConfirmationQueued(payload.state === "creating_playlists");
      setShowConfirmation(false);
      router.refresh();
    });
  }

  function retryWriteBack() {
    setRetryError(null);
    startTransition(async () => {
      const response = await fetch(`/api/sort-runs/${sortRun.id}/retry`, {
        method: "POST"
      });
      const payload = (await response.json()) as {
        error?: string;
        state?: string;
      };

      if (!response.ok) {
        setRetryError(payload.error ?? "Retry failed.");
        return;
      }

      setRetryQueued(payload.state === "creating_playlists");
      setConfirmationQueued(payload.state === "creating_playlists");
      router.refresh();
    });
  }

  const canConfirm =
    !confirmationQueued &&
    sortRun.state === "preview_ready" &&
    summary.selectedPlaylistCount > 0 &&
    summary.selectedTrackCount > 0;
  const canRetry = sortRun.state === "failed" && !retryQueued;
  const selectionLocked = confirmationQueued || retryQueued || sortRun.state !== "preview_ready";
  const recentEvents = sortRun.events ?? [];

  return (
    <section className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-7">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-white/42">Preview only</p>
            <h2 className="mt-3 font-display text-3xl tracking-[0em]">
              Review proposed Apple Music playlists.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/62">
              Selection changes are local to this preview page. No Apple Music playlist is created
              from this screen.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <StatusPill label={formatStateLabel(sortRun.state)} tone="accent" />
            <StatusPill label={sortRun.paymentStatus} tone="inverse" />
            <StatusPill
              label={confirmationQueued || retryQueued ? "creation queued" : "no write-back"}
              tone={confirmationQueued || retryQueued ? "success" : "warning"}
            />
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-black/24 p-4">
            <p className="text-2xl font-semibold">{summary.selectedPlaylistCount}</p>
            <p className="mt-1 text-sm text-white/54">playlists selected</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/24 p-4">
            <p className="text-2xl font-semibold">{summary.selectedTrackCount}</p>
            <p className="mt-1 text-sm text-white/54">tracks selected</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/24 p-4">
            <p className="text-sm font-semibold text-white">
              {new Date(snapshot.generatedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric"
              })}
            </p>
            <p className="mt-1 text-sm text-white/54">snapshot generated</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            onClick={() => setShowConfirmation(true)}
            disabled={!canConfirm}
            className="disabled:cursor-not-allowed disabled:opacity-55"
          >
            {confirmationQueued || retryQueued ? "Playlist creation queued" : "Review confirmation"}
          </Button>
          {canRetry ? (
            <Button
              type="button"
              variant="secondary"
              onClick={retryWriteBack}
              disabled={isPending}
              className="border-white/12 bg-white/8 text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isPending ? "Queueing retry..." : "Retry write-back"}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            onClick={() => setSelection(createInitialPreviewSelection(snapshot))}
            disabled={confirmationQueued || retryQueued}
            className="border-white/12 bg-white/8 text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            Reset preview selection
          </Button>
        </div>

        {retryQueued ? (
          <p className="mt-4 text-sm text-white/58" aria-live="polite">
            Playlist write-back retry queued.
          </p>
        ) : null}
        {retryError ? (
          <p className="mt-4 rounded-3xl border border-[#ff4d6d]/30 bg-[#ff4d6d]/10 p-4 text-sm text-[#ffb8c4]">
            {retryError}
          </p>
        ) : null}
        {!canConfirm && !confirmationQueued && !retryQueued && sortRun.state !== "failed" ? (
          <p className="mt-4 text-sm text-white/50">
            Select at least one playlist with one track before confirmation.
          </p>
        ) : null}
      </section>

      {recentEvents.length > 0 ? (
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-white/42">Recent activity</p>
              <h2 className="mt-2 font-display text-2xl tracking-[0em]">Playlist creation status</h2>
            </div>
            <StatusPill label={`${recentEvents.length} events`} tone="inverse" />
          </div>
          <div className="mt-5 grid gap-3">
            {recentEvents.slice(0, 5).map((event) => (
              <article key={event.id} className="rounded-3xl border border-white/10 bg-black/24 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white/84">{event.message}</p>
                  <StatusPill
                    label={event.level}
                    tone={event.level === "error" ? "warning" : "inverse"}
                  />
                </div>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/36">
                  {event.stage}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-5">
        {snapshot.playlists.map((playlist) => (
          <PlaylistCard
            key={playlist.id}
            playlist={playlist}
            selected={selection.selectedPlaylistIds.includes(playlist.id)}
            locked={selectionLocked}
            visibleTrackCount={getVisiblePreviewTrackCount(snapshot, selection, playlist.id)}
            removedFingerprints={
              selection.removedTrackFingerprintsByPlaylistId[playlist.id] ?? []
            }
            onToggle={() =>
              setSelection((current) =>
                current ? togglePreviewPlaylist(current, playlist.id) : current
              )
            }
            onRemoveTrack={(fingerprint) =>
              setSelection((current) =>
                current ? removePreviewTrack(current, playlist.id, fingerprint) : current
              )
            }
          />
        ))}
      </div>

      {showConfirmation ? (
        <ConfirmationDialog
          selectedPlaylistCount={summary.selectedPlaylistCount}
          selectedTrackCount={summary.selectedTrackCount}
          pending={isPending}
          errorMessage={confirmationError}
          onCancel={() => {
            if (!isPending) {
              setShowConfirmation(false);
              setConfirmationError(null);
            }
          }}
          onConfirm={confirmSelection}
        />
      ) : null}
    </section>
  );
}
