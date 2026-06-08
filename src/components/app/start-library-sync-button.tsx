"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { LibrarySyncSummary } from "@/modules/library-syncs/queue";

type StartSyncResponse = {
  error?: string;
  syncId?: string;
  status?: string;
};

type ActionState = "idle" | "queueing" | "queued" | "error";
type LatestSyncResponse = {
  error?: string;
  sync?: LibrarySyncSummary | null;
};

const ACTIVE_SYNC_STATUSES = new Set<LibrarySyncSummary["status"]>([
  "queued",
  "syncing",
  "normalizing"
]);
const SYNC_POLL_INTERVAL_MS = 3000;

export function StartLibrarySyncButton({
  latestSync = null,
  label
}: {
  latestSync?: LibrarySyncSummary | null;
  label?: string;
}) {
  const router = useRouter();
  const [currentSync, setCurrentSync] = useState<LibrarySyncSummary | null>(latestSync);
  const [message, setMessage] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [isPending, startTransition] = useTransition();
  const isFailed = currentSync?.status === "failed";
  const isActive = currentSync
    ? ACTIVE_SYNC_STATUSES.has(currentSync.status)
    : actionState === "queued";
  const isQueueing = isPending || actionState === "queueing";

  useEffect(() => {
    setCurrentSync(latestSync);
  }, [latestSync]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let isCancelled = false;

    async function refreshSyncStatus() {
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

        if (payload.sync?.status === "completed") {
          setActionState("idle");
          setMessage("Library sync complete.");
          router.refresh();
        }

        if (payload.sync?.status === "failed") {
          setActionState("error");
          setMessage(payload.sync.errorSummary ?? "Library sync failed.");
          router.refresh();
        }
      } catch (error) {
        if (!isCancelled) {
          setMessage(error instanceof Error ? error.message : "Unable to refresh sync status.");
        }
      }
    }

    void refreshSyncStatus();
    const intervalId = window.setInterval(refreshSyncStatus, SYNC_POLL_INTERVAL_MS);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isActive, router]);

  function queueSync() {
    setActionState("queueing");
    setMessage(isFailed ? "Queueing sync retry..." : "Queueing background sync...");

    startTransition(async () => {
      try {
        const response = await fetch(
          isFailed && currentSync ? `/api/library-syncs/${currentSync.id}/retry` : "/api/library-syncs",
          { method: "POST" }
        );
        const payload = (await response.json()) as StartSyncResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to start library sync.");
        }

        setActionState("queued");
        setCurrentSync((sync) =>
          sync
            ? {
                ...sync,
                status: "queued"
              }
            : sync
        );
        setMessage("Sync queued. You can leave this page and return for status.");
        router.refresh();
      } catch (error) {
        setActionState("error");
        setMessage(error instanceof Error ? error.message : "Unable to start library sync.");
      }
    });
  }

  function refreshStatus() {
    setMessage("Refreshing sync status...");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-start gap-3">
      <Button disabled={isQueueing || isActive} onClick={queueSync} className="min-w-44">
        {getSyncActionLabel({ latestSync: currentSync, actionState, label })}
      </Button>
      <Button variant="glass" onClick={refreshStatus} className="min-w-36">
        Refresh status
      </Button>
      {isActive ? (
        <p className="basis-full text-sm leading-6 text-platform-secondary" aria-live="polite">
          Sync status auto-refreshes every {Math.round(SYNC_POLL_INTERVAL_MS / 1000)} seconds.
        </p>
      ) : null}
      {message ? (
        <p className="basis-full text-sm leading-6 text-platform-secondary" aria-live="polite">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function getSyncActionLabel({
  latestSync,
  actionState,
  label
}: {
  latestSync: LibrarySyncSummary | null;
  actionState: ActionState;
  label?: string;
}) {
  if (actionState === "queueing") {
    return "Queueing...";
  }

  if (actionState === "queued" || latestSync?.status === "queued") {
    return "Sync queued";
  }

  if (latestSync?.status === "syncing" || latestSync?.status === "normalizing") {
    return "Sync running";
  }

  if (latestSync?.status === "failed") {
    return "Retry sync";
  }

  return label ?? "Start background sync";
}
