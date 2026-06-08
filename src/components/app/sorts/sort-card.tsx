import React from "react";
import Link from "next/link";
import type { Route } from "next";

import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type { RecentSortRunSummary } from "@/modules/sorts/list-sort-runs";

export function SortCard({ sort }: { sort: RecentSortRunSummary }) {
  return (
    <Link
      href={sort.primaryRoute as Route}
      className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-platform-pink"
      aria-label={`${sort.title}: ${sort.nextActionLabel}`}
    >
      <Card
        as="article"
        className="flex min-h-64 flex-col transition group-hover:border-white/20 group-hover:bg-white/[0.08]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusPill label={formatSortStatus(sort.uiStatus)} tone={getSortTone(sort.uiStatus)} />
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-platform-muted">
            {sort.provider}
          </span>
        </div>

        <div className="mt-5 flex-1">
          <h2 className="font-display text-2xl font-semibold tracking-[0em] text-white">
            {sort.title}
          </h2>
          <dl className="mt-4 grid gap-3 text-sm text-platform-secondary">
            <div className="flex items-center justify-between gap-4">
              <dt>Recipes</dt>
              <dd className="font-semibold text-white">{sort.recipeCount} Playlist Recipes</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Output</dt>
              <dd className="font-semibold text-white">
                {sort.playlistCount} generated {sort.playlistCount === 1 ? "playlist" : "playlists"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Updated</dt>
              <dd className="font-semibold text-white">{formatDate(sort.updatedAt)}</dd>
            </div>
          </dl>
        </div>

        <p className="mt-6 text-sm font-semibold text-white">{sort.nextActionLabel}</p>
      </Card>
    </Link>
  );
}

function formatSortStatus(status: RecentSortRunSummary["uiStatus"]) {
  const words = status.split("_");
  return words
    .map((part, index) =>
      index === 0 ? `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}` : part
    )
    .join(" ");
}

function getSortTone(status: RecentSortRunSummary["uiStatus"]) {
  if (status === "failed") {
    return "danger" as const;
  }

  if (["ready_for_review", "exported"].includes(status)) {
    return "success" as const;
  }

  if (["processing", "preview_generating", "exporting", "organizing"].includes(status)) {
    return "pink" as const;
  }

  return "warning" as const;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
