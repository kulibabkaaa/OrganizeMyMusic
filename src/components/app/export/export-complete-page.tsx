import React from "react";

import { WorkflowEscapeActions } from "@/components/app/workflow-escape-actions";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import {
  summarizeExportTotals,
  type SortExportSummary
} from "@/modules/sorts/export-progress";

export function ExportCompletePage({ summary }: { summary: SortExportSummary }) {
  const totals = summarizeExportTotals(summary);

  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-platform-muted">
            Export complete
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[0em] text-white md:text-4xl">
            Playlists created in Apple Music
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-platform-secondary">
            Your reviewed playlists were created in Apple Music. Nothing else in your library was modified.
          </p>
        </div>
        <StatusPill label="Exported" tone="success" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <Metric label="Playlists" value={`${totals.createdPlaylistCount} playlists created`} />
            <Metric label="Tracks" value={`${totals.totalTrackCount} tracks exported`} />
            <Metric label="Export timestamp" value={formatDate(summary.updatedAt)} />
          </div>
          <div className="grid gap-3">
            {summary.playlists.map((playlist) => (
              <article
                key={playlist.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
              >
                <div>
                  <h2 className="text-sm font-semibold text-white">{playlist.title}</h2>
                  <p className="mt-1 text-xs text-platform-secondary">
                    {playlist.trackCount} {playlist.trackCount === 1 ? "track" : "tracks"}
                  </p>
                </div>
                {playlist.appleMusicUrl ? (
                  <a
                    href={playlist.appleMusicUrl}
                    className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/[0.14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink"
                  >
                    Open Apple Music
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        </Card>

        <Card elevated className="space-y-5 self-start">
          <StatusPill label="Apple Music" tone="success" />
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-[0em] text-white">
              {summary.sortName}
            </h2>
            <p className="mt-2 text-sm leading-7 text-platform-secondary">
              Keep this Sort for reference or start another cleanup from the dashboard.
            </p>
          </div>
          <WorkflowEscapeActions />
        </Card>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-platform-muted">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
