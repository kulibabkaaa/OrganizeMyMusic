import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ActiveSortsCard } from "@/components/app/dashboard/active-sorts-card";
import { DashboardReadyEmpty } from "@/components/app/dashboard/dashboard-ready-empty";
import { DashboardReturning } from "@/components/app/dashboard/dashboard-returning";
import { LibraryStatusCard } from "@/components/app/dashboard/library-status-card";
import { PlatformQueuesCard } from "@/components/app/dashboard/platform-queues-card";
import { RecentSortCard } from "@/components/app/dashboard/recent-sort-card";
import {
  getActiveSortCounts,
  summarizeRecentSortRun,
  type RecentSortRunSummary
} from "@/modules/sorts/list-sort-runs";

const completedSync = {
  id: "sync_1",
  userId: "user_1",
  status: "completed" as const,
  rawTrackCount: 19960,
  normalizedTrackCount: 19640,
  duplicateCount: 320,
  errorSummary: null,
  createdAt: "2026-05-26T08:00:00.000Z",
  updatedAt: "2026-05-26T10:42:00.000Z"
};

const recentSorts: RecentSortRunSummary[] = [
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
    id: "sort_review",
    title: "My Apple Music cleanup",
    uiStatus: "ready_for_review",
    state: "paid",
    paymentStatus: "paid",
    provider: "Apple Music",
    recipeCount: 5,
    playlistCount: 5,
    updatedAt: "2026-05-26T10:30:00.000Z",
    primaryRoute: "/app/sorts/sort_review/review",
    nextActionLabel: "Review playlists"
  }
];

describe("dashboard ready states", () => {
  it("renders the first-time ready dashboard without recent sort cards", () => {
    const markup = renderToStaticMarkup(<DashboardReadyEmpty latestSync={completedSync} />);

    expect(markup).toContain("Your music workspace");
    expect(markup).toContain("Organize your library first");
    expect(markup).toContain("Organize My Library");
    expect(markup).toContain("Create Playlist");
    expect(markup).toContain("Library Status");
    expect(markup).toContain("Active Sorts");
    expect(markup).toContain("Recent Activity");
    expect(markup).toContain("Saved Playlists");
    expect(markup).toContain("Your app-created playlists will appear here");
    expect(markup).not.toContain("Road trip cleanup");
  });

  it("renders returning dashboard cards and recent sort next actions", () => {
    const markup = renderToStaticMarkup(
      <DashboardReturning latestSync={completedSync} recentSorts={recentSorts} activities={[]} />
    );

    expect(markup).toContain("Library Status");
    expect(markup).toContain("Active Sorts");
    expect(markup).toContain("Recent Activity");
    expect(markup).toContain("Recent Organization Work");
    expect(markup).toContain("Road trip cleanup");
    expect(markup).toContain("Continue editing");
    expect(markup).toContain("/app/sorts/sort_draft/builder");
    expect(markup).toContain("My Apple Music cleanup");
    expect(markup).toContain("Review playlists");
    expect(markup).toContain("/app/sorts/sort_review/review");
  });

  it("renders reusable library, active sort, and recent sort cards", () => {
    const markup = renderToStaticMarkup(
      <div>
        <LibraryStatusCard latestSync={completedSync} />
        <ActiveSortsCard counts={getActiveSortCounts(recentSorts)} />
        <RecentSortCard sort={recentSorts[0]} />
      </div>
    );

    expect(markup).toContain("19,640");
    expect(markup).toContain("songs indexed");
    expect(markup).toContain("Draft");
    expect(markup).toContain("Ready for review");
    expect(markup).toContain("Apple Music");
    expect(markup).toContain("3 Playlist Recipes");
  });

  it("renders actionable platform queues for saved playlists, review, and new music", () => {
    const markup = renderToStaticMarkup(
      <PlatformQueuesCard
        playlists={[
          {
            id: "playlist_1",
            userId: "user_1",
            sourceProvider: "apple_music",
            name: "Ukrainian Rap",
            description: "High-energy Ukrainian rap.",
            status: "active",
            applePlaylistId: null,
            createdFromSortRunId: "sort_1",
            latestLibrarySyncId: "sync_2",
            lastProcessedNewMusicSyncId: null,
            lastGeneratedAt: "2026-06-08T10:00:00.000Z",
            lastExportedAt: null,
            createdAt: "2026-06-08T09:00:00.000Z",
            updatedAt: "2026-06-08T10:00:00.000Z",
            archivedAt: null
          }
        ]}
        reviewQueueCount={2}
        newMusicSummary={{
          latestSyncId: "sync_2",
          previousSyncId: "sync_1",
          newTrackCount: 4,
          canProcess: true,
          message: "4 new songs detected since the previous sync."
        }}
      />
    );

    expect(markup).toContain("Saved playlists and queues");
    expect(markup).toContain("Review Tracks");
    expect(markup).toContain("Process New Music");
    expect(markup).toContain("/app/playlists");
    expect(markup).toContain("/app/library");
  });
});

describe("recent sort summaries", () => {
  it("derives title, status, route, provider, recipe count, and next action", () => {
    const summary = summarizeRecentSortRun({
      sortRun: {
        id: "sort_1",
        state: "completed",
        payment_status: "paid",
        preview_snapshot: { generatedAt: "2026-05-26T10:00:00.000Z" },
        updated_at: "2026-05-26T10:42:00.000Z"
      },
      playlistRequests: [
        {
          parsed_rules: {
            title: "Night music system"
          }
        },
        {
          parsed_rules: {
            title: "Late night songs"
          }
        }
      ],
      playlists: [
        {
          id: "playlist_1",
          title: "Night music system",
          apple_playlist_id: "apple_playlist_1"
        }
      ]
    });

    expect(summary).toEqual({
      id: "sort_1",
      title: "Night music system",
      uiStatus: "exported",
      state: "completed",
      paymentStatus: "paid",
      provider: "Apple Music",
      recipeCount: 2,
      playlistCount: 1,
      updatedAt: "2026-05-26T10:42:00.000Z",
      primaryRoute: "/app/sorts/sort_1/complete",
      nextActionLabel: "View export"
    });
  });
});
