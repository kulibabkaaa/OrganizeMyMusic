import React from "react";

import { AppleMusicConnectAction } from "@/components/app/apple-music-connect-action";
import { StartLibrarySyncButton } from "@/components/app/start-library-sync-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type {
  AppleMusicConnectionSummary,
  LibrarySyncSummary
} from "@/modules/library-syncs/queue";

export function AppleMusicLibraryCard({
  appleMusicConnection,
  latestSync
}: {
  appleMusicConnection: AppleMusicConnectionSummary | null;
  latestSync: LibrarySyncSummary | null;
}) {
  const isConnected = appleMusicConnection?.status === "connected";

  return (
    <Card as="article" elevated className="min-h-64">
      <StatusPill label={isConnected ? "Connected" : "Not connected"} tone={isConnected ? "success" : "warning"} />
      <h3 className="mt-5 font-display text-2xl font-semibold tracking-[0em] text-white">
        Apple Music
      </h3>
      <p className="mt-3 text-sm leading-7 text-platform-secondary">
        Account status: {isConnected ? "active" : "not connected"}
      </p>
      {appleMusicConnection?.storefront ? (
        <p className="mt-1 text-sm leading-6 text-platform-secondary">
          Storefront: {appleMusicConnection.storefront.toUpperCase()}
        </p>
      ) : null}
      <p className="mt-3 text-sm leading-7 text-platform-secondary">
        {latestSync?.status === "completed"
          ? `Last successful sync ${formatDateTime(latestSync.updatedAt)}`
          : "No successful sync yet."}
      </p>
      <dl className="mt-5 grid gap-3">
        <StatusRow label="Latest status" value={formatSyncStatus(latestSync)} />
        <StatusRow label="Tracks read" value={formatNumber(latestSync?.rawTrackCount ?? 0)} />
        <StatusRow label="Songs indexed" value={formatNumber(latestSync?.normalizedTrackCount ?? 0)} />
        {latestSync?.errorSummary ? (
          <div className="rounded-2xl border border-[rgba(255,77,109,0.35)] bg-[rgba(255,77,109,0.10)] px-4 py-3">
            <dt className="text-xs uppercase tracking-[0.16em] text-platform-danger">
              Last error
            </dt>
            <dd className="mt-2 text-sm leading-6 text-white">{latestSync.errorSummary}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-6 flex flex-wrap items-start gap-3">
        {isConnected ? (
          <>
            <StartLibrarySyncButton latestSync={latestSync} />
            <AppleMusicConnectAction label="Reconnect" variant="glass" />
            <div>
              <Button
                disabled
                variant="ghost"
                className="min-w-32"
                aria-describedby="apple-music-disconnect-disabled-reason"
              >
                Disconnect
              </Button>
              <p
                id="apple-music-disconnect-disabled-reason"
                className="mt-2 max-w-48 text-xs leading-5 text-platform-secondary"
              >
                Disconnect is paused for MVP safety.
              </p>
            </div>
          </>
        ) : (
          <AppleMusicConnectAction />
        )}
      </div>
    </Card>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <dt className="text-xs uppercase tracking-[0.16em] text-platform-muted">{label}</dt>
      <dd className="text-sm font-semibold text-white">{value}</dd>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatSyncStatus(sync: LibrarySyncSummary | null) {
  if (!sync) {
    return "Not started";
  }

  if (sync.status === "queued") {
    return "Sync queued";
  }

  if (sync.status === "syncing" || sync.status === "normalizing") {
    return "Sync running";
  }

  if (sync.status === "failed") {
    return "Sync failed";
  }

  return "Sync complete";
}
