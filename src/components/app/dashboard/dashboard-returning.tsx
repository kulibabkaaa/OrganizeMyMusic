import React from "react";
import Link from "next/link";

import { ActiveSortsCard } from "@/components/app/dashboard/active-sorts-card";
import { LibraryStatusCard } from "@/components/app/dashboard/library-status-card";
import { RecentActivityCard } from "@/components/app/dashboard/recent-activity-card";
import { RecentSortCard } from "@/components/app/dashboard/recent-sort-card";
import { Button } from "@/components/ui/button";
import type { DashboardActivityItem } from "@/modules/activity/list-activity";
import type { LibrarySyncSummary } from "@/modules/library-syncs/queue";
import { getActiveSortCounts, type RecentSortRunSummary } from "@/modules/sorts/list-sort-runs";

export function DashboardReturning({
  latestSync,
  recentSorts,
  activities
}: {
  latestSync: LibrarySyncSummary | null;
  recentSorts: RecentSortRunSummary[];
  activities: DashboardActivityItem[];
}) {
  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-platform-muted">
            Library ready
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-[0em] text-white md:text-4xl">
            Your music workspace
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-platform-secondary">
            Manage saved playlists, recipes, library sync, organization work, and Apple Music exports.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Link href="/app/sorts/new" className="inline-flex">
            <Button className="min-w-44">Organize My Library</Button>
          </Link>
          <Link href="/app/playlists/new" className="inline-flex">
            <Button variant="glass" className="min-w-40">Create Playlist</Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <LibraryStatusCard latestSync={latestSync} />
        <ActiveSortsCard counts={getActiveSortCounts(recentSorts)} />
        <RecentActivityCard activities={activities} />
      </section>

      <section>
        <div className="mb-4">
          <h3 className="font-display text-2xl font-semibold tracking-[0em] text-white">
            Recent Organization Work
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-platform-secondary">
            Sorts are full-library projects. Use them for initial organization or major restructuring.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {recentSorts.map((sort) => (
            <RecentSortCard key={sort.id} sort={sort} />
          ))}
        </div>
      </section>
    </div>
  );
}
