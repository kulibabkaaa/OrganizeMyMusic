"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import type { LibrarySyncJobEvent, LibrarySyncSummary } from "@/modules/library-syncs/queue";
import {
  getLibrarySyncDisplayState,
  type LibrarySyncVisibleStatus
} from "@/modules/library-syncs/status";

type SyncActionState = "idle" | "queueing" | "queued" | "error";
type LatestSyncResponse = {
  sync?: LibrarySyncSummary | null;
  events?: LibrarySyncJobEvent[];
  error?: string;
};

const SYNC_POLL_INTERVAL_MS = 3000;

export function LibrarySyncCard({
  canStart,
  latestSync,
  events,
  disabledReason
}: {
  canStart: boolean;
  latestSync: LibrarySyncSummary | null;
  events: LibrarySyncJobEvent[];
  disabledReason?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<SyncActionState>("idle");
  const [currentSync, setCurrentSync] = useState<LibrarySyncSummary | null>(latestSync);
  const [currentEvents, setCurrentEvents] = useState<LibrarySyncJobEvent[]>(events);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isBusy = isPending || state === "queueing";
  const disabledReasonId = !canStart && disabledReason ? "library-sync-disabled-reason" : undefined;
  const visibleStatus: LibrarySyncVisibleStatus =
    currentSync?.status ?? (state === "queued" ? "queued" : "not_started");
  const displayState = getLibrarySyncDisplayState(visibleStatus, currentSync?.errorSummary);

  useEffect(() => {
    setCurrentSync(latestSync);
  }, [latestSync]);

  useEffect(() => {
    setCurrentEvents(events);
  }, [events]);

  useEffect(() => {
    if (!displayState.isActive) {
      return;
    }

    let isCancelled = false;

    async function refreshSyncState() {
      try {
        const response = await fetch("/api/library-syncs", { cache: "no-store" });
        const payload = (await response.json()) as LatestSyncResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to refresh sync status.");
        }

        if (isCancelled) {
          return;
        }

        setCurrentSync(payload.sync ?? null);
        setCurrentEvents(payload.events ?? []);

        if (payload.sync?.status === "completed") {
          setState("idle");
          setMessage("Library sync complete.");
          router.refresh();
        }

        if (payload.sync?.status === "failed") {
          setState("error");
          setMessage(payload.sync.errorSummary ?? "Library sync failed.");
          router.refresh();
        }
      } catch (error) {
        if (!isCancelled) {
          setMessage(error instanceof Error ? error.message : "Unable to refresh sync status.");
        }
      }
    }

    void refreshSyncState();
    const intervalId = window.setInterval(refreshSyncState, SYNC_POLL_INTERVAL_MS);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [displayState.isActive, router]);

  function startSync() {
    setState("queueing");
    setMessage("Queueing background sync...");

    startTransition(async () => {
      try {
        const response = await fetch("/api/library-syncs", {
          method: "POST"
        });
        const payload = (await response.json()) as {
          error?: string;
          syncId?: string;
          status?: LibrarySyncSummary["status"];
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to start library sync.");
        }

        setState("queued");
        setMessage("Library sync queued. Your library will keep updating in the background.");
        router.refresh();
      } catch (error) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "Unable to start library sync.");
      }
    });
  }

  function retrySync() {
    if (!currentSync || currentSync.status !== "failed") {
      return;
    }

    setState("queueing");
    setMessage("Queueing retry...");

    startTransition(async () => {
      try {
        const response = await fetch(`/api/library-syncs/${currentSync.id}/retry`, {
          method: "POST"
        });
        const payload = (await response.json()) as {
          error?: string;
          syncId?: string;
          jobId?: string | null;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to retry library sync.");
        }

        setState("queued");
        setMessage(`Retry queued as sync ${payload.syncId}.`);
        router.refresh();
      } catch (error) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "Unable to retry library sync.");
      }
    });
  }

  function refreshStatus() {
    setMessage("Refreshing sync status...");

    startTransition(async () => {
      try {
        const response = await fetch("/api/library-syncs", { cache: "no-store" });
        const payload = (await response.json()) as LatestSyncResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to refresh sync status.");
        }

        setCurrentSync(payload.sync ?? null);
        setCurrentEvents(payload.events ?? []);
        setMessage("Sync status refreshed.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to refresh sync status.");
      }
    });
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-white/42">Library sync</p>
          <h2 className="mt-3 font-display text-3xl tracking-[-0.04em]">
            {currentSync ? "Apple Music sync status" : "Sync your Apple Music library"}
          </h2>
        </div>
        <StatusPill label={displayState.label} tone={displayState.tone} />
      </div>

      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62">
        {displayState.description} No playlists are created from this action.
      </p>

      <div
        className="mt-5"
        aria-label="Library sync progress"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={displayState.progressPercent}
        role="progressbar"
      >
        <div className="h-2 overflow-hidden rounded-full bg-black/30">
          <div
            className="h-full rounded-full bg-[#fb2d55] transition-[width] duration-500"
            style={{ width: `${displayState.progressPercent}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-white/38">
          <span>{displayState.isActive ? "Running" : displayState.isTerminal ? "Finished" : "Idle"}</span>
          <span>{displayState.progressPercent}%</span>
        </div>
      </div>

      {message ? (
        <p className="mt-3 text-sm leading-6 text-white/68" aria-live="polite">
          {message}
        </p>
      ) : null}
      {currentSync?.status === "failed" && currentSync.errorSummary ? (
        <p className="mt-3 text-sm leading-6 text-amber-100" role="status">
          {currentSync.errorSummary}
        </p>
      ) : null}
      {!canStart && disabledReason ? (
        <p id={disabledReasonId} className="mt-3 text-sm leading-6 text-amber-100">{disabledReason}</p>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Metric label="raw tracks" value={currentSync?.rawTrackCount ?? 0} />
        <Metric label="normalized" value={currentSync?.normalizedTrackCount ?? 0} />
        <Metric label="duplicates" value={currentSync?.duplicateCount ?? 0} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          disabled={!canStart || isBusy || displayState.isActive}
          aria-describedby={disabledReasonId}
          onClick={startSync}
          className="min-w-44"
        >
          {getStartButtonLabel({ currentSync, isBusy, state })}
        </Button>
        <Button variant="glass" onClick={refreshStatus} className="min-w-36">
          Refresh status
        </Button>
        {currentSync?.status === "failed" ? (
          <Button
            variant="secondary"
            disabled={!canStart || isBusy}
            onClick={retrySync}
            className="min-w-36 border-white/15 bg-white/10 text-white"
          >
            Retry sync
          </Button>
        ) : null}
        {currentSync ? (
          <span className="text-sm text-white/48">Sync ID: {currentSync.id}</span>
        ) : null}
      </div>

      {currentEvents.length > 0 ? (
        <div className="mt-6 space-y-3">
          {currentEvents.slice(0, 5).map((event) => (
            <div key={event.id} className="rounded-3xl border border-white/10 bg-black/24 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white/82">{event.message}</p>
                <StatusPill label={event.level} tone={event.level === "error" ? "warning" : "inverse"} />
              </div>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/36">
                {event.stage}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function getStartButtonLabel({
  currentSync,
  isBusy,
  state
}: {
  currentSync: LibrarySyncSummary | null;
  isBusy: boolean;
  state: SyncActionState;
}) {
  if (isBusy) {
    return "Queueing...";
  }

  if (state === "queued" || currentSync?.status === "queued") {
    return "Sync queued";
  }

  if (currentSync?.status === "syncing" || currentSync?.status === "normalizing") {
    return "Sync running";
  }

  return "Start background sync";
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/24 p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-white/54">{label}</p>
    </div>
  );
}
