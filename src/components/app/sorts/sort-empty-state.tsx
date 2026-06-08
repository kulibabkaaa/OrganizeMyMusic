import React from "react";
import Link from "next/link";
import type { Route } from "next";

import { EmptyState } from "@/components/ui/empty-state";
import type { SortIndexFilter } from "@/modules/sorts/list-sort-runs";

const emptyStateByFilter: Record<
  SortIndexFilter,
  {
    title: string;
    description: string;
    actionHref: string;
    actionLabel: string;
  }
> = {
  all: {
    title: "No Sorts yet.",
    description:
      "Create a Sort when your Apple Music library is ready. Drafts, previews, reviews, and exports will appear here.",
    actionHref: "/app/sorts/new",
    actionLabel: "Create a Sort"
  },
  draft: {
    title: "No draft Sorts.",
    description:
      "Drafts appear here when you start building Playlist plans before previewing or starting a full Sort.",
    actionHref: "/app/sorts/new",
    actionLabel: "Create a Sort"
  },
  processing: {
    title: "No Sorts are processing.",
    description:
      "Processing Sorts appear here after you start a full Sort and the playlist build is running.",
    actionHref: "/app/sorts",
    actionLabel: "View all Sorts"
  },
  ready_for_review: {
    title: "No Sorts are ready for review.",
    description:
      "Generated playlists will appear here only after processing finishes. Apple Music export still waits for explicit review.",
    actionHref: "/app/sorts?status=processing",
    actionLabel: "View processing Sorts"
  },
  exported: {
    title: "No exported Sorts yet.",
    description:
      "Completed exports appear here after you review generated playlists and explicitly create them in Apple Music.",
    actionHref: "/app/sorts?status=ready_for_review",
    actionLabel: "View review queue"
  },
  failed: {
    title: "No failed Sorts.",
    description:
      "Sorts that need attention will appear here with a recovery path. There are no failed Sorts right now.",
    actionHref: "/app/sorts",
    actionLabel: "View all Sorts"
  }
};

export function SortEmptyState({ filter = "all" }: { filter?: SortIndexFilter }) {
  const emptyState = emptyStateByFilter[filter];

  return (
    <EmptyState
      title={emptyState.title}
      description={emptyState.description}
      action={
        <Link
          href={emptyState.actionHref as Route}
          className="inline-flex min-w-44 items-center justify-center rounded-full bg-accent-sweep px-5 py-3 text-sm font-semibold text-white shadow-pulse transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink"
        >
          {emptyState.actionLabel}
        </Link>
      }
    />
  );
}
