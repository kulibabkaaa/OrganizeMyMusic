import React from "react";
import Link from "next/link";

import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import type { PlaylistCardGenerationSummary } from "@/modules/playlists/latest-generation-summaries";
import type { PersistentPlaylist, PlaylistStatus } from "@/types/domain";

export type PlaylistsPageFocus = "all" | "review";

export function PlaylistsPage({
  playlists,
  generationSummariesByPlaylistId = {},
  focus = "all"
}: {
  playlists: PersistentPlaylist[];
  generationSummariesByPlaylistId?: Record<string, PlaylistCardGenerationSummary | undefined>;
  focus?: PlaylistsPageFocus;
}) {
  const visiblePlaylists = filterPlaylistsByFocus(
    playlists,
    generationSummariesByPlaylistId,
    focus
  );

  return (
    <AppShell
      title="Playlists"
      subtitle="Saved app-created playlists with recipes, generated track proposals, review, and Apple Music export."
    >
      <section className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-[0em] text-white md:text-4xl">
            Your playlist workspace
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-platform-secondary">
            Create or open a playlist, tune its recipe, review proposed tracks, then export
            approved tracks to Apple Music.
          </p>
        </div>
        <Link href="/app/playlists/new" className="inline-flex">
          <Button className="min-w-40">Create Playlist</Button>
        </Link>
      </section>

      <section className="mt-6">
        {focus === "review" ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-white/10 bg-black/16 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Review queue</p>
              <p className="mt-1 text-sm leading-6 text-platform-secondary">
                Showing saved playlists with proposed tracks waiting for review.
              </p>
            </div>
            <Link href="/app/playlists" className="inline-flex">
              <Button variant="glass" className="min-w-32">Show All</Button>
            </Link>
          </div>
        ) : null}

        {visiblePlaylists.length === 0 ? (
          <EmptyState
            title={focus === "review" ? "No playlists need review" : "No saved playlists yet"}
            description={
              focus === "review"
                ? "Generated playlists that need track review will appear here."
                : "Create a playlist idea, add a recipe, generate proposed tracks, then review the result before export."
            }
            action={
              <Link href="/app/playlists/new" className="inline-flex">
                <Button variant="glass">Create Playlist</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visiblePlaylists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                generationSummary={generationSummariesByPlaylistId[playlist.id]}
              />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

export function parsePlaylistsPageFocus(value: string | string[] | undefined): PlaylistsPageFocus {
  const rawValue = Array.isArray(value) ? value[0] : value;
  return rawValue === "review" ? "review" : "all";
}

function filterPlaylistsByFocus(
  playlists: PersistentPlaylist[],
  generationSummariesByPlaylistId: Record<string, PlaylistCardGenerationSummary | undefined>,
  focus: PlaylistsPageFocus
) {
  if (focus !== "review") {
    return playlists;
  }

  return playlists.filter(
    (playlist) => generationSummariesByPlaylistId[playlist.id]?.status === "ready_for_review"
  );
}

function PlaylistCard({
  playlist,
  generationSummary
}: {
  playlist: PersistentPlaylist;
  generationSummary?: PlaylistCardGenerationSummary;
}) {
  const reviewState = getReviewState(generationSummary);

  return (
    <Card as="article" className="min-h-64">
      <div className="flex items-start justify-between gap-3">
        <StatusPill label={formatStatus(playlist.status)} tone={getStatusTone(playlist.status)} />
        <StatusPill label={reviewState.label} tone={reviewState.tone} />
      </div>
      <h3 className="mt-4 break-words font-display text-2xl font-semibold tracking-[0em] text-white">
        {playlist.name}
      </h3>
      <p className="mt-2 min-h-14 text-sm leading-7 text-platform-secondary">
        {playlist.description ?? "No description yet."}
      </p>
      <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-black/16 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-platform-muted">
              Latest generation
            </p>
            <p className="mt-2 text-sm font-medium text-white">{reviewState.detail}</p>
          </div>
          <span className="text-right text-sm text-platform-secondary">
            {formatTrackCount(generationSummary?.trackCount)}
          </span>
        </div>
      </div>
      <dl className="mt-5 grid gap-3 text-sm text-platform-secondary">
        <MetaRow label="Last generated" value={formatDate(playlist.lastGeneratedAt)} />
        <MetaRow label="Last exported" value={formatDate(playlist.lastExportedAt)} />
      </dl>
      <Link href={`/app/playlists/${playlist.id}`} className="mt-5 inline-flex">
        <Button variant="glass" className="min-w-32">
          Open
        </Button>
      </Link>
    </Card>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt>{label}</dt>
      <dd className="text-right text-white">{value}</dd>
    </div>
  );
}

function getStatusTone(status: PlaylistStatus) {
  if (status === "active") return "success";
  if (status === "archived") return "muted";
  return "pink";
}

function getReviewState(summary?: PlaylistCardGenerationSummary): {
  label: string;
  detail: string;
  tone: React.ComponentProps<typeof StatusPill>["tone"];
} {
  if (!summary) {
    return {
      label: "Recipe needed",
      detail: "Generate this playlist to create a review queue.",
      tone: "muted"
    };
  }

  if (summary.status === "ready_for_review") {
    return {
      label: "Review needed",
      detail: "Proposed tracks are waiting for review.",
      tone: "warning"
    };
  }

  if (summary.status === "reviewed") {
    return {
      label: "Ready to export",
      detail: "Reviewed tracks can be exported to Apple Music.",
      tone: "pink"
    };
  }

  if (summary.status === "exporting") {
    return {
      label: "Exporting",
      detail: "Apple Music export is queued or running.",
      tone: "warning"
    };
  }

  if (summary.status === "exported") {
    return {
      label: "Exported",
      detail: "Approved tracks were sent to Apple Music.",
      tone: "success"
    };
  }

  if (summary.status === "failed") {
    return {
      label: "Needs attention",
      detail: "Generation or export failed. Open the playlist to retry.",
      tone: "danger"
    };
  }

  return {
    label: "Generating",
    detail: "Proposed tracks are being generated.",
    tone: "warning"
  };
}

function formatTrackCount(value: number | null | undefined) {
  if (value == null) {
    return "No tracks";
  }

  return `${value} ${value === 1 ? "track" : "tracks"}`;
}

function formatStatus(status: PlaylistStatus) {
  return status.replaceAll("_", " ");
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
