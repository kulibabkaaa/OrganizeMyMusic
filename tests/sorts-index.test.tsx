import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SortCard } from "@/components/app/sorts/sort-card";
import { SortEmptyState } from "@/components/app/sorts/sort-empty-state";
import { SortsIndex, type SortIndexFilter } from "@/components/app/sorts/sorts-index";
import {
  filterSortsForIndex,
  getSortIndexFilterCounts,
  type RecentSortRunSummary
} from "@/modules/sorts/list-sort-runs";

const sorts: RecentSortRunSummary[] = [
  {
    id: "sort_draft",
    title: "Road trip cleanup",
    uiStatus: "draft",
    state: "draft",
    paymentStatus: "pending",
    provider: "Apple Music",
    recipeCount: 3,
    playlistCount: 0,
    updatedAt: "2026-05-26T10:40:00.000Z",
    primaryRoute: "/app/sorts/sort_draft/builder",
    nextActionLabel: "Continue editing"
  },
  {
    id: "sort_processing",
    title: "Night music system",
    uiStatus: "processing",
    state: "paid",
    paymentStatus: "paid",
    provider: "Apple Music",
    recipeCount: 4,
    playlistCount: 0,
    updatedAt: "2026-05-26T10:30:00.000Z",
    primaryRoute: "/app/sorts/sort_processing/processing",
    nextActionLabel: "View progress"
  },
  {
    id: "sort_review",
    title: "My Apple Music cleanup",
    uiStatus: "ready_for_review",
    state: "paid",
    paymentStatus: "paid",
    provider: "Apple Music",
    recipeCount: 5,
    playlistCount: 5,
    updatedAt: "2026-05-26T10:20:00.000Z",
    primaryRoute: "/app/sorts/sort_review/review",
    nextActionLabel: "Review playlists"
  },
  {
    id: "sort_exported",
    title: "Spanish pop reset",
    uiStatus: "exported",
    state: "completed",
    paymentStatus: "paid",
    provider: "Apple Music",
    recipeCount: 2,
    playlistCount: 2,
    updatedAt: "2026-05-26T10:10:00.000Z",
    primaryRoute: "/app/sorts/sort_exported/complete",
    nextActionLabel: "View export"
  },
  {
    id: "sort_failed",
    title: "Indie commute",
    uiStatus: "failed",
    state: "failed",
    paymentStatus: "pending",
    provider: "Apple Music",
    recipeCount: 1,
    playlistCount: 0,
    updatedAt: "2026-05-26T10:00:00.000Z",
    primaryRoute: "/app/sorts/sort_failed/review",
    nextActionLabel: "View issue / Retry"
  }
];

describe("Sorts index helpers", () => {
  it("filters Sorts into the roadmap tabs", () => {
    expect(filterSortsForIndex(sorts, "all").map((sort) => sort.id)).toEqual([
      "sort_draft",
      "sort_processing",
      "sort_review",
      "sort_exported",
      "sort_failed"
    ]);
    expect(filterSortsForIndex(sorts, "draft").map((sort) => sort.id)).toEqual([
      "sort_draft"
    ]);
    expect(filterSortsForIndex(sorts, "processing").map((sort) => sort.id)).toEqual([
      "sort_processing"
    ]);
    expect(filterSortsForIndex(sorts, "ready_for_review").map((sort) => sort.id)).toEqual([
      "sort_review"
    ]);
    expect(filterSortsForIndex(sorts, "exported").map((sort) => sort.id)).toEqual([
      "sort_exported"
    ]);
    expect(filterSortsForIndex(sorts, "failed").map((sort) => sort.id)).toEqual([
      "sort_failed"
    ]);
  });

  it("counts Sorts for each index tab", () => {
    expect(getSortIndexFilterCounts(sorts)).toEqual({
      all: 5,
      draft: 1,
      processing: 1,
      ready_for_review: 1,
      exported: 1,
      failed: 1
    });
  });
});

describe("Sorts index UI", () => {
  it("renders an empty state with an Organize My Library action", () => {
    const markup = renderToStaticMarkup(<SortEmptyState />);

    expect(markup).toContain("No Sorts yet.");
    expect(markup).toContain("Organize My Library");
    expect(markup).not.toContain("Create a Sort");
    expect(markup).toContain("/app/sorts/new");
  });

  it("renders status-specific empty states for each filtered tab", () => {
    const expectations: Array<{
      filter: SortIndexFilter;
      title: string;
      description: string;
      action: string;
      href: string;
    }> = [
      {
        filter: "draft",
        title: "No draft Sorts.",
        description: "Drafts appear here when you start building Playlist plans",
        action: "Organize My Library",
        href: "/app/sorts/new"
      },
      {
        filter: "processing",
        title: "No Sorts are processing.",
        description: "Processing Sorts appear here after you start full organization",
        action: "View all Sorts",
        href: "/app/sorts"
      },
      {
        filter: "ready_for_review",
        title: "No Sorts are ready for review.",
        description: "Generated playlists will appear here only after processing finishes",
        action: "View processing Sorts",
        href: "/app/sorts?status=processing"
      },
      {
        filter: "failed",
        title: "No failed Sorts.",
        description: "Sorts that need attention will appear here",
        action: "View all Sorts",
        href: "/app/sorts"
      },
      {
        filter: "exported",
        title: "No exported Sorts yet.",
        description: "Completed exports appear here after you review generated playlists",
        action: "View review queue",
        href: "/app/sorts?status=ready_for_review"
      }
    ];

    for (const expectation of expectations) {
      const markup = renderToStaticMarkup(
        <SortsIndex sorts={[]} selectedFilter={expectation.filter} />
      );

      expect(markup).toContain(expectation.title);
      expect(markup).toContain(expectation.description);
      expect(markup).toContain(expectation.action);
      expect(markup).toContain(expectation.href.replaceAll("&", "&amp;"));
      expect(markup).not.toContain("No Sorts yet.");
    }
  });

  it("renders mixed Sort statuses, filters, counts, and status-aware links", () => {
    const markup = renderToStaticMarkup(<SortsIndex sorts={sorts} selectedFilter="all" />);

    expect(markup).toContain("All");
    expect(markup).toContain("Draft");
    expect(markup).toContain("/app/sorts?status=draft");
    expect(markup).toContain("Processing");
    expect(markup).toContain("Ready for review");
    expect(markup).toContain("Exported");
    expect(markup).toContain("Failed");
    expect(markup).toContain("Organize My Library");
    expect(markup).not.toContain("Create a Sort");
    expect(markup).toContain("Road trip cleanup");
    expect(markup).toContain("Night music system");
    expect(markup).toContain("My Apple Music cleanup");
    expect(markup).toContain("Spanish pop reset");
    expect(markup).toContain("Indie commute");
    expect(markup).toContain("/app/sorts/sort_draft/builder");
    expect(markup).toContain("/app/sorts/sort_processing/processing");
    expect(markup).toContain("/app/sorts/sort_review/review");
    expect(markup).toContain("/app/sorts/sort_exported/complete");
    expect(markup).toContain("/app/sorts/sort_failed/review");
  });

  it("renders the selected tab subset", () => {
    const markup = renderToStaticMarkup(
      <SortsIndex sorts={sorts} selectedFilter={"ready_for_review" satisfies SortIndexFilter} />
    );

    expect(markup).toContain("My Apple Music cleanup");
    expect(markup).not.toContain("Road trip cleanup");
    expect(markup).not.toContain("Spanish pop reset");
  });

  it("renders each Sort card with provider, counts, status, and next action", () => {
    const markup = renderToStaticMarkup(<SortCard sort={sorts[2]} />);

    expect(markup).toContain("My Apple Music cleanup");
    expect(markup).toContain("Ready for review");
    expect(markup).toContain("Apple Music");
    expect(markup).toContain("5 Playlist Recipes");
    expect(markup).toContain("5 generated playlists");
    expect(markup).toContain("Review playlists");
    expect(markup).toContain("/app/sorts/sort_review/review");
  });
});
