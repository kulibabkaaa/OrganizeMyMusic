"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useDialogAccessibility } from "@/components/ui/dialog-accessibility";
import { StatusPill } from "@/components/ui/status-pill";
import type { PreviewSortRun } from "@/modules/sorts/preview-snapshot";
import {
  buildQualityTriageReport,
  formatQualityTriageReport
} from "@/modules/sorts/quality-triage";
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
  const hasTracks = playlist.tracks.length > 0;
  const checkboxDisabled = locked || !hasTracks;

  return (
    <article
      className={`rounded-[2rem] border p-6 shadow-[0_18px_80px_rgba(0,0,0,0.24)] ${
        hasTracks ? "border-white/10 bg-white/[0.08]" : "border-amber-200/20 bg-amber-200/[0.06]"
      }`}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-3 text-sm font-semibold text-white">
              <input
                type="checkbox"
                checked={selected && hasTracks}
                onChange={onToggle}
                disabled={checkboxDisabled}
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

      {playlist.qualityWarnings && playlist.qualityWarnings.length > 0 ? (
        <div className="mt-5 rounded-3xl border border-amber-200/20 bg-amber-200/10 p-4">
          <p className="text-sm font-semibold text-amber-100">Review before confirming</p>
          <ul className="mt-2 grid gap-1 text-sm leading-6 text-amber-50/72">
            {playlist.qualityWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
          {playlist.matchStats ? (
            <p className="mt-3 text-xs uppercase tracking-[0.16em] text-amber-50/46">
              {playlist.matchStats.matchedTrackCount} matched /{" "}
              {playlist.matchStats.totalTrackCount} checked
            </p>
          ) : null}
        </div>
      ) : null}

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
  const dialogRef = useRef<HTMLElement>(null);
  const { onDialogKeyDown } = useDialogAccessibility({
    isOpen: true,
    dialogRef,
    onClose: onCancel,
    closeDisabled: pending
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 px-4 py-5 backdrop-blur-sm sm:items-center sm:justify-center">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-playlists-title"
        aria-describedby="confirm-playlists-description"
        tabIndex={-1}
        onKeyDown={onDialogKeyDown}
        className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-[#111] p-6 shadow-[0_24px_120px_rgba(0,0,0,0.55)]"
      >
        <p className="text-sm uppercase tracking-[0.18em] text-white/42">Explicit confirmation</p>
        <h2 id="confirm-playlists-title" className="mt-3 font-display text-3xl tracking-[0em]">
          Create selected Apple Music playlists?
        </h2>
        <p id="confirm-playlists-description" className="mt-3 text-sm leading-7 text-white/62">
          This will create exactly {selectedPlaylistCount} playlists and {selectedTrackCount}{" "}
          tracks in Apple Music after your confirmation.
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
  const [qualityNotes, setQualityNotes] = useState("");
  const [qualityCopyState, setQualityCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [isPending, startTransition] = useTransition();

  const summary = useMemo(
    () => (snapshot && selection ? summarizePreviewSelection(snapshot, selection) : null),
    [snapshot, selection]
  );
  const qualityReport = useMemo(
    () => (snapshot && selection ? buildQualityTriageReport(snapshot, selection) : null),
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

  async function copyQualityReport() {
    if (!qualityReport) {
      return;
    }

    const text = formatQualityTriageReport(qualityReport, qualityNotes);

    try {
      await navigator.clipboard.writeText(text);
      setQualityCopyState("copied");
    } catch {
      setQualityCopyState("failed");
    }
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
              label={confirmationQueued || retryQueued ? "export queued" : "review required"}
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
            <p className="mt-1 text-sm text-white/54">preview ready</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            onClick={() => setShowConfirmation(true)}
            disabled={!canConfirm}
            aria-describedby={!canConfirm ? "sort-run-confirm-disabled-reason" : undefined}
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
              {isPending ? "Queueing retry..." : "Retry export"}
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
            Playlist export retry queued.
          </p>
        ) : null}
        {retryError ? (
          <p className="mt-4 rounded-3xl border border-[#ff4d6d]/30 bg-[#ff4d6d]/10 p-4 text-sm text-[#ffb8c4]">
            {retryError}
          </p>
        ) : null}
        {!canConfirm && !confirmationQueued && !retryQueued && sortRun.state !== "failed" ? (
          <p id="sort-run-confirm-disabled-reason" className="mt-4 text-sm text-white/50">
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

      {qualityReport ? (
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-white/42">
                Quality triage
              </p>
              <h2 className="mt-2 font-display text-2xl tracking-[0em]">
                Privacy-safe sorting report
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-white/62">
                This report includes playlist counts, match diagnostics, and your notes. It does
                not include track names, Apple Music IDs, fingerprints, or user tokens.
              </p>
            </div>
            <StatusPill
              label={`${qualityReport.selectedTrackCount}/${qualityReport.proposedTrackCount} selected`}
              tone="inverse"
            />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-black/24 p-4">
              <p className="text-2xl font-semibold">{qualityReport.emptyPlaylistCount}</p>
              <p className="mt-1 text-sm text-white/54">empty playlists</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/24 p-4">
              <p className="text-2xl font-semibold">{qualityReport.lowMatchPlaylistCount}</p>
              <p className="mt-1 text-sm text-white/54">low-match playlists</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/24 p-4">
              <p className="text-2xl font-semibold">{qualityReport.playlistCount}</p>
              <p className="mt-1 text-sm text-white/54">requested playlists</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {qualityReport.playlists.map((playlist) => (
              <article key={playlist.id} className="rounded-3xl border border-white/10 bg-black/24 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-white/86">{playlist.title}</p>
                  <StatusPill
                    label={`${playlist.proposedTrackCount} proposed`}
                    tone={playlist.proposedTrackCount === 0 ? "warning" : "inverse"}
                  />
                </div>
                <p className="mt-2 text-sm leading-6 text-white/58">
                  {playlist.matchStats
                    ? `${playlist.matchStats.matchedTrackCount} matched from ${playlist.matchStats.totalTrackCount} checked.`
                    : "No aggregate match diagnostics were stored for this playlist."}
                  {playlist.topRejectionReason
                    ? ` Top rejection: ${playlist.topRejectionReason}.`
                    : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {playlist.issueTags.map((tag) => (
                    <StatusPill key={tag} label={tag} tone="inverse" />
                  ))}
                </div>
                <p className="mt-3 text-sm leading-6 text-white/50">
                  {playlist.suggestedNextStep}
                </p>
              </article>
            ))}
          </div>

          <label className="mt-5 block text-sm font-medium text-white/72" htmlFor="quality-notes">
            Quality notes
          </label>
          <textarea
            id="quality-notes"
            value={qualityNotes}
            onChange={(event) => {
              setQualityNotes(event.target.value);
              setQualityCopyState("idle");
            }}
            rows={4}
            placeholder="Expected playlist intent, what felt wrong, and which playlist needs tuning."
            className="mt-2 w-full resize-y rounded-3xl border border-white/10 bg-black/24 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/32 focus:border-white/30"
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={copyQualityReport}
              className="border-white/12 bg-white/8 text-white"
            >
              Copy quality report
            </Button>
            {qualityCopyState !== "idle" ? (
              <p className="text-sm text-white/58" aria-live="polite">
                {qualityCopyState === "copied"
                  ? "Quality report copied."
                  : "Copy failed. Select the notes and report manually."}
              </p>
            ) : null}
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
