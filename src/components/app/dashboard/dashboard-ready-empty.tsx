import React from "react";
import Link from "next/link";

import { ActiveSortsCard } from "@/components/app/dashboard/active-sorts-card";
import { LibraryStatusCard } from "@/components/app/dashboard/library-status-card";
import { RecentActivityCard } from "@/components/app/dashboard/recent-activity-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { LibrarySyncSummary } from "@/modules/library-syncs/queue";

export function DashboardReadyEmpty({ latestSync }: { latestSync: LibrarySyncSummary | null }) {
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
            Build playlists by mood, genre, language, era, region, or custom rules.
          </p>
        </div>
        <Link href="/app/sorts/new" className="inline-flex">
          <Button className="min-w-44">Create a Sort</Button>
        </Link>
      </section>

      <Card elevated className="grid gap-5 p-7 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-[0em] text-white">
            Create your first Sort
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-platform-secondary">
            Build playlists by mood, genre, language, era, region, or custom rules.
          </p>
        </div>
        <Link href="/app/sorts/new" className="inline-flex">
          <Button variant="glass" className="min-w-44">
            Create a Sort
          </Button>
        </Link>
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
        <LibraryStatusCard latestSync={latestSync} />
        <ActiveSortsCard counts={{ draft: 0, processing: 0, readyForReview: 0 }} />
        <RecentActivityCard activities={[]} />
      </section>

      <EmptyState
        title="Recent Sorts"
        description="No Sorts yet."
        action={
          <Link href="/app/sorts/new" className="inline-flex">
            <Button variant="glass">Create a Sort</Button>
          </Link>
        }
      />
    </div>
  );
}
