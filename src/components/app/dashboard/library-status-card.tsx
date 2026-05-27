import React from "react";

import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type { LibrarySyncSummary } from "@/modules/library-syncs/queue";

export function LibraryStatusCard({ latestSync }: { latestSync: LibrarySyncSummary | null }) {
  return (
    <Card as="article" className="min-h-48">
      <StatusPill
        label={latestSync?.status === "completed" ? "Apple Music connected" : "Library pending"}
        tone={latestSync?.status === "completed" ? "success" : "warning"}
      />
      <h3 className="mt-4 font-display text-2xl font-semibold tracking-[0em] text-white">
        Library Status
      </h3>
      <p className="mt-3 text-sm leading-7 text-platform-secondary">
        <strong className="font-mono text-2xl text-white">
          {(latestSync?.normalizedTrackCount ?? 0).toLocaleString("en-US")}
        </strong>{" "}
        songs indexed
      </p>
      {latestSync ? (
        <p className="mt-2 text-sm leading-6 text-platform-secondary">
          Last synced {formatDateTime(latestSync.updatedAt)}
        </p>
      ) : (
        <p className="mt-2 text-sm leading-6 text-platform-secondary">No completed sync yet.</p>
      )}
    </Card>
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
