import { describe, expect, it } from "vitest";

import { listDashboardActivity } from "@/modules/activity/list-activity";
import type { LibrarySyncSummary } from "@/modules/library-syncs/queue";
import type { RecentSortRunSummary } from "@/modules/sorts/list-sort-runs";

const failedSync: LibrarySyncSummary = {
  id: "sync_1",
  userId: "user_1",
  status: "failed",
  rawTrackCount: 0,
  normalizedTrackCount: 0,
  duplicateCount: 0,
  errorSummary: "raw-music-user-token failed while reading First Song.",
  createdAt: "2026-05-27T10:00:00.000Z",
  updatedAt: "2026-05-27T10:01:00.000Z"
};

const failedSort: RecentSortRunSummary = {
  id: "sort_1",
  title: "Kitchen cleanup",
  uiStatus: "failed",
  state: "failed",
  paymentStatus: "paid",
  provider: "Apple Music",
  recipeCount: 1,
  playlistCount: 0,
  updatedAt: "2026-05-27T10:02:00.000Z",
  primaryRoute: "/app/sorts/sort_1/processing",
  nextActionLabel: "View issue / Retry"
};

describe("listDashboardActivity", () => {
  it("surfaces failed jobs without echoing raw error details", () => {
    const activities = listDashboardActivity({
      latestSync: failedSync,
      recentSorts: [failedSort]
    });
    const serialized = JSON.stringify(activities);

    expect(activities).toEqual([
      expect.objectContaining({
        id: "sort-sort_1",
        detail: "Failed Sort. View issue / Retry."
      }),
      expect.objectContaining({
        id: "library-sync_1",
        label: "Library sync needs attention",
        detail: "Failed at library sync. Retry from Library."
      })
    ]);
    expect(serialized).not.toContain("raw-music-user-token");
    expect(serialized).not.toContain("First Song");
  });
});
